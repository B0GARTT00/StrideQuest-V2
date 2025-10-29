import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, set, get, onValue, update } from 'firebase/database';
import { db, realtimeDb } from '../config/firebase';

/**
 * Firebase Service for Stride Quest
 * Handles all database operations
 */

// ========== HELPER FUNCTIONS ==========

/**
 * Calculate level from XP with a balanced progression curve
 * Level 1-10: ~100 XP per level (total ~1,000 XP)
 * Level 10-30: ~200-400 XP per level (total ~7,000 XP)
 * Level 30-60: ~500-800 XP per level (total ~30,000 XP)
 * Level 60-100: ~1000-2000 XP per level (total ~120,000 XP to reach max)
 */
export const calculateLevel = (xp) => {
  if (xp < 0) return 1;
  
  let level = 1;
  let xpNeeded = 0;
  
  while (level < 100) {
    // Progressive XP requirement formula
    // Early levels: 100 XP
    // Mid levels: scales up gradually
    // High levels: 1500-2000 XP per level
    let xpForNextLevel;
    if (level <= 10) {
      xpForNextLevel = 100; // Level 1-10: 100 XP each
    } else if (level <= 30) {
      xpForNextLevel = 100 + (level - 10) * 15; // Level 11-30: 115 to 400 XP
    } else if (level <= 60) {
      xpForNextLevel = 400 + (level - 30) * 20; // Level 31-60: 420 to 1000 XP
    } else {
      xpForNextLevel = 1000 + (level - 60) * 25; // Level 61-100: 1025 to 2000 XP
    }
    
    if (xp >= xpNeeded + xpForNextLevel) {
      xpNeeded += xpForNextLevel;
      level++;
    } else {
      break;
    }
  }
  
  return Math.min(level, 100); // Cap at level 100
};

/**
 * Calculate XP needed for next level
 */
export const calculateXPForNextLevel = (level) => {
  if (level >= 100) return 0; // Max level
  
  if (level <= 10) {
    return 100;
  } else if (level <= 30) {
    return 100 + (level - 10) * 15;
  } else if (level <= 60) {
    return 400 + (level - 30) * 20;
  } else {
    return 1000 + (level - 60) * 25;
  }
};

/**
 * Calculate total XP needed to reach a specific level
 */
export const calculateTotalXPForLevel = (targetLevel) => {
  let totalXP = 0;
  for (let level = 1; level < targetLevel && level < 100; level++) {
    totalXP += calculateXPForNextLevel(level);
  }
  return totalXP;
};

// ========== USER OPERATIONS ==========

/**
 * Create or update user profile
 */
export const saveUser = async (userId, userData) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // Also update leaderboard in Realtime DB only if XP is provided
    if (userData.xp !== undefined && userData.level !== undefined) {
      await updateLeaderboard(userId, userData.xp, userData.level);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving user:', error);
    return { success: false, error };
  }
};

/**
 * Get user profile
 */
export const getUser = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { success: true, data: { id: userSnap.id, ...userSnap.data() } };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user:', error);
    return { success: false, error };
  }
};

/**
 * Update user XP and level
 */
export const addUserXP = async (userId, xpAmount) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const currentXP = userSnap.data().xp || 0;
      const currentLevel = userSnap.data().level || 1;
      const currentStats = userSnap.data().stats || {
        strength: 10,
        agility: 10,
        sense: 10,
        vitality: 10,
        intelligence: 10
      };
      const currentStatPoints = userSnap.data().statPoints || 0;
      
      const newXP = currentXP + xpAmount;
      const newLevel = calculateLevel(newXP);
      
      // Check if leveled up
      const leveledUp = newLevel > currentLevel;
      const levelsGained = newLevel - currentLevel;
      
      // Award stat points on level up
      // 1 point per stat on level up (5 stats = 5 points)
      // Plus 3 free points to allocate
      let newStats = { ...currentStats };
      let newStatPoints = currentStatPoints;
      
      if (leveledUp) {
        // Auto-increase each stat by 1 per level
        newStats = {
          strength: currentStats.strength + levelsGained,
          agility: currentStats.agility + levelsGained,
          sense: currentStats.sense + levelsGained,
          vitality: currentStats.vitality + levelsGained,
          intelligence: currentStats.intelligence + levelsGained
        };
        
        // Award 3 free stat points per level to allocate
        newStatPoints = currentStatPoints + (levelsGained * 3);
      }
      
      await updateDoc(userRef, {
        xp: newXP,
        level: newLevel,
        stats: newStats,
        statPoints: newStatPoints,
        updatedAt: serverTimestamp()
      });
      
      // Update leaderboard
      await updateLeaderboard(userId, newXP, newLevel);
      
      return { 
        success: true, 
        newXP, 
        newLevel, 
        leveledUp, 
        oldLevel: currentLevel,
        statPointsGained: leveledUp ? levelsGained * 3 : 0
      };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error adding XP:', error);
    return { success: false, error };
  }
};

