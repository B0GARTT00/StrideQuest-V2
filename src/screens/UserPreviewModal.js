import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme/ThemeProvider';
import { AppContext } from '../context/AppState';
import FirebaseService from '../services/FirebaseService';
import FriendService from '../services/FriendService';
import { getTier } from '../utils/ranks';

export default function UserPreviewModal({ navigation, route }) {
  const { currentUser } = useContext(AppContext);
  const userId = route?.params?.userId;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!userId) return;
        const res = await FirebaseService.getUser(userId);
        if (mounted && res.success) setUser(res.data);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    const checkFriend = async () => {
      try {
        if (!currentUser?.uid || !userId || currentUser.uid === userId) return;
        const res = await FriendService.getFriends(currentUser.uid);
        if (res.success && Array.isArray(res.data)) {
          setIsFriend(res.data.includes(userId));
        }
      } catch {}
    };
    checkFriend();
  }, [currentUser?.uid, userId]);

  const tier = useMemo(() => getTier(user?.xp || 0, user?.hasMonarchTitle), [user?.xp, user?.hasMonarchTitle]);

  const handleAddFriend = async () => {
    if (!currentUser?.uid || !user?.id || currentUser.uid === user.id) return;
    setRequestSent(true);
    const res = await FriendService.sendFriendRequest(currentUser.uid, user.id);
    if (res.success) {
      Alert.alert('Friend Request Sent', 'Your friend request has been sent!');
    } else {
      Alert.alert('Error', res.message || 'Failed to send friend request.');
      setRequestSent(false);
    }
  };

  const close = () => navigation.goBack();

  const viewFullProfile = () => {
    // Replace this preview with a full modal profile, keeping context
    navigation.replace('UserProfile', { userId: userId });
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={close} />
      <SafeAreaView style={styles.sheet}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Athlete</Text>
          <TouchableOpacity onPress={close} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : user ? (
          <>
            <View style={styles.userRow}>
              <View style={styles.avatarWrapper}>
                {user.profilePicture ? (
                  <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{(user.name || '?').charAt(0)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.meta}>Level {user.level} · {tier.key}{['E','D','C','B','A','S'].includes(tier.key) ? ' Rank' : ''}</Text>
                <Text style={styles.metaMuted}>{(user.xp || 0).toLocaleString()} XP</Text>
              </View>
            </View>

            {/* Actions */}
            {currentUser?.uid === user.id ? (
              <Text style={styles.selfNote}>This is you</Text>
            ) : isFriend ? (
              <View style={[styles.primaryButton, { backgroundColor: 'transparent', borderColor: theme.colors.muted, borderWidth: 1 }]}>
                <Text style={[styles.primaryButtonText, { color: theme.colors.muted }]}>Already friends</Text>
              </View>
            ) : requestSent ? (
              <View style={[styles.primaryButton, { backgroundColor: theme.colors.muted }]}>
                <Text style={styles.primaryButtonText}>Request sent</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryButton} onPress={handleAddFriend}>
                <Text style={styles.primaryButtonText}>Add Friend</Text>
              </TouchableOpacity>
            )}

            {/* Message button - open private chat */}
            {currentUser?.uid !== user.id && (
              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 8 }]}
                onPress={() => navigation.replace('DirectChat', { userId: user.id, userName: user.name })}
              >
                <Text style={[styles.secondaryButtonText]}>Message Privately →</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.secondaryButton} onPress={viewFullProfile}>
              <Text style={styles.secondaryButtonText}>View full profile →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.loading}>User not found</Text>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  sheet: {
    backgroundColor: '#0f0d12',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  headerTitle: {
    color: theme.colors.text,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.4
  },
  closeIcon: {
    color: theme.colors.muted,
    fontSize: 20,
    fontWeight: '900'
  },
  loading: {
    color: theme.colors.muted,
    paddingVertical: 20
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  avatarWrapper: {
    marginRight: 14
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  avatarInitial: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900'
  },
  userInfo: {
    flex: 1
  },
  name: {
    color: theme.colors.text,
    fontWeight: '900',
    fontSize: 18
  },
  meta: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginTop: 2
  },
  metaMuted: {
    color: theme.colors.muted,
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2
  },
  selfNote: {
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 14
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 14
  }
});
