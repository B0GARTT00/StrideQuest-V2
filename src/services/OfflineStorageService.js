import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline Storage Service
 * Manages local storage of data when offline
 */

const KEYS = {
  PENDING_ACTIVITIES: '@stride_quest_pending_activities',
  PENDING_XP: '@stride_quest_pending_xp',
  PENDING_QUESTS: '@stride_quest_pending_quests',
  CACHED_USER: '@stride_quest_cached_user',
  CACHED_ACTIVITIES: '@stride_quest_cached_activities',
  LAST_SYNC: '@stride_quest_last_sync',
};

// ========== PENDING OPERATIONS ==========

/**
 * Queue an activity to be synced when online
 */
export const queueActivity = async (userId, activityData) => {
  try {
    const pending = await getPendingActivities();
    const newActivity = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      ...activityData,
      queuedAt: Date.now(),
      synced: false
    };
    
    pending.push(newActivity);
    await AsyncStorage.setItem(KEYS.PENDING_ACTIVITIES, JSON.stringify(pending));
    
    console.log('Activity queued for offline sync:', newActivity.id);
    return { success: true, id: newActivity.id, activity: newActivity };
  } catch (error) {
    console.error('Error queuing activity:', error);
    return { success: false, error };
  }
};

/**
 * Get all pending activities waiting to sync
 */
export const getPendingActivities = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PENDING_ACTIVITIES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting pending activities:', error);
    return [];
  }
};

/**
 * Mark an activity as synced
 */
export const markActivitySynced = async (activityId) => {
  try {
    const pending = await getPendingActivities();
    const filtered = pending.filter(a => a.id !== activityId);
    await AsyncStorage.setItem(KEYS.PENDING_ACTIVITIES, JSON.stringify(filtered));
    
    console.log('Activity marked as synced:', activityId);
    return { success: true };
  } catch (error) {
    console.error('Error marking activity synced:', error);
    return { success: false, error };
  }
};

/**
 * Clear all pending activities (use with caution)
 */
export const clearPendingActivities = async () => {
  try {
    await AsyncStorage.setItem(KEYS.PENDING_ACTIVITIES, JSON.stringify([]));
    return { success: true };
  } catch (error) {
    console.error('Error clearing pending activities:', error);
    return { success: false, error };
  }
};

// ========== CACHED USER DATA ==========

/**
 * Cache user profile locally
 */
export const cacheUser = async (userId, userData) => {
  try {
    const cached = {
      userId,
      ...userData,
      cachedAt: Date.now()
    };
    
    await AsyncStorage.setItem(KEYS.CACHED_USER, JSON.stringify(cached));
    return { success: true };
  } catch (error) {
    console.error('Error caching user:', error);
    return { success: false, error };
  }
};

/**
 * Get cached user profile
 */
export const getCachedUser = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.CACHED_USER);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached user:', error);
    return null;
  }
};

/**
 * Update cached user XP locally (to show progress offline)
 */
export const updateCachedUserXP = async (xpToAdd) => {
  try {
    const cached = await getCachedUser();
    if (!cached) return { success: false, error: 'No cached user' };
    
    const newXP = (cached.xp || 0) + xpToAdd;
    cached.xp = newXP;
    cached.cachedAt = Date.now();
    
    await AsyncStorage.setItem(KEYS.CACHED_USER, JSON.stringify(cached));
    return { success: true, newXP };
  } catch (error) {
    console.error('Error updating cached user XP:', error);
    return { success: false, error };
  }
};

// ========== CACHED ACTIVITIES ==========

/**
 * Cache user activities locally
 */
export const cacheActivities = async (userId, activities) => {
  try {
    const cached = {
      userId,
      activities,
      cachedAt: Date.now()
    };
    
    await AsyncStorage.setItem(KEYS.CACHED_ACTIVITIES, JSON.stringify(cached));
    return { success: true };
  } catch (error) {
    console.error('Error caching activities:', error);
    return { success: false, error };
  }
};

/**
 * Get cached activities
 */
export const getCachedActivities = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.CACHED_ACTIVITIES);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    
    // Merge with pending activities
    const pending = await getPendingActivities();
    const merged = [...parsed.activities, ...pending];
    
    // Sort by date (newest first)
    merged.sort((a, b) => {
      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.queuedAt || 0;
      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.queuedAt || 0;
      return timeB - timeA;
    });
    
    return {
      ...parsed,
      activities: merged
    };
  } catch (error) {
    console.error('Error getting cached activities:', error);
    return null;
  }
};

/**
 * Add a new activity to cached list (optimistic update)
 */
export const addCachedActivity = async (activity) => {
  try {
    const cached = await getCachedActivities();
    if (!cached) {
      // Initialize cache
      await cacheActivities(activity.userId, [activity]);
      return { success: true };
    }
    
    // Add to existing cache (but skip pending ones as they're merged automatically)
    if (!activity.id.startsWith('offline_')) {
      cached.activities.unshift(activity);
      await AsyncStorage.setItem(KEYS.CACHED_ACTIVITIES, JSON.stringify({
        userId: cached.userId,
        activities: cached.activities,
        cachedAt: Date.now()
      }));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error adding cached activity:', error);
    return { success: false, error };
  }
};

// ========== SYNC STATUS ==========

/**
 * Update last sync timestamp
 */
export const updateLastSync = async () => {
  try {
    await AsyncStorage.setItem(KEYS.LAST_SYNC, Date.now().toString());
    return { success: true };
  } catch (error) {
    console.error('Error updating last sync:', error);
    return { success: false, error };
  }
};

/**
 * Get last sync timestamp
 */
export const getLastSync = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.LAST_SYNC);
    return data ? parseInt(data, 10) : null;
  } catch (error) {
    console.error('Error getting last sync:', error);
    return null;
  }
};

/**
 * Get count of pending items
 */
export const getPendingCount = async () => {
  try {
    const activities = await getPendingActivities();
    return activities.length;
  } catch (error) {
    console.error('Error getting pending count:', error);
    return 0;
  }
};

/**
 * Clear all cached data (use for logout or reset)
 */
export const clearAllCache = async () => {
  try {
    await AsyncStorage.multiRemove([
      KEYS.PENDING_ACTIVITIES,
      KEYS.CACHED_USER,
      KEYS.CACHED_ACTIVITIES,
      KEYS.LAST_SYNC
    ]);
    return { success: true };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return { success: false, error };
  }
};

export default {
  queueActivity,
  getPendingActivities,
  markActivitySynced,
  clearPendingActivities,
  cacheUser,
  getCachedUser,
  updateCachedUserXP,
  cacheActivities,
  getCachedActivities,
  addCachedActivity,
  updateLastSync,
  getLastSync,
  getPendingCount,
  clearAllCache
};
