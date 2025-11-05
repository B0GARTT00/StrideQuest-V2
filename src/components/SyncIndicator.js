import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SyncService from '../services/SyncService';
import { theme } from '../theme/ThemeProvider';

export default function SyncIndicator() {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    needsSync: false
  });

  useEffect(() => {
    // Initialize network monitoring
    const unsubscribe = SyncService.initNetworkMonitoring();

    // Add sync status listener
    const unsubscribeListener = SyncService.addSyncListener((status) => {
      updateStatus();
    });

    // Initial status check
    updateStatus();

    return () => {
      unsubscribe();
      unsubscribeListener();
    };
  }, []);

  const updateStatus = async () => {
    const status = await SyncService.getSyncStatus();
    setSyncStatus(status);
  };

  const handleSyncPress = async () => {
    if (!syncStatus.isOnline) {
      return; // Can't sync when offline
    }

    if (syncStatus.isSyncing) {
      return; // Already syncing
    }

    const result = await SyncService.forceSyncNow();
    if (result.success) {
      updateStatus();
    }
  };

  // Don't show indicator if online and nothing to sync
  if (syncStatus.isOnline && syncStatus.pendingCount === 0 && !syncStatus.isSyncing) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        !syncStatus.isOnline && styles.containerOffline,
        syncStatus.isSyncing && styles.containerSyncing
      ]}
      onPress={handleSyncPress}
      activeOpacity={syncStatus.isOnline ? 0.7 : 1}
      disabled={!syncStatus.isOnline || syncStatus.isSyncing}
    >
      <View style={styles.content}>
        {syncStatus.isSyncing ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.text}>Syncing...</Text>
          </>
        ) : !syncStatus.isOnline ? (
          <>
            <MaterialCommunityIcons name="cloud-off-outline" size={18} color="#fff" />
            <Text style={styles.text}>Offline Mode</Text>
            {syncStatus.pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{syncStatus.pendingCount}</Text>
              </View>
            )}
          </>
        ) : syncStatus.pendingCount > 0 ? (
          <>
            <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.text}>Tap to Sync ({syncStatus.pendingCount})</Text>
          </>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    marginHorizontal: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  containerOffline: {
    backgroundColor: '#6b6b6b',
    borderColor: '#888',
  },
  containerSyncing: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.accent,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
