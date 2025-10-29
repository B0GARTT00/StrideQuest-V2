import React, { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import { AppContext } from '../context/AppState';
import Header from '../components/Header';
import Card from '../components/Card';
import BadgeIcon from '../components/BadgeIcon';
import { getTier, TIERS_ORDER } from '../utils/ranks';
import LeaderboardService from '../services/LeaderboardService';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Animated Collapsible Tier Component
const AnimatedTier = ({ tierData, sorted, isExpanded, onToggle, tierColor }) => {
  const [contentHeight, setContentHeight] = useState(0);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isExpanded) {
      Animated.parallel([
        Animated.spring(heightAnim, {
          toValue: contentHeight,
          useNativeDriver: false,
          tension: 50,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(heightAnim, {
          toValue: 0,
          useNativeDriver: false,
          tension: 50,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [isExpanded, contentHeight]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg']
  });

  return (
    <View style={styles.tierContainer}>
      {/* Tier Header */}
      <TouchableOpacity 
        style={[styles.tierHeader, isExpanded && styles.tierHeaderExpanded]} 
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <View style={[styles.tierHeaderGlow, { backgroundColor: tierColor, opacity: 0.08 }]} />
        
        <View style={styles.tierHeaderLeft}>
          <View style={{ position: 'relative' }}>
            <BadgeIcon label={tierData.key} color={tierColor} size={56} />
            {tierData.key === 'Monarch' && <Text style={styles.monarchCrownHeader}>👑</Text>}
          </View>
          
          <View style={styles.tierHeaderInfo}>
            <Text style={styles.tierHeaderTitle}>
              {tierData.key}{['E', 'D', 'C', 'B', 'A', 'S'].includes(tierData.key) ? ' Rank Athlete' : ''}
            </Text>
            <Text style={styles.tierHeaderSub}>
              {tierData.count} {tierData.count === 1 ? 'Hunter' : 'Hunters'} {tierData.key === 'Monarch' ? '• Max 9' : ''}
            </Text>
            {tierData.top && (
              <View style={styles.tierHeaderTopUser}>
                <Text style={styles.tierHeaderTopLabel}>Top: </Text>
                <Text style={[styles.tierHeaderTopName, { color: tierColor }]}>{tierData.top.name}</Text>
                <Text style={styles.tierHeaderTopXP}> • Level {tierData.top.level}</Text>
              </View>
            )}
          </View>
        </View>

        <Animated.Text style={[styles.tierChevron, { transform: [{ rotate: rotation }] }]}>▶</Animated.Text>
      </TouchableOpacity>

      {/* Animated Collapsible Content */}
      <Animated.View 
        style={[
          styles.tierContentWrapper,
          { 
            height: heightAnim,
            opacity: opacityAnim
          }
        ]}
      >
        <View 
          style={styles.tierContent}
          onLayout={(e) => {
            const measuredHeight = e.nativeEvent.layout.height;
            if (measuredHeight > 0 && contentHeight !== measuredHeight) {
              setContentHeight(measuredHeight);
            }
          }}
        >
          {tierData.users.map((user, idx) => {
            const globalRank = sorted.indexOf(user) + 1;
            return (
              <View key={user.id} style={styles.tierUserRow}>
                <View style={styles.tierUserRank}>
                  <Text style={styles.tierUserRankText}>#{globalRank}</Text>
                </View>
                <View style={styles.tierUserInfo}>
                  <Text style={styles.tierUserName}>{user.name}</Text>
                  <Text style={styles.tierUserXP}>Level {user.level} • {user.xp.toLocaleString()} XP</Text>
                </View>
                <View style={[styles.tierUserBadge, { borderColor: tierColor }]}>
                  <Text style={[styles.tierUserBadgeText, { color: tierColor }]}>{tierData.key}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
};

export default function LeaderboardScreen({ navigation }) {
  const { state, getCurrentUserId } = useContext(AppContext);
  const sorted = useMemo(() => {
    if (!state.users || !Array.isArray(state.users)) return [];
    return [...state.users].sort((a, b) => b.xp - a.xp);
  }, [state.users]);

  const maxXp = sorted.length ? sorted[0].xp : 1;

  const topThree = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // Get current user ID from authenticated user or use first demo user
  const currentUserId = getCurrentUserId;
  const yourRankObj = currentUserId ? LeaderboardService.fetchUserRank(state.users, currentUserId) : null;

  // group ALL users by tier and compute stats for cards (including top 3)
  const tiersData = useMemo(() => {
    const map = {};
    sorted.forEach(u => {
      const tier = getTier(u.xp, u.hasMonarchTitle).key;
      if (!map[tier]) map[tier] = [];
      map[tier].push(u);
    });
    return TIERS_ORDER.map(t => {
      const usersInTier = (map[t] || []).sort((a, b) => b.xp - a.xp);
      return {
        key: t,
        count: usersInTier.length,
        top: usersInTier[0] || null,
        users: usersInTier
      };
    }).filter(s => s.count > 0);
  }, [sorted]);

  const [expandedTiers, setExpandedTiers] = useState(new Set());
  
  const toggleTier = (tierKey) => {
    setExpandedTiers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tierKey)) {
        newSet.delete(tierKey);
      } else {
        newSet.add(tierKey);
      }
      return newSet;
    });
  };

  // Arrange podium: 2nd, 1st, 3rd (if available)
  const podiumOrder = [];
  if (topThree.length >= 2) podiumOrder.push(topThree[1]); // 2nd place
  if (topThree.length >= 1) podiumOrder.push(topThree[0]); // 1st place
  if (topThree.length >= 3) podiumOrder.push(topThree[2]); // 3rd place

  return (
    <View style={globalStyles.container}>
      <Header title="Leaderboard" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top 3 podium */}
        <View style={styles.podiumSection}>
          <Text style={styles.sectionTitle}>Top Athletes</Text>
          <View style={styles.podiumWrap}>
            {podiumOrder.map((u) => {
              const actualRank = sorted.indexOf(u) + 1;
              const heights = { 1: 140, 2: 110, 3: 90 };
              const height = heights[actualRank] || 90;
              const colors = { 1: theme.colors.gold, 2: '#7fb3ff', 3: '#cd7f32' };
              const bgColors = { 1: 'rgba(232, 194, 141, 0.12)', 2: 'rgba(127, 179, 255, 0.1)', 3: 'rgba(205, 127, 50, 0.1)' };
              
              return (
                <View key={u.id} style={[styles.podiumItem, { marginTop: 140 - height }]}>
                  <View style={styles.podiumBadgeWrap}>
                    <BadgeIcon label={`${actualRank}`} color={colors[actualRank]} size={actualRank === 1 ? 64 : 52} />
                    {actualRank === 1 && <Text style={styles.crownEmoji}>👑</Text>}
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>{u.name}</Text>
                  <Text style={styles.podiumXp}>Level {u.level}</Text>
                  <View style={[styles.podiumBar, { height, backgroundColor: bgColors[actualRank], borderTopColor: colors[actualRank] }]}>
                    <Text style={styles.podiumRank}>{actualRank}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* "Your Rank" quick card */}
        {yourRankObj && yourRankObj.rank > 3 && state.users && (() => {
          const you = state.users.find(u => u.id === currentUserId);
          if (!you) return null;
          const tier = getTier(you.xp, you.hasMonarchTitle);
          return (
            <View style={styles.yourRankSection}>
              <Text style={styles.sectionTitle}>Your Position</Text>
              <View style={styles.yourRankCard}>
                <View style={styles.yourRankRow}>
                  <BadgeIcon label={`${yourRankObj.rank}`} color={tier.color} size={48} />
                  <View style={styles.yourRankInfo}>
                    <Text style={styles.yourRankName}>{you.name}</Text>
                    <Text style={styles.yourRankMeta}>Level {you.level} · {tier.key}{['E', 'D', 'C', 'B', 'A', 'S'].includes(tier.key) ? ' Rank Athlete' : ''}</Text>
                  </View>
                </View>
                <View style={styles.yourRankBar}>
                  <View style={[styles.yourRankBarFill, { width: `${(you.xp / maxXp) * 100}%`, backgroundColor: tier.color }]} />
                </View>
              </View>
            </View>
          );
        })()}

        {/* Rank tiers - Collapsible */}
        <View style={styles.tiersSection}>
          <Text style={styles.sectionTitle}>Rank Tiers</Text>
          <View style={styles.tiersList}>
            {tiersData.map(t => {
              const isExpanded = expandedTiers.has(t.key);
              const tierColor = getTier(t.top ? t.top.xp : 0, t.top ? t.top.hasMonarchTitle : false).color;
              
              return (
                <AnimatedTier
                  key={t.key}
                  tierData={t}
                  sorted={sorted}
                  isExpanded={isExpanded}
                  onToggle={() => toggleTier(t.key)}
                  tierColor={tierColor}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40
  },
  
  // Section styles
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },

  // Podium styles
  podiumSection: {
    marginTop: 16,
    paddingHorizontal: 12
  },
  podiumWrap: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingHorizontal: 8
  },
  podiumItem: {
    width: '30%',
    alignItems: 'center',
    marginHorizontal: 4
  },
  podiumBadgeWrap: {
    position: 'relative',
    marginBottom: 8
  },
  crownEmoji: {
    position: 'absolute',
    top: -20,
    fontSize: 24,
    alignSelf: 'center'
  },
  monarchCrown: {
    position: 'absolute',
    top: -8,
    right: -4,
    fontSize: 18
  },
  podiumName: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 2,
    textAlign: 'center'
  },
  podiumXp: {
    color: theme.colors.gold,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6
  },
  podiumBar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: 3,
    alignItems: 'center',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  podiumRank: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    opacity: 0.3
  },

  // Your rank section
  yourRankSection: {
    paddingHorizontal: 12,
    marginTop: 20
  },
  yourRankCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(235, 186, 242, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  yourRankRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  yourRankInfo: {
    flex: 1,
    marginLeft: 14
  },
  yourRankName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  yourRankMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2
  },
  yourRankBar: {
    height: 8,
    backgroundColor: 'rgba(16, 32, 58, 0.6)',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 12
  },
  yourRankBarFill: {
    height: '100%',
    borderRadius: 6
  },

  // Tiers section - Collapsible
  tiersSection: {
    paddingHorizontal: 12,
    marginTop: 24,
    marginBottom: 20
  },
  tiersList: {
    gap: 12
  },
  tierContainer: {
    backgroundColor: '#0f0d12',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8
  },
  tierHeader: {
    padding: 18,
    position: 'relative',
    overflow: 'hidden'
  },
  tierHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  tierHeaderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  tierHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 30,
    position: 'relative',
    zIndex: 1
  },
  tierHeaderInfo: {
    flex: 1,
    marginLeft: 16
  },
  tierHeaderTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  tierHeaderSub: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600'
  },
  tierHeaderTopUser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap'
  },
  tierHeaderTopLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '500'
  },
  tierHeaderTopName: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  tierHeaderTopXP: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '600'
  },
  tierChevron: {
    position: 'absolute',
    right: 18,
    top: '50%',
    marginTop: -10,
    color: theme.colors.muted,
    fontSize: 16,
    opacity: 0.6,
    zIndex: 2
  },
  monarchCrownHeader: {
    position: 'absolute',
    top: -10,
    right: -6,
    fontSize: 20
  },
  tierContentWrapper: {
    overflow: 'hidden',
    width: '100%'
  },
  tierContent: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 8,
    position: 'absolute',
    width: '100%',
    top: 0
  },
  tierUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  tierUserRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  tierUserRankText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    opacity: 0.7
  },
  tierUserInfo: {
    flex: 1
  },
  tierUserName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  tierUserXP: {
    color: theme.colors.muted,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600'
  },
  tierUserBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  tierUserBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5
  }
});
