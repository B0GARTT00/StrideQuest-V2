import React, { useState, useContext, useMemo } from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Text, StyleSheet, Animated } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import StatusCard from '../components/StatusCard';
import ActivityIcon from '../components/ActivityIcon';
import { AppContext } from '../context/AppState';
import { getTier } from '../utils/ranks';
import * as FirebaseService from '../services/FirebaseService';

const mockActivities = [
  { id: 'a1', type: 'Run', distanceKm: 5.2, time: '28:14', xp: 120 },
  { id: 'a2', type: 'Walk', distanceKm: 2.4, time: '24:02', xp: 80 },
  { id: 'a3', type: 'Cycle', distanceKm: 12.1, time: '42:10', xp: 200 }
];

// Helper function to get title display name
const getTitleName = (titleId) => {
  const titleMap = {
    'none': 'None',
    'newbie': 'Newbie Athlete',
    'rising': 'Rising Star',
    'veteran': 'Veteran Athlete',
    'elite': 'Elite Athlete',
    'master': 'Master Athlete',
    'legend': 'Legendary Athlete',
    'monarch_destruction': 'Monarch of Destruction',
    'monarch_shadows': 'Monarch of Shadows',
    'monarch_flames': 'Monarch of White Flames',
    'monarch_fangs': 'Monarch of Fangs',
    'monarch_frost': 'Monarch of Frost',
    'monarch_iron': 'Monarch of the Iron Body',
    'monarch_beginning': 'Monarch of the Beginning',
    'monarch_plagues': 'Monarch of Plagues',
    'monarch_transfiguration': 'Monarch of Transfiguration'
  };
  return titleMap[titleId] || 'None';
};

