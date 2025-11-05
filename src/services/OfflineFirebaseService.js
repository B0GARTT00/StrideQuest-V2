import FirebaseService from './FirebaseService';
import OfflineStorageService from './OfflineStorageService';
import SyncService from './SyncService';

/**
 * Offline-Aware Firebase Service
 * Wraps FirebaseService to handle offline scenarios automatically
 */

// ========== USER OPERATIONS ==========

/**
 * Get user profile (with offline fallback)
 */
export const getUser = async (userId) => {
  const isOnline = SyncService.getIsOnline();
  
  if (isOnline) {
    try {
      const result = await FirebaseService.getUser(userId);
      if (result.success) {
        // Cache the user data
        await OfflineStorageService.cacheUser(userId, result.data);
      }
      return result;
    } catch (error) {
      console.error('Error fetching user online, falling back to cache:', error);
      // Fall through to offline
    }
  }
  
  // Offline mode: return cached data
  const cached = await OfflineStorageService.getCachedUser();
  if (cached && cached.userId === userId) {
    return { success: true, data: cached, fromCache: true };
  }
  
  return { success: false, error: 'User not found in cache', offline: true };
};

/**
 * Save user profile (with offline queueing)
 */
export const saveUser = async (userId, userData) => {
  const isOnline = SyncService.getIsOnline();
  
  // Always update cache first for instant UI feedback
  await OfflineStorageService.cacheUser(userId, userData);
  
  if (isOnline) {
    try {
      const result = await FirebaseService.saveUser(userId, userData);
      return result;
    } catch (error) {
      console.error('Error saving user online:', error);
      return { 
        success: true, 
        offline: true, 
        message: 'Saved locally, will sync when online' 
      };
    }
  }
  
  return { 
    success: true, 
    offline: true, 
    message: 'Saved locally, will sync when online' 
  };
};

// ========== ACTIVITY OPERATIONS ==========

/**
 * Save activity (with offline queueing)
 */
export const saveActivity = async (userId, activityData) => {
  const isOnline = SyncService.getIsOnline();
  
  if (isOnline) {
    try {
      // Try to save online first
      const result = await FirebaseService.saveActivity(userId, activityData);
      
      if (result.success) {
        // Also add to cache for instant display
        await OfflineStorageService.addCachedActivity({
          id: result.id,
          userId,
          ...activityData,
          xpEarned: result.xpGained,
          createdAt: { seconds: Date.now() / 1000 }
        });
        
        return result;
      }
    } catch (error) {
      console.error('Error saving activity online, queuing for offline:', error);
      // Fall through to offline mode
    }
  }
  
  // Offline mode: queue the activity
  const queueResult = await OfflineStorageService.queueActivity(userId, activityData);
  
  if (queueResult.success) {
    // Update local XP optimistically
    const xpEarned = activityData.xpEarned || calculateActivityXP(activityData);
    await OfflineStorageService.updateCachedUserXP(xpEarned);
    
    return {
      success: true,
      id: queueResult.id,
      xpGained: xpEarned,
      offline: true,
      message: 'Activity saved locally, will sync when online'
    };
  }
  
  return { success: false, error: 'Failed to queue activity' };
};

/**
 * Get user activities (with offline cache)
 */
export const getUserActivities = async (userId, limitCount = 20) => {
  const isOnline = SyncService.getIsOnline();
  
  if (isOnline) {
    try {
      const result = await FirebaseService.getUserActivities(userId, limitCount);
      if (result.success) {
        // Cache the activities
        await OfflineStorageService.cacheActivities(userId, result.data);
      }
      return result;
    } catch (error) {
      console.error('Error fetching activities online, falling back to cache:', error);
      // Fall through to offline
    }
  }
  
  // Offline mode: return cached data (including pending activities)
  const cached = await OfflineStorageService.getCachedActivities();
  if (cached) {
    return { 
      success: true, 
      data: cached.activities.slice(0, limitCount), 
      fromCache: true 
    };
  }
  
  return { success: false, error: 'No cached activities', offline: true };
};

/**
 * Subscribe to user activities (online only)
 */
export const subscribeToUserActivities = (userId, limitCount, callback) => {
  const isOnline = SyncService.getIsOnline();
  
  if (!isOnline) {
    // Return cached data immediately in offline mode
    getUserActivities(userId, limitCount).then(result => {
      if (result.success) {
        callback(result.data);
      }
    });
    
    // Return empty unsubscribe function
    return () => {};
  }
  
  // Online: use real-time subscription
  return FirebaseService.subscribeToUserActivities(userId, limitCount, callback);
};

// ========== LEADERBOARD OPERATIONS ==========

/**
 * Get top users (online only)
 */
export const getTopUsers = async (count = 100) => {
  const isOnline = SyncService.getIsOnline();
  
  if (!isOnline) {
    return { 
      success: false, 
      error: 'Leaderboard requires internet connection', 
      offline: true 
    };
  }
  
  return await FirebaseService.getTopUsers(count);
};

/**
 * Subscribe to leaderboard (online only)
 */
export const subscribeToLeaderboard = (callback) => {
  const isOnline = SyncService.getIsOnline();
  
  if (!isOnline) {
    callback([]);
    return () => {};
  }
  
  return FirebaseService.subscribeToLeaderboard(callback);
};

// ========== QUEST OPERATIONS ==========

/**
 * Get quests (online only for now)
 */
export const getQuests = async () => {
  const isOnline = SyncService.getIsOnline();
  
  if (!isOnline) {
    return { 
      success: false, 
      error: 'Quests require internet connection', 
      offline: true 
    };
  }
  
  return await FirebaseService.getQuests();
};

/**
 * Get user quest progress (online only for now)
 */
export const getUserQuestProgress = async (userId) => {
  const isOnline = SyncService.getIsOnline();
  
  if (!isOnline) {
    return { 
      success: false, 
      error: 'Quest progress requires internet connection', 
      offline: true 
    };
  }
  
  return await FirebaseService.getUserQuestProgress(userId);
};

// ========== HELPER FUNCTIONS ==========

/**
 * Calculate XP based on activity (local calculation)
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

// Re-export other Firebase methods that don't need offline support
export const {
  addUserXP,
  calculateLevel,
  calculateXPForNextLevel,
  calculateTotalXPForLevel,
  updateLeaderboard,
  saveQuest,
  updateQuestProgress,
  claimQuestReward,
  seedQuests,
  fixUserLevels,
  initializeUserStats,
  allocateStatPoints,
  awardStatPoints,
  isMonarchTitleClaimed,
  getClaimedMonarchTitles,
  equipMonarchTitle,
  uploadProfilePicture,
  deleteAccount
} = FirebaseService;

export default {
  getUser,
  saveUser,
  saveActivity,
  getUserActivities,
  subscribeToUserActivities,
  getTopUsers,
  subscribeToLeaderboard,
  getQuests,
  getUserQuestProgress,
  addUserXP,
  calculateLevel,
  calculateXPForNextLevel,
  calculateTotalXPForLevel,
  updateLeaderboard,
  saveQuest,
  updateQuestProgress,
  claimQuestReward,
  seedQuests,
  fixUserLevels,
  initializeUserStats,
  allocateStatPoints,
  awardStatPoints,
  isMonarchTitleClaimed,
  getClaimedMonarchTitles,
  equipMonarchTitle,
  uploadProfilePicture,
  deleteAccount
};