// ========== LEADERBOARD OPERATIONS (Real-time Database) ==========

/**
 * Update user's position in real-time leaderboard
 */
export const updateLeaderboard = async (userId, xp, level) => {
  try {
    const leaderboardRef = ref(realtimeDb, `leaderboard/${userId}`);
    await set(leaderboardRef, {
      xp,
      level,
      timestamp: Date.now()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return { success: false, error };
  }
};

/**
 * Get top N users from leaderboard
 */
export const getTopUsers = async (count = 100) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('xp', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: users };
  } catch (error) {
    console.error('Error getting top users:', error);
    return { success: false, error };
  }
};

/**
 * Subscribe to real-time leaderboard updates
 */
export const subscribeToLeaderboard = (callback) => {
  const leaderboardRef = ref(realtimeDb, 'leaderboard');
  
  return onValue(leaderboardRef, async (snapshot) => {
    const leaderboardData = snapshot.val();
    if (leaderboardData) {
      // Convert to array and sort by XP
      const leaderboard = Object.keys(leaderboardData).map(userId => ({
        userId,
        ...leaderboardData[userId]
      })).sort((a, b) => b.xp - a.xp);
      
      // Get full user details from Firestore
      const userIds = leaderboard.slice(0, 100).map(entry => entry.userId);
      const userPromises = userIds.map(id => getUser(id));
      const userResults = await Promise.all(userPromises);
      
      const enrichedLeaderboard = leaderboard.slice(0, 100).map((entry, index) => {
        const userResult = userResults[index];
        return {
          ...entry,
          ...(userResult.success ? userResult.data : {})
        };
      });
      
      callback(enrichedLeaderboard);
    }
  });
};

// ========== ACTIVITY OPERATIONS ==========

/**
 * Save a completed activity
 */
export const saveActivity = async (userId, activityData) => {
  try {
    const activityRef = doc(collection(db, 'activities'));
    const xpEarned = activityData.xpEarned || calculateActivityXP(activityData);
    
    const activity = {
      userId,
      type: activityData.type,
      distanceKm: activityData.distanceKm || 0,
      durationMinutes: activityData.durationMinutes || 0,
      xpEarned,
      route: activityData.route || null,
      createdAt: serverTimestamp()
    };
    
    await setDoc(activityRef, activity);
    
    // Award XP for the activity
    const xpResult = await addUserXP(userId, xpEarned);
    
    return { 
      success: true, 
      id: activityRef.id, 
      xpGained: xpEarned,
      newLevel: xpResult.newLevel,
      leveledUp: xpResult.leveledUp,
      oldLevel: xpResult.oldLevel
    };
  } catch (error) {
    console.error('Error saving activity:', error);
    return { success: false, error };
  }
};

/**
 * Get user's activities
 */
export const getUserActivities = async (userId, limitCount = 20) => {
  try {
    const activitiesRef = collection(db, 'activities');
    const q = query(
      activitiesRef, 
      orderBy('createdAt', 'desc'), 
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const activities = [];
    querySnapshot.forEach((doc) => {
      if (doc.data().userId === userId) {
        activities.push({ id: doc.id, ...doc.data() });
      }
    });
    
    return { success: true, data: activities };
  } catch (error) {
    console.error('Error getting activities:', error);
    return { success: false, error };
  }
};

/**
 * Calculate XP based on activity
 */
const calculateActivityXP = (activity) => {
  const baseXP = {
    'run': 60,
    'walk': 20,
    'cycle': 80,
    'bike': 80,
    'hike': 70,
    'yoga': 25,
    'hiit': 50,
    'treadmill': 45
  };
  
  const typeXP = baseXP[activity.type?.toLowerCase()] || 20;
  const distanceBonus = activity.distanceKm ? Math.floor(activity.distanceKm * 5) : 0;
  const durationBonus = activity.durationMinutes ? Math.floor(activity.durationMinutes * 1) : 0;
  
  return typeXP + distanceBonus + durationBonus;
};

// ========== QUEST OPERATIONS ==========

/**
 * Create or update a quest
 */
export const saveQuest = async (questData) => {
  try {
    const questRef = questData.id ? doc(db, 'quests', questData.id) : doc(collection(db, 'quests'));
    await setDoc(questRef, {
      title: questData.title,
      description: questData.description,
      type: questData.type, // 'daily', 'weekly', 'achievement'
      requirement: questData.requirement, // e.g., { type: 'distance', value: 10 }
      reward: questData.reward, // XP amount
      active: questData.active !== false,
      createdAt: serverTimestamp()
    }, { merge: true });
    
    return { success: true, id: questRef.id };
  } catch (error) {
    console.error('Error saving quest:', error);
    return { success: false, error };
  }
};

/**
 * Get all active quests
 */
export const getQuests = async () => {
  try {
    const questsRef = collection(db, 'quests');
    const querySnapshot = await getDocs(questsRef);
    
    const quests = [];
    querySnapshot.forEach((doc) => {
      quests.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: quests };
  } catch (error) {
    console.error('Error getting quests:', error);
    return { success: false, error };
  }
};

/**
 * Get user's quest progress
 */
export const getUserQuestProgress = async (userId) => {
  try {
    const progressRef = collection(db, 'userQuests');
    const querySnapshot = await getDocs(progressRef);
    
    const progress = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === userId) {
        progress.push({ id: doc.id, ...data });
      }
    });
    
    return { success: true, data: progress };
  } catch (error) {
    console.error('Error getting quest progress:', error);
    return { success: false, error };
  }
};