export default function HomeScreen({ navigation }) {
  const { state, getCurrentUserProfile, loadUserData } = useContext(AppContext);
  const me = getCurrentUserProfile || (state.users && state.users[0]);
  const [open, setOpen] = useState(false);

  const level = me ? (me.level || FirebaseService.calculateLevel(me.xp || 0)) : 1;
  
  // Calculate XP progress for current level
  const getXPProgress = () => {
    if (!me) return 0;
    const currentXP = me.xp || 0;
    const currentLevel = level;
    
    if (currentLevel >= 100) return 1; // Max level
    
    // Get total XP needed to reach current level
    const xpForCurrentLevel = FirebaseService.calculateTotalXPForLevel(currentLevel);
    // Get XP needed for next level
    const xpForNextLevel = FirebaseService.calculateXPForNextLevel(currentLevel);
    
    // Calculate progress within current level
    const xpIntoLevel = currentXP - xpForCurrentLevel;
    return Math.min(1, Math.max(0, xpIntoLevel / xpForNextLevel));
  };
  
  const expPercent = getXPProgress();
  const tier = me ? getTier(me.xp, me.hasMonarchTitle) : { key: 'E', color: '#4a90e2' };

  const myRank = useMemo(() => {
    if (!state.users || !me) return 1;
    const sorted = [...state.users].sort((a, b) => b.xp - a.xp);
    return sorted.indexOf(me) + 1;
  }, [state.users, me]);

  const leaderboardTop = useMemo(() => {
    if (!state.users) return [];
    return [...state.users].sort((a, b) => b.xp - a.xp).slice(0, 3);
  }, [state.users]);

  if (!me) {
    return (
      <View style={globalStyles.container}>
        <Header title="" showTitle={false} rightLabel="Profile" onPressRight={() => navigation.navigate('Profile')} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <Header title="" showTitle={false} rightLabel="Profile" onPressRight={() => navigation.navigate('Profile')} />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero Status Card */}
        <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.9} style={styles.heroCard}>
          <View style={[styles.heroGlow, { backgroundColor: tier.color, opacity: 0.08 }]} />
          
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{me.name ?? 'Hunter'}</Text>
              <Text style={[styles.rankBadge, { color: tier.color }]}>
                {tier.key}{['E', 'D', 'C', 'B', 'A', 'S'].includes(tier.key) ? ' Rank Athlete' : ''} • Rank #{myRank}
              </Text>
            </View>
            <TouchableOpacity style={styles.statusButton} onPress={() => setOpen(true)}>
              <Text style={styles.statusButtonText}>Status</Text>
              <Text style={styles.statusButtonArrow}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.levelSection}>
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelLabel}>LVL</Text>
                <Text style={styles.levelNumber}>{level}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={styles.expLabelRow}>
                  <Text style={styles.expLabel}>
                    {level >= 100 ? 'MAX LEVEL' : 'Experience Progress'}
                  </Text>
                  <Text style={styles.expPercent}>
                    {level >= 100 ? '100%' : `${Math.floor(expPercent * 100)}%`}
                  </Text>
                </View>
                <View style={styles.progressOuter}>
                  <View style={[styles.progressInner, { width: `${expPercent * 100}%`, backgroundColor: tier.color }]} />
                  <View style={[styles.progressGlow, { width: `${expPercent * 100}%`, backgroundColor: tier.color }]} />
                </View>
                <Text style={styles.expSubtext}>
                  {level >= 100 
                    ? `${me.xp.toLocaleString()} Total XP`
                    : `${Math.floor((me.xp || 0) - FirebaseService.calculateTotalXPForLevel(level))} / ${FirebaseService.calculateXPForNextLevel(level)} XP`
                  }
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickActionCard, styles.primaryAction]} 
            onPress={() => navigation.navigate('MapActivity')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>🏃</Text>
            </View>
            <Text style={styles.actionTitle}>Start Activity</Text>
            <Text style={styles.actionSubtitle}>Begin your journey</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            onPress={() => navigation.navigate('Quest')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconWrap}>
              <Text style={styles.actionIcon}>⚔️</Text>
            </View>
            <Text style={styles.actionTitle}>Quests</Text>
            <Text style={styles.actionSubtitle}>View challenges</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Activities')}>
              <Text style={styles.sectionLink}>View All →</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.activitiesList}>
            {mockActivities.map((a, idx) => (
              <View key={a.id} style={styles.activityCard}>
                <View style={styles.activityLeft}>
                  <View style={styles.activityIconCircle}>
                    <ActivityIcon type={a.type} color={theme.colors.gold} size={28} />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityType}>{a.type}</Text>
                    <Text style={styles.activityMeta}>{a.distanceKm} km • {a.time}</Text>
                  </View>
                </View>
                <View style={styles.activityRight}>
                  <Text style={styles.activityXP}>+{a.xp} XP</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Top Leaderboard Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Hunters</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
              <Text style={styles.sectionLink}>Full Ranking →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.leaderboardPreview}>
            {leaderboardTop.map((user, idx) => {
              const userTier = getTier(user.xp, user.hasMonarchTitle);
              const medal = ['🥇', '🥈', '🥉'][idx];
              return (
                <View key={user.id} style={styles.leaderboardRow}>
                  <Text style={styles.leaderboardMedal}>{medal}</Text>
                  <View style={styles.leaderboardInfo}>
                    <Text style={styles.leaderboardName}>{user.name}</Text>
                    <Text style={[styles.leaderboardRank, { color: userTier.color }]}>
                      {userTier.key} • Level {user.level}
                    </Text>
                  </View>
                  <Text style={styles.leaderboardXP}>{user.xp.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Modal transparent={true} visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1 }}>
          <StatusCard 
            modal 
            onClose={() => setOpen(false)} 
            onStatsChanged={async () => {
              // Reload user data after stat allocation
              if (me?.id) {
                await loadUserData(me.id);
              }
            }}
            player={{
              level,
              job: tier.key === 'Monarch' ? 'Shadow Monarch' : `${tier.key} Rank Athlete`,
              title: getTitleName(me.equippedTitle),
              hp: 100 + (level * 20), // HP increases with level
              mp: 10 + (level * 5), // MP increases with level
              exp: Math.floor(expPercent * 100),
              stats: me.stats || { 
                strength: 10 + level,
                agility: 10 + level,
                sense: 10 + level,
                vitality: 10 + level,
                intelligence: 10 + level
              },
              remaining: me.statPoints || 0, // Available stat points
              name: me.name ?? 'Hunter',
              userId: me.id
            }} 
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Hero Card
  heroCard: {
    marginTop: 12,
    marginHorizontal: 12,
    backgroundColor: '#0f0d12',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    position: 'relative',
    overflow: 'hidden'
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    position: 'relative',
    zIndex: 1
  },
  welcomeText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  userName: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5
  },
  rankBadge: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 0.5
  },
  statusButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  statusButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginRight: 6
  },
  statusButtonArrow: {
    color: theme.colors.accent,
    fontSize: 16,
    fontWeight: '900'
  },
  levelSection: {
    position: 'relative',
    zIndex: 1
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  levelBadge: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center'
  },
  levelLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1
  },
  levelNumber: {
    color: theme.colors.gold,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2
  },
  expLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  expLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  expPercent: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  progressOuter: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative'
  },
  progressInner: {
    height: '100%',
    borderRadius: 10,
    position: 'relative',
    zIndex: 1
  },
  progressGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    opacity: 0.3,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8
  },
  expSubtext: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 16,
    gap: 12
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#0f0d12',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  primaryAction: {
    borderColor: theme.colors.accent,
    borderWidth: 1.5,
    backgroundColor: 'rgba(235, 186, 242, 0.05)'
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  actionIcon: {
    fontSize: 24
  },
  actionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.3
  },
  actionSubtitle: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '600'
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 12
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  sectionLink: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '700'
  },

  // Activities
  activitiesList: {
    gap: 10
  },
  activityCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  activityIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  activityEmoji: {
    fontSize: 20
  },
  activityInfo: {
    flex: 1
  },
  activityType: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  activityMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600'
  },
  activityRight: {
    alignItems: 'flex-end'
  },
  activityXP: {
    color: theme.colors.gold,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3
  },

  // Leaderboard Preview
  leaderboardPreview: {
    gap: 8
  },
  leaderboardRow: {
    backgroundColor: '#0f0d12',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)'
  },
  leaderboardMedal: {
    fontSize: 28,
    marginRight: 12
  },
  leaderboardInfo: {
    flex: 1
  },
  leaderboardName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  leaderboardRank: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3
  },
  leaderboardXP: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '700'
  }
});
