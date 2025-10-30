import React, { useContext, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import Card from '../components/Card';
import BadgeIcon from '../components/BadgeIcon';
import { AppContext } from '../context/AppState';
import { getTier } from '../utils/ranks';
import FirebaseService from '../services/FirebaseService';
import FriendService from '../services/FriendService';

export default function ProfileScreen({ navigation, route }) {
  // App state and current user
  const { state, currentUser, logout, getCurrentUserProfile, getCurrentUserId, loadUserData } = useContext(AppContext);

  // Determine which profile to show (self vs from navigation)
  const userIdParam = route?.params?.userId;
  const userProfile = userIdParam
    ? (state.users && state.users.find(u => u.id === userIdParam))
    : (getCurrentUserProfile || (state.users && state.users[0]));

  // Determine if viewing own profile or another user's profile
  const viewingOwnProfile = currentUser && userProfile && (currentUser.uid === userProfile.id);

  // Friend UI state
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [friends, setFriends] = useState([]);

  // Check if already friends
  useEffect(() => {
    const checkFriend = async () => {
      if (viewingOwnProfile || !currentUser || !userProfile) return;
      const res = await FriendService.getFriends(currentUser.uid);
      if (res.success && res.data.includes(userProfile.id)) {
        setIsFriend(true);
      } else {
        setIsFriend(false);
      }
    };
    checkFriend();
  }, [currentUser, userProfile]);

  // Handle sending friend request
  const handleAddFriend = async () => {
    if (!currentUser || !userProfile) return;
    setFriendRequestSent(true);
    const res = await FriendService.sendFriendRequest(currentUser.uid, userProfile.id);
    if (res.success) {
      Alert.alert('Friend Request Sent', 'Your friend request has been sent!');
    } else {
      Alert.alert('Error', res.message || 'Failed to send friend request.');
      setFriendRequestSent(false);
    }
  };
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);

  // Load friends for displayed profile (enriched with user data)
  useEffect(() => {
    const loadFriends = async () => {
      try {
        if (!userProfile?.id) {
          setFriends([]);
          return;
        }
        const res = await FriendService.getFriends(userProfile.id);
        if (!res.success || !Array.isArray(res.data)) {
          setFriends([]);
          return;
        }
        const ids = res.data.filter(Boolean);
        if (ids.length === 0) {
          setFriends([]);
          return;
        }
        const profiles = await Promise.all(ids.map(async id => {
          const u = await FirebaseService.getUser(id);
          return u.success ? u.data : null;
        }));
        setFriends(profiles.filter(Boolean));
      } catch (e) {
        console.error('Error loading friends:', e);
        setFriends([]);
      }
    };
    loadFriends();
  }, [userProfile?.id]);
  
  // Update local profile picture state when user profile changes
  useEffect(() => {
    if (userProfile?.profilePicture) {
      setProfilePicture(userProfile.profilePicture);
    }
  }, [userProfile?.profilePicture]);
  
  console.log('ProfileScreen - userProfile:', userProfile);
  
  // Get equipped title
  const equippedTitle = useMemo(() => {
    // Use the equipped title from user profile
    // Only default to 'newbie' if equippedTitle is not set at all (undefined/null)
    // If it's explicitly set to 'none', respect that choice
    const titleId = userProfile?.equippedTitle ?? 'newbie';
    console.log('ProfileScreen - equippedTitle from user:', userProfile?.equippedTitle, 'using:', titleId);
    const TITLES = {
      'none': { name: 'None', color: theme.colors.muted },
      'newbie': { name: 'Newbie Athlete', color: '#4a90e2' },
      'rising': { name: 'Rising Star', color: '#5bc0de' },
      'veteran': { name: 'Veteran Athlete', color: '#9b59b6' },
      'elite': { name: 'Elite Athlete', color: '#e74c3c' },
      'master': { name: 'Master Athlete', color: '#f39c12' },
      'legend': { name: 'Legendary Athlete', color: theme.colors.gold },
      'monarch_destruction': { name: 'Monarch of Destruction', color: '#ff4444' },
      'monarch_shadows': { name: 'Monarch of Shadows', color: '#8b00ff' },
      'monarch_flames': { name: 'Monarch of White Flames', color: '#ffffff' },
      'monarch_fangs': { name: 'Monarch of Fangs', color: '#ff6b35' },
      'monarch_frost': { name: 'Monarch of Frost', color: '#00d4ff' },
      'monarch_iron': { name: 'Monarch of the Iron Body', color: '#7d7d7d' },
      'monarch_beginning': { name: 'Monarch of the Beginning', color: '#ffd700' },
      'monarch_plagues': { name: 'Monarch of Plagues', color: '#9acd32' },
      'monarch_transfiguration': { name: 'Monarch of Transfiguration', color: '#da70d6' }
    };
    return TITLES[titleId] || TITLES['newbie'];
  }, [userProfile]);
  
  // Load activities for the profile being viewed (self or other user)
  useEffect(() => {
    const loadActivities = async () => {
      const userId = userProfile?.id;
      if (userId) {
        setLoadingActivities(true);
        const result = await FirebaseService.getUserActivities(userId, 100);
        if (result.success && result.data) {
          setActivities(result.data);
        } else {
          setActivities([]);
        }
        setLoadingActivities(false);
      } else {
        setActivities([]);
      }
    };
    loadActivities();
  }, [userProfile?.id]);

  // Calculate activity statistics
  const activityStats = useMemo(() => {
    if (!activities || activities.length === 0) {
      return {
        totalActivities: 0,
        totalDistance: 0,
        totalHours: 0,
        totalMinutes: 0
      };
    }

    const totalDistance = activities.reduce((sum, activity) => sum + (activity.distance || 0), 0);
    const totalDuration = activities.reduce((sum, activity) => sum + (activity.duration || 0), 0);
    const totalHours = Math.floor(totalDuration / 3600);
    const totalMinutes = Math.floor((totalDuration % 3600) / 60);

    return {
      totalActivities: activities.length,
      totalDistance: totalDistance.toFixed(1),
      totalHours,
      totalMinutes
    };
  }, [activities]);
  
  // Calculate user's rank
  const sorted = useMemo(() => {
    if (!state.users) return [];
    return [...state.users].sort((a, b) => b.xp - a.xp);
  }, [state.users]);
  
  if (!userProfile) {
    return (
      <View style={globalStyles.container}>
        <Header title="Profile" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text }}>Loading...</Text>
        </View>
      </View>
    );
  }
  
  const tier = getTier(userProfile.xp, userProfile.hasMonarchTitle);
  const rank = sorted.findIndex(u => u.id === userProfile.id) + 1;

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const handleUploadProfilePicture = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingImage(true);
        console.log('Starting upload...');
        
        try {
          const imageUri = result.assets[0].uri;
          console.log('Image URI:', imageUri);
          
          // Upload to Firebase
          console.log('Uploading to Firebase...');
          const uploadResult = await FirebaseService.uploadProfilePicture(getCurrentUserId, imageUri);
          console.log('Upload result:', uploadResult);
          
          if (uploadResult.success) {
            console.log('Upload successful, updating UI...');
            // Update local state immediately for instant UI feedback
            setProfilePicture(uploadResult.url);
            
            // Refresh user profile to get new picture
            if (loadUserData) {
              loadUserData(getCurrentUserId).catch(err => 
                console.error('Error reloading user data:', err)
              );
            }
            Alert.alert('Success', 'Profile picture updated successfully!');
          } else {
            console.log('Upload failed:', uploadResult.message);
            Alert.alert('Error', uploadResult.message || 'Failed to upload profile picture.');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Error', 'Failed to upload profile picture.');
        } finally {
          console.log('Setting uploadingImage to false');
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error in handleUploadProfilePicture:', error);
      Alert.alert('Error', 'An error occurred while uploading the image.');
      setUploadingImage(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <Header title="Profile" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={[styles.profileGlow, { backgroundColor: tier.color, opacity: 0.1 }]} />
          
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={handleUploadProfilePicture}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <View style={styles.avatarWrapper}>
                  <View style={styles.profileImageContainer}>
                    <ActivityIndicator size="large" color="#c77dff" />
                  </View>
                </View>
              ) : (profilePicture || userProfile.profilePicture) ? (
                <View style={styles.avatarWrapper}>
                  <Image 
                    source={{ uri: profilePicture || userProfile.profilePicture }} 
                    style={styles.profileImage}
                  />
                  <View style={styles.editOverlay}>
                    <Text style={styles.editIcon}>📷</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.avatarWrapper}>
                  <View style={styles.profileImageContainer}>
                    <View style={styles.uploadPrompt}>
                      <Text style={styles.uploadIcon}>📷</Text>
                      <Text style={styles.uploadText}>Add Photo</Text>
                    </View>
                  </View>
                </View>
              )}
              {tier.key === 'Monarch' && <Text style={styles.monarchCrown}>👑</Text>}
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              {(() => {
                const shouldShowTitle = userProfile?.equippedTitle && userProfile.equippedTitle !== 'none';
                console.log('Should show title?', shouldShowTitle, 'equippedTitle:', userProfile?.equippedTitle);
                return shouldShowTitle && (
                  <View style={[styles.titleBadge, { borderColor: equippedTitle.color }]}>
                    <Text style={[styles.titleBadgeText, { color: equippedTitle.color }]}>
                      {equippedTitle.name}
                    </Text>
                  </View>
                );
              })()}
              <View style={styles.tierBadge}>
                <Text style={[styles.tierBadgeText, { color: tier.color }]}>
                  {tier.key}{['E', 'D', 'C', 'B', 'A', 'S'].includes(tier.key) ? ' Rank Athlete' : ''}
                </Text>
              </View>
              <Text style={styles.profileRank}>Global Rank: #{rank}</Text>
              {/* Add Friend Button (only if viewing another user and not already friends) */}
              {(!viewingOwnProfile && currentUser && userProfile && currentUser.uid !== userProfile.id && !isFriend && !friendRequestSent) && (
                <TouchableOpacity style={{
                  backgroundColor: theme.colors.accent,
                  borderRadius: 10,
                  padding: 12,
                  alignItems: 'center',
                  marginTop: 10
                }} onPress={handleAddFriend}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Add Friend</Text>
                </TouchableOpacity>
              )}
              {(!viewingOwnProfile && currentUser && userProfile && currentUser.uid !== userProfile.id && friendRequestSent) && (
                <View style={{
                  backgroundColor: theme.colors.muted,
                  borderRadius: 10,
                  padding: 12,
                  alignItems: 'center',
                  marginTop: 10
                }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Friend Request Sent</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{userProfile.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxMiddle]}>
              <Text style={[styles.statValue, { color: theme.colors.gold }]}>{userProfile.xp.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: tier.color }]}>#{rank}</Text>
              <Text style={styles.statLabel}>Rank</Text>
            </View>
          </View>

          {/* XP Progress to Next Level */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress to Level {userProfile.level + 1}</Text>
              <Text style={styles.progressPercent}>{Math.floor((userProfile.xp % 1000) / 10)}%</Text>
            </View>
            <View style={styles.progressBar}>
              {/* ...progress bar code... */}
            </View>
            <Text style={styles.progressText}>
              {userProfile.xp % 1000} / 1000 XP
            </Text>
          </View>

          {/* Friends List Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friends</Text>
            {friends.length === 0 ? (
              <Text style={{ color: theme.colors.muted, fontSize: 14, textAlign: 'center', marginVertical: 8 }}>No friends yet</Text>
            ) : (
              friends.map(friend => (
                <TouchableOpacity
                  key={friend.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#18141c',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.06)'
                  }}
                  onPress={() => navigation.navigate('Profile', { userId: friend.id })}
                >
                  <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text, marginRight: 12 }}>{friend.name}</Text>
                  <Text style={{ fontSize: 13, color: theme.colors.muted }}>Level {friend.level}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Activity Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity History</Text>
          
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🏃</Text>
                <Text style={styles.statNumber}>{activityStats.totalActivities}</Text>
                <Text style={styles.statLabel}>Activities</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>📍</Text>
                <Text style={styles.statNumber}>{activityStats.totalDistance}</Text>
                <Text style={styles.statLabel}>km</Text>
              </View>
            </View>
            
            <View style={styles.statRowDivider} />
            
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>⏱️</Text>
                <Text style={styles.statNumber}>
                  {activityStats.totalHours}h {activityStats.totalMinutes}m
                </Text>
                <Text style={styles.statLabel}>Total Time</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>⚡</Text>
                <Text style={styles.statNumber}>
                  {userProfile ? (userProfile.xp / Math.max(activityStats.totalActivities, 1)).toFixed(0) : 0}
                </Text>
                <Text style={styles.statLabel}>Avg XP/Activity</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Info (shows the viewed user's info) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>
                {viewingOwnProfile ? (currentUser?.email || 'Unknown') : 'Hidden'}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {userProfile?.id ? userProfile.id.substring(0, 12) + '...' : 'Unknown'}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Text style={[styles.infoValue, { color: viewingOwnProfile ? theme.colors.gold : theme.colors.muted }]}>
                {viewingOwnProfile ? 'Registered' : 'User'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions (only for your own profile) */}
        {viewingOwnProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            {currentUser ? (
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
                <Text style={styles.logoutIcon}>→</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.loginButton} 
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.loginButtonText}>Login / Register</Text>
                <Text style={styles.loginIcon}>→</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16
  },
  profileCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(235, 186, 242, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  profileGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
    zIndex: 1
  },
  avatarContainer: {
    position: 'relative'
  },
  avatarWrapper: {
    position: 'relative',
    width: 90,
    height: 90
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#c77dff',
    backgroundColor: '#1a0f2e'
  },
  profileImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#c77dff',
    backgroundColor: 'rgba(199, 125, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#c77dff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f0d12'
  },
  editIcon: {
    fontSize: 14
  },
  uploadPrompt: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 4
  },
  uploadText: {
    fontSize: 10,
    color: '#e0aaff',
    fontWeight: '600'
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: 'rgba(199, 125, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  uploadHint: {
    fontSize: 8,
    color: '#e0aaff',
    marginTop: 2,
    textAlign: 'center'
  },
  monarchCrown: {
    position: 'absolute',
    top: -12,
    right: -8,
    fontSize: 24
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16
  },
  profileName: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  titleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1.5,
    marginBottom: 6
  },
  titleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginBottom: 6
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  profileRank: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
    zIndex: 1
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12
  },
  statBoxMiddle: {
    marginHorizontal: 8
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  progressSection: {
    position: 'relative',
    zIndex: 1
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  progressLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700'
  },
  progressPercent: {
    color: theme.colors.gold,
    fontSize: 13,
    fontWeight: '900'
  },
  progressBar: {
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6
  },
  progressFill: {
    height: '100%',
    borderRadius: 6
  },
  progressText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center'
  },
  section: {
    marginTop: 20
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  infoCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(235, 186, 242, 0.1)'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  infoLabel: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600'
  },
  infoValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right'
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 4
  },
  statsCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(235, 186, 242, 0.1)'
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  statNumber: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  statRowDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 8
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)'
  },
  logoutButtonText: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  logoutIcon: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8
  },
  loginButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  loginButtonText: {
    color: '#20160b',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  loginIcon: {
    color: '#20160b',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8
  }
});