/**
 * Update quest progress
 */
export const updateQuestProgress = async (userId, questId, progressData) => {
  try {
    const progressRef = doc(db, 'userQuests', `${userId}_${questId}`);
    await setDoc(progressRef, {
      userId,
      questId,
      progress: progressData.progress || 0,
      completed: progressData.completed || false,
      completedAt: progressData.completed ? serverTimestamp() : null,
      claimed: progressData.claimed || false,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating quest progress:', error);
    return { success: false, error };
  }
};

/**
 * Claim quest reward
 */
export const claimQuestReward = async (userId, questId) => {
  try {
    const progressRef = doc(db, 'userQuests', `${userId}_${questId}`);
    const progressSnap = await getDoc(progressRef);
    
    if (!progressSnap.exists()) {
      return { success: false, error: 'Quest progress not found' };
    }
    
    const progress = progressSnap.data();
    if (!progress.completed) {
      return { success: false, error: 'Quest not completed' };
    }
    
    if (progress.claimed) {
      return { success: false, error: 'Reward already claimed' };
    }
    
    // Get quest to find reward amount
    const questSnap = await getDoc(doc(db, 'quests', questId));
    if (!questSnap.exists()) {
      return { success: false, error: 'Quest not found' };
    }
    
    const quest = questSnap.data();
    
    // Award XP
    await addUserXP(userId, quest.reward);
    
    // Mark as claimed
    await updateDoc(progressRef, {
      claimed: true,
      claimedAt: serverTimestamp()
    });
    
    return { success: true, reward: quest.reward };
  } catch (error) {
    console.error('Error claiming quest reward:', error);
    return { success: false, error };
  }
};

// ========== SEED DATA ==========

/**
 * Seed initial quests to database
 */
export const seedQuests = async () => {
  try {
    const initialQuests = [
      {
        title: 'First Steps',
        description: 'Complete your first activity',
        type: 'achievement',
        requirement: { type: 'activities', value: 1 },
        reward: 50,
        active: true
      },
      {
        title: 'Daily Runner',
        description: 'Complete 3 activities today',
        type: 'daily',
        requirement: { type: 'activities', value: 3 },
        reward: 100,
        active: true
      },
      {
        title: 'Distance Warrior',
        description: 'Run a total of 10km',
        type: 'achievement',
        requirement: { type: 'distance', value: 10 },
        reward: 150,
        active: true
      },
      {
        title: 'Consistency King',
        description: 'Complete activities 7 days in a row',
        type: 'weekly',
        requirement: { type: 'streak', value: 7 },
        reward: 200,
        active: true
      },
      {
        title: 'XP Hunter',
        description: 'Earn 500 total XP',
        type: 'achievement',
        requirement: { type: 'xp', value: 500 },
        reward: 100,
        active: true
      }
    ];

    for (const quest of initialQuests) {
      await saveQuest(quest);
    }

    console.log('Quests seeded successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error seeding quests:', error);
    return { success: false, error };
  }
};

/**
 * Fix users with level 0 to level 1
 */
export const fixUserLevels = async () => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const updates = [];
    querySnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      const currentLevel = userData.level || 0;
      const correctLevel = calculateLevel(userData.xp || 0);
      
      // Update if level is incorrect
      if (currentLevel !== correctLevel) {
        updates.push(
          updateDoc(doc(db, 'users', docSnap.id), {
            level: correctLevel
          })
        );
      }
    });

    await Promise.all(updates);
    console.log(`Fixed ${updates.length} user levels`);
    return { success: true, count: updates.length };
  } catch (error) {
    console.error('Error fixing user levels:', error);
    return { success: false, error };
  }
};

// ========== STAT MANAGEMENT ==========

