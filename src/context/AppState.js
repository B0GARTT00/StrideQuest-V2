import React, { createContext, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import FirebaseService from '../services/OfflineFirebaseService';
import SyncService from '../services/SyncService';

export const AppContext = createContext(null);

const STORAGE_KEY = '@stride_quest_state_v2';

// Demo users for initial leaderboard population
const defaultState = {
  users: [
    // Monarchs (9 users with title and level 50+)
    { id: 'u1', name: 'LeaderMax', xp: 150000, level: 58, hasMonarchTitle: true },
    { id: 'u2', name: 'ProRunner', xp: 140000, level: 56, hasMonarchTitle: true },
    { id: 'u3', name: 'Speedy', xp: 135000, level: 55, hasMonarchTitle: true },
    { id: 'u4', name: 'Champion', xp: 130000, level: 54, hasMonarchTitle: true },
    { id: 'u5', name: 'Ace', xp: 125000, level: 53, hasMonarchTitle: true },
    { id: 'u6', name: 'Blaze', xp: 120000, level: 52, hasMonarchTitle: true },
    { id: 'u7', name: 'Flash', xp: 115000, level: 51, hasMonarchTitle: true },
    { id: 'u8', name: 'Ranger', xp: 110000, level: 50, hasMonarchTitle: true },
    { id: 'u9', name: 'Runner99', xp: 105000, level: 50, hasMonarchTitle: true },
    // National Rankers
    { id: 'u10', name: 'Trail', xp: 85000, level: 48, hasMonarchTitle: false },
    { id: 'u11', name: 'Elite', xp: 78000, level: 46, hasMonarchTitle: false },
    { id: 'u12', name: 'Walker', xp: 72000, level: 44, hasMonarchTitle: false },
    // S Rank
    { id: 'u13', name: 'Jogger', xp: 42000, level: 38, hasMonarchTitle: false },
    { id: 'u14', name: 'Sprinter', xp: 36000, level: 35, hasMonarchTitle: false },
    { id: 'u15', name: 'Hiker', xp: 32000, level: 33, hasMonarchTitle: false },
    // A Rank
    { id: 'u16', name: 'Explorer', xp: 22000, level: 28, hasMonarchTitle: false },
    { id: 'u17', name: 'Stroller', xp: 18000, level: 25, hasMonarchTitle: false },
    { id: 'u18', name: 'Newbie', xp: 16000, level: 23, hasMonarchTitle: false },
    // B Rank
    { id: 'u19', name: 'Novice', xp: 9800, level: 18, hasMonarchTitle: false },
    { id: 'u20', name: 'Fresh', xp: 8200, level: 16, hasMonarchTitle: false },
    // C Rank
    { id: 'u21', name: 'Ghost', xp: 5200, level: 12, hasMonarchTitle: false },
    { id: 'u22', name: 'Shadow', xp: 4100, level: 10, hasMonarchTitle: false },
    // D Rank
    { id: 'u23', name: 'Pebble', xp: 1800, level: 6, hasMonarchTitle: false },
    { id: 'u24', name: 'You', xp: 1200, level: 5, hasMonarchTitle: false },
    // E Rank
    { id: 'u25', name: 'Tiny', xp: 120, level: 2, hasMonarchTitle: false }
  ],
  quests: [
    { id: 'q1', title: 'Clear 3 Activities', progress: 1, target: 3, xp: 50 },
    { id: 'q2', title: 'Run 10 km', progress: 6, target: 10, xp: 120 },
  ]
};

export const AppStateProvider = ({ children }) => {
  const [state, setState] = useState(defaultState);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize network monitoring
  useEffect(() => {
    const unsubscribe = SyncService.initNetworkMonitoring();
    return () => unsubscribe();
  }, []);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user is banned
        const userDoc = await FirebaseService.getUser(user.uid);
        if (userDoc?.isBanned) {
          // Check if ban has expired
          if (userDoc.banExpiresAt) {
            const expirationDate = userDoc.banExpiresAt.toDate ? userDoc.banExpiresAt.toDate() : new Date(userDoc.banExpiresAt);
            const now = new Date();
            
            if (now >= expirationDate) {
              // Ban has expired - unban the user
              await FirebaseService.updateUser(user.uid, {
                isBanned: false,
                banExpired: true,
                banExpiredAt: new Date()
              });
              // Allow them to continue
              setCurrentUser(user);
              await loadUserData(user.uid);
              setLoading(false);
              return;
            }
          }
          
          // User is still banned - sign them out
          await signOut(auth);
          const banMessage = userDoc.banExpiresAt 
            ? `Your account is temporarily banned until ${new Date(userDoc.banExpiresAt.seconds * 1000).toLocaleString()}. Reason: ${userDoc.banReason || 'Violation of terms'}`
            : `Your account has been permanently banned. Reason: ${userDoc.banReason || 'Violation of terms'}`;
          alert(banMessage);
          setCurrentUser(null);
          setState(defaultState);
          setLoading(false);
          return;
        }
        
        setCurrentUser(user);
        await loadUserData(user.uid);
      } else {
        setCurrentUser(null);
        // No guest/demo fallback — require authentication to load user data
        // Reset to default state until a user logs in
        setState(defaultState);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load user data from Firebase (with offline support)
  const loadUserData = async (userId) => {
    try {
      // Check if online
      const isOnline = await SyncService.checkOnlineStatus();
      
      // Try to load user data (will use cache if offline)
      const userResult = await FirebaseService.getUser(userId);
      
      if (userResult.success && userResult.data) {
        const userData = userResult.data;
        
        // If online, try to load additional data
        let quests = [];
        let topUsers = [];
        
        if (isOnline) {
          // Fix user levels if needed (migration) - only when online
          try {
            await FirebaseService.fixUserLevels();
          } catch (e) {
            console.log('Could not fix user levels (offline?):', e);
          }
          
          // Check if quests exist, if not seed them - only when online
          const questsResult = await FirebaseService.getQuests();
          quests = questsResult.success ? questsResult.data : [];
          
          if (!quests || quests.length === 0) {
            console.log('Seeding initial quests to Firebase...');
            await FirebaseService.seedQuests();
            const newQuestsResult = await FirebaseService.getQuests();
            quests = newQuestsResult.success ? newQuestsResult.data : [];
          } else if (quests.length < 10) {
            console.log('Updating quests to include new ones...');
            await FirebaseService.seedQuests();
            const newQuestsResult = await FirebaseService.getQuests();
            quests = newQuestsResult.success ? newQuestsResult.data : [];
          }
          
          // Load leaderboard - only when online
          const topUsersResult = await FirebaseService.getTopUsers(1000);
          topUsers = topUsersResult.success ? topUsersResult.data : [];
        } else {
          // Offline: use default/cached data
          console.log('Loading in offline mode - using cached data');
          quests = defaultState.quests;
          topUsers = defaultState.users;
        }
        
        console.log('Loaded user data:', userData);
        console.log('User level:', userData.level, 'XP:', userData.xp, 'equippedTitle:', userData.equippedTitle);
        
        // Make sure current user is in the users array
        const userInList = topUsers.find(u => u.id === userId);
        let usersList = topUsers;
        if (!userInList) {
          usersList = [{ id: userId, ...userData }, ...topUsers];
        } else {
          usersList = topUsers.map(u => u.id === userId ? { id: userId, ...userData } : u);
        }
        
        setState({
          users: Array.isArray(usersList) && usersList.length > 0 ? usersList : defaultState.users,
          quests: Array.isArray(quests) && quests.length > 0 ? quests : defaultState.quests
        });
      } else if (userResult.offline || !isOnline) {
        // Offline and no cached user - use default state but allow app to continue
        console.log('Offline mode - no cached user data, using defaults');
        setState({
          ...defaultState,
          users: [{ id: userId, name: 'You', xp: 0, level: 1, hasMonarchTitle: false }, ...defaultState.users]
        });
      } else {
        // User doesn't exist in Firebase, seed initial data (only if online)
        console.log('New user detected, creating profile...');
        await seedUserData(userId);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // On error, still allow app to load with default state
      setState({
        ...defaultState,
        users: [{ id: userId, name: 'You', xp: 0, level: 1, hasMonarchTitle: false }, ...defaultState.users]
      });
    } finally {
      setLoading(false);
    }
  };

  // Load demo data for unauthenticated users
  const loadDemoData = async () => {
    try {
      // Check if we need to seed the database
      const topUsersResult = await FirebaseService.getTopUsers(1);
      const topUsers = topUsersResult.success ? topUsersResult.data : [];
      
      if (!topUsers || topUsers.length === 0) {
        // Database is empty, seed demo users
        console.log('Seeding demo users to Firebase...');
        for (const user of defaultState.users) {
          await FirebaseService.saveUser(user.id, {
            name: user.name,
            xp: user.xp,
            level: user.level,
            hasMonarchTitle: user.hasMonarchTitle,
            equippedTitle: 'newbie'
          });
          await FirebaseService.updateLeaderboard(user.id, user.name, user.xp, user.level);
        }
        console.log('Demo users seeded successfully');
      }
      
      // Check if quests exist, if not seed them
      const questsResult = await FirebaseService.getQuests();
      const quests = questsResult.success ? questsResult.data : [];
      
      // Fix user levels if needed
      await FirebaseService.fixUserLevels();
      
      if (!quests || quests.length === 0) {
        console.log('Seeding initial quests to Firebase...');
        await FirebaseService.seedQuests();
      }

      // Load all users for leaderboard
      const allUsersResult = await FirebaseService.getTopUsers(1000); // Load up to 1000 users
      const allUsers = allUsersResult.success ? allUsersResult.data : [];
      
      setState({
        users: Array.isArray(allUsers) && allUsers.length > 0 ? allUsers : defaultState.users,
        quests: defaultState.quests
      });
    } catch (error) {
      console.error('Error loading demo data:', error);
      // Fallback to local state
      setState(defaultState);
    } finally {
      setLoading(false);
    }
  };

  // Seed initial user data to Firebase
  const seedUserData = async (userId) => {
    try {
      // Create new user with starting stats
      await FirebaseService.saveUser(userId, {
        name: 'New Hunter',
        xp: 0,
        level: 1,
        hasMonarchTitle: false,
        equippedTitle: 'newbie'
      });
      await FirebaseService.updateLeaderboard(userId, 'New Hunter', 0, 1);
      await loadUserData(userId);
    } catch (error) {
      console.error('Error seeding user data:', error);
    }
  };

  // Add XP to user (Firebase-enabled)
  const addXP = async (userId, amount) => {
    try {
      const updatedUser = await FirebaseService.addUserXP(userId, amount);
      if (updatedUser) {
        // Update local state
        setState(s => ({
          ...s,
          users: s.users.map(u => 
            u.id === userId 
              ? { ...u, xp: updatedUser.xp, level: updatedUser.level } 
              : u
          )
        }));
      }
    } catch (error) {
      console.error('Error adding XP:', error);
      // Fallback to local state update
      setState(s => ({
        ...s,
        users: s.users.map(u => (u.id === userId ? { ...u, xp: u.xp + amount } : u))
      }));
    }
  };

  // Complete quest progress (Firebase-enabled)
  const completeQuestProgress = async (questId, increment = 1) => {
    try {
      if (currentUser) {
        await FirebaseService.updateQuestProgress(currentUser.uid, questId, increment);
      }
      
      // Update local state
      setState(s => ({
        ...s,
        quests: s.quests.map(q => 
          q.id === questId 
            ? { ...q, progress: Math.min(q.target, q.progress + increment) } 
            : q
        )
      }));
    } catch (error) {
      console.error('Error updating quest progress:', error);
      // Fallback to local state update
      setState(s => ({
        ...s,
        quests: s.quests.map(q => 
          q.id === questId 
            ? { ...q, progress: Math.min(q.target, q.progress + increment) } 
            : q
        )
      }));
    }
  };

  // Reset to demo state (for testing)
  const resetState = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setState(defaultState);
      setLoading(false);
    } catch (error) {
      console.error('Error resetting state:', error);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      // Auth state listener will handle the rest
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get current user's profile data
  const getCurrentUserProfile = useMemo(() => {
    if (!currentUser || !state.users) return null;
    return state.users.find(u => u.id === currentUser.uid) || null;
  }, [currentUser, state.users]);

  // Get current user ID (authenticated or demo)
  const getCurrentUserId = useMemo(() => {
    // Only return authenticated user ID. No demo/guest fallback.
    return currentUser ? currentUser.uid : null;
  }, [currentUser, state.users]);

  return (
    <AppContext.Provider 
      value={{ 
        state, 
        setState, 
        addXP, 
        completeQuestProgress, 
        resetState,
        currentUser,
        loading,
        logout,
        getCurrentUserProfile,
        getCurrentUserId,
        loadUserData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppStateProvider;
