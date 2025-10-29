import React, { useContext, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import Card from '../components/Card';
import BadgeIcon from '../components/BadgeIcon';
import { AppContext } from '../context/AppState';
import { getTier } from '../utils/ranks';
import FirebaseService from '../services/FirebaseService';

export default function ProfileScreen({ navigation }) {
  const { state, currentUser, logout, getCurrentUserProfile, getCurrentUserId } = useContext(AppContext);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  
  // Get current user's profile or use demo user
  const userProfile = getCurrentUserProfile || (state.users && state.users[0]);
  
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
  
  // Load user's activities
  useEffect(() => {
    const loadActivities = async () => {
      const userId = getCurrentUserId;
      if (userId) {
        setLoadingActivities(true);
        const result = await FirebaseService.getUserActivities(userId, 100);
        if (result.success && result.data) {
          setActivities(result.data);
        }
        setLoadingActivities(false);
      }
    };
    loadActivities();
  }, [getCurrentUserId]);

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

  return (
    <View style={globalStyles.container}>
      <Header title="Profile" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={[styles.profileGlow, { backgroundColor: tier.color, opacity: 0.1 }]} />
          
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <BadgeIcon label={tier.key[0]} color={tier.color} size={80} />
              {tier.key === 'Monarch' && <Text style={styles.monarchCrown}>👑</Text>}
            </View>
            
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
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(userProfile.xp % 1000) / 10}%`, backgroundColor: tier.color }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {userProfile.xp % 1000} / 1000 XP
            </Text>
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

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{currentUser ? currentUser.email : 'Guest User'}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {currentUser ? currentUser.uid.substring(0, 12) + '...' : 'demo-user'}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Text style={[styles.infoValue, { color: currentUser ? theme.colors.gold : theme.colors.accent }]}>
                {currentUser ? 'Registered' : 'Guest'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
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