/**
 * Initialize user stats
 */
export const initializeUserStats = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      stats: {
        strength: 10,
        agility: 10,
        sense: 10,
        vitality: 10,
        intelligence: 10
      },
      statPoints: 0,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error initializing stats:', error);
    return { success: false, error };
  }
};

/**
 * Allocate stat points
 */
export const allocateStatPoints = async (userId, statName, points) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userSnap.data();
    const currentStats = userData.stats || {
      strength: 10,
      agility: 10,
      sense: 10,
      vitality: 10,
      intelligence: 10
    };
    const currentStatPoints = userData.statPoints || 0;
    
    if (points > currentStatPoints) {
      return { success: false, error: 'Not enough stat points' };
    }
    
    const newStats = { ...currentStats };
    newStats[statName] = (newStats[statName] || 10) + points;
    
    await updateDoc(userRef, {
      stats: newStats,
      statPoints: currentStatPoints - points,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, newStats, remainingPoints: currentStatPoints - points };
  } catch (error) {
    console.error('Error allocating stat points:', error);
    return { success: false, error };
  }
};

/**
 * Award stat points (from leveling up, quests, titles)
 */
export const awardStatPoints = async (userId, points, reason = 'unknown') => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const userData = userSnap.data();
    const currentStatPoints = userData.statPoints || 0;
    
    await updateDoc(userRef, {
      statPoints: currentStatPoints + points,
      updatedAt: serverTimestamp()
    });
    
    console.log(`Awarded ${points} stat points to user ${userId} (${reason})`);
    return { success: true, newTotal: currentStatPoints + points };
  } catch (error) {
    console.error('Error awarding stat points:', error);
    return { success: false, error };
  }
};

// ========== MONARCH TITLE MANAGEMENT ==========

/**
 * Check if a Monarch title is already claimed
 */
export const isMonarchTitleClaimed = async (titleId) => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    let isClaimed = false;
    let claimedBy = null;
    
    querySnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      if (userData.equippedTitle === titleId) {
        isClaimed = true;
        claimedBy = {
          id: docSnap.id,
          name: userData.name,
          level: userData.level
        };
      }
    });
    
    return { success: true, isClaimed, claimedBy };
  } catch (error) {
    console.error('Error checking Monarch title:', error);
    return { success: false, error };
  }
};

/**
 * Get all claimed Monarch titles
 */
export const getClaimedMonarchTitles = async () => {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const monarchTitles = [
      'monarch_destruction',
      'monarch_shadows',
      'monarch_flames',
      'monarch_fangs',
      'monarch_frost',
      'monarch_iron',
      'monarch_beginning',
      'monarch_plagues',
      'monarch_transfiguration'
    ];
    
    const claimed = {};
    
    querySnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      if (monarchTitles.includes(userData.equippedTitle)) {
        claimed[userData.equippedTitle] = {
          userId: docSnap.id,
          userName: userData.name,
          level: userData.level
        };
      }
    });
    
    return { success: true, claimed };
  } catch (error) {
    console.error('Error getting claimed Monarch titles:', error);
    return { success: false, error };
  }
};

/**
 * Equip a Monarch title (with exclusivity check)
 */
export const equipMonarchTitle = async (userId, titleId) => {
  try {
    // Check if it's a Monarch title
    const monarchTitles = [
      'monarch_destruction',
      'monarch_shadows',
      'monarch_flames',
      'monarch_fangs',
      'monarch_frost',
      'monarch_iron',
      'monarch_beginning',
      'monarch_plagues',
      'monarch_transfiguration'
    ];
    
    if (monarchTitles.includes(titleId)) {
      // Check if already claimed by another user
      const checkResult = await isMonarchTitleClaimed(titleId);
      if (checkResult.isClaimed && checkResult.claimedBy.id !== userId) {
        return { 
          success: false, 
          error: `This title is already held by ${checkResult.claimedBy.name} (Level ${checkResult.claimedBy.level})` 
        };
      }
    }
    
    // Equip the title
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      equippedTitle: titleId,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error equipping Monarch title:', error);
    return { success: false, error };
  }
};

export default {
  saveUser,
  getUser,
  addUserXP,
  updateLeaderboard,
  getTopUsers,
  subscribeToLeaderboard,
  saveActivity,
  getUserActivities,
  saveQuest,
  getQuests,
  getUserQuestProgress,
  updateQuestProgress,
  claimQuestReward,
  seedQuests,
  fixUserLevels,
  calculateLevel,
  calculateXPForNextLevel,
  calculateTotalXPForLevel,
  initializeUserStats,
  allocateStatPoints,
  awardStatPoints,
  isMonarchTitleClaimed,
  getClaimedMonarchTitles,
  equipMonarchTitle
};
