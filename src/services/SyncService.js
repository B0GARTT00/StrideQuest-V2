import NetInfo from '@react-native-community/netinfo';
import FirebaseService from './FirebaseService';
import OfflineStorageService from './OfflineStorageService';

/**
 * Sync Service
 * Manages synchronization between offline storage and Firebase
 */

let isOnline = true;
let isSyncing = false;
let syncListeners = [];

// ========== NETWORK MONITORING ==========

/**
 * Initialize network monitoring
 */
export const initNetworkMonitoring = () => {
  return NetInfo.addEventListener(state => {
    const wasOffline = !isOnline;
    isOnline = state.isConnected && state.isInternetReachable;
    
    console.log('Network status changed:', isOnline ? 'ONLINE' : 'OFFLINE');
    
    // Notify listeners
    notifyListeners({ isOnline });
    
    // Auto-sync when coming back online
    if (wasOffline && isOnline) {
      console.log('Connection restored, starting auto-sync...');
      syncPendingData();
    }
  });
};

/**
 * Get current online status
 */
export const checkOnlineStatus = async () => {
  try {
    const state = await NetInfo.fetch();
    isOnline = state.isConnected && state.isInternetReachable;
    return isOnline;
  } catch (error) {
    console.error('Error checking network status:', error);
    return false;
  }
};

/**
 * Subscribe to network and sync status changes
 */
export const addSyncListener = (callback) => {
  syncListeners.push(callback);
  
  // Return unsubscribe function
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
};

/**
 * Notify all listeners of status changes
 */
const notifyListeners = (status) => {
  syncListeners.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.error('Error in sync listener:', error);
    }
  });
};

// ========== SYNC OPERATIONS ==========

/**
 * Sync all pending data to Firebase
 */
export const syncPendingData = async () => {
  if (!isOnline) {
    console.log('Cannot sync: offline');
    return { success: false, error: 'Offline' };
  }
  
  if (isSyncing) {
    console.log('Sync already in progress');
    return { success: false, error: 'Sync in progress' };
  }
  
  isSyncing = true;
  notifyListeners({ isOnline, isSyncing: true });
  
  try {
    console.log('Starting sync...');
    
    // Sync activities
    const activitiesResult = await syncActivities();
    
    // Update last sync timestamp
    await OfflineStorageService.updateLastSync();
    
    console.log('Sync completed successfully');
    
    isSyncing = false;
    notifyListeners({ 
      isOnline, 
      isSyncing: false, 
      lastSync: Date.now(),
      syncedCount: activitiesResult.syncedCount || 0
    });
    
    return { 
      success: true, 
      activitiesSynced: activitiesResult.syncedCount || 0 
    };
  } catch (error) {
    console.error('Error during sync:', error);
    isSyncing = false;
    notifyListeners({ isOnline, isSyncing: false, error });
    return { success: false, error };
  }
};

/**
 * Sync pending activities to Firebase
 */
const syncActivities = async () => {
  try {
    const pending = await OfflineStorageService.getPendingActivities();
    
    if (pending.length === 0) {
      console.log('No pending activities to sync');
      return { success: true, syncedCount: 0 };
    }
    
    console.log(`Syncing ${pending.length} pending activities...`);
    
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const activity of pending) {
      try {
        // Remove offline-specific fields before syncing
        const { id, queuedAt, synced, ...activityData } = activity;
        
        // Save to Firebase
        const result = await FirebaseService.saveActivity(activity.userId, activityData);
        
        if (result.success) {
          // Mark as synced and remove from queue
          await OfflineStorageService.markActivitySynced(id);
          syncedCount++;
          console.log(`Synced activity ${id}`);
        } else {
          failedCount++;
          console.error(`Failed to sync activity ${id}:`, result.error);
        }
      } catch (error) {
        failedCount++;
        console.error(`Error syncing activity ${activity.id}:`, error);
      }
    }
    
    console.log(`Sync complete: ${syncedCount} succeeded, ${failedCount} failed`);
    
    return { 
      success: true, 
      syncedCount, 
      failedCount 
    };
  } catch (error) {
    console.error('Error in syncActivities:', error);
    return { success: false, error };
  }
};

/**
 * Force a manual sync
 */
export const forceSyncNow = async () => {
  const online = await checkOnlineStatus();
  if (!online) {
    return { success: false, error: 'Device is offline' };
  }
  
  return await syncPendingData();
};

// ========== HELPER FUNCTIONS ==========

/**
 * Get sync status information
 */
export const getSyncStatus = async () => {
  try {
    const pendingCount = await OfflineStorageService.getPendingCount();
    const lastSync = await OfflineStorageService.getLastSync();
    const online = await checkOnlineStatus();
    
    return {
      isOnline: online,
      isSyncing,
      pendingCount,
      lastSync,
      needsSync: pendingCount > 0
    };
  } catch (error) {
    console.error('Error getting sync status:', error);
    return {
      isOnline: false,
      isSyncing: false,
      pendingCount: 0,
      lastSync: null,
      needsSync: false
    };
  }
};

/**
 * Check if device is online
 */
export const getIsOnline = () => isOnline;

/**
 * Check if sync is in progress
 */
export const getIsSyncing = () => isSyncing;

export default {
  initNetworkMonitoring,
  checkOnlineStatus,
  addSyncListener,
  syncPendingData,
  forceSyncNow,
  getSyncStatus,
  getIsOnline,
  getIsSyncing
};
