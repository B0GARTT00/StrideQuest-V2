import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import { AppContext } from '../context/AppState';
import Header from '../components/Header';
import Card from '../components/Card';
import BadgeIcon from '../components/BadgeIcon';
import GuildService from '../services/GuildService';
import { getTier } from '../utils/ranks';

export default function GuildDetailScreen({ route, navigation }) {
  const { guildId } = route.params;
  const { getCurrentUserId } = useContext(AppContext);
  const [guild, setGuild] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuildDetails();
  }, [guildId]);

  const loadGuildDetails = async () => {
    setLoading(true);

    // Get guild info
    const guildResult = await GuildService.getGuild(guildId);
    if (guildResult.success) {
      setGuild(guildResult.data);
    }

    // Get guild members
    const membersResult = await GuildService.getGuildMembers(guildId);
    if (membersResult.success) {
      // Sort: leader first, then officers, then members by XP
      const sorted = membersResult.data.sort((a, b) => {
        if (a.guildRole === 'leader') return -1;
        if (b.guildRole === 'leader') return 1;
        if (a.guildRole === 'officer' && b.guildRole !== 'officer') return -1;
        if (b.guildRole === 'officer' && a.guildRole !== 'officer') return 1;
        return b.xp - a.xp;
      });
      setMembers(sorted);
    }

    setLoading(false);
  };

  const handlePromote = async (userId, userName) => {
    Alert.alert(
      'Promote Member',
      `Promote ${userName} to officer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            const result = await GuildService.promoteToOfficer(guildId, userId, getCurrentUserId);
            if (result.success) {
              Alert.alert('Success', result.message);
              loadGuildDetails();
            } else {
              Alert.alert('Error', result.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={globalStyles.container}>
        <Header title="Club Details" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </View>
    );
  }

  if (!guild) {
    return (
      <View style={globalStyles.container}>
        <Header title="Club Details" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Club not found</Text>
        </View>
      </View>
    );
  }

  const currentUser = members.find(m => m.id === getCurrentUserId);
  const isLeader = currentUser?.guildRole === 'leader';

  return (
    <View style={globalStyles.container}>
      <Header title={guild.name} showBack onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Guild Info Card */}
        <Card style={styles.guildInfoCard}>
          <View style={styles.guildHeader}>
            <Text style={styles.guildEmblem}>{guild.emblem}</Text>
            <View style={styles.guildInfo}>
              <Text style={styles.guildName}>{guild.name}</Text>
              <Text style={styles.guildMeta}>
                {guild.memberCount} members
              </Text>
            </View>
          </View>
          {guild.description && (
            <Text style={styles.guildDescription}>{guild.description}</Text>
          )}
          
          {/* Guild Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{guild.totalXP.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Combined XP</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{members.reduce((sum, m) => sum + (m.level || 1), 0)}</Text>
              <Text style={styles.statLabel}>Combined Lvl</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{guild.memberCount}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
          </View>
        </Card>

        {/* Chat CTA + Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('GuildChat', { guildId })}>
            <Text style={styles.chatButtonText}>Open Club Chat</Text>
          </TouchableOpacity>

          {/* Guild Actions */}
          {!isLeader ? (
            <TouchableOpacity
              style={[styles.dangerButton, { marginTop: 12 }]}
              onPress={() => {
                Alert.alert(
                  'Leave Club',
                  'Are you sure you want to leave this club?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Leave', style: 'destructive', onPress: async () => {
                      const res = await GuildService.leaveGuild(guildId, getCurrentUserId);
                      if (res.success) {
                        Alert.alert('Left Club', 'You have left the club.');
                        navigation.navigate('Guilds');
                      } else {
                        Alert.alert('Error', res.message || 'Failed to leave club');
                      }
                    }}
                  ]
                );
              }}
            >
              <Text style={styles.dangerText}>Leave Club</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.dangerButton, { marginTop: 12, borderColor: '#ff4d4f', backgroundColor: 'rgba(255,77,79,0.15)' }]}
              onPress={() => {
                Alert.alert(
                  'Disband Club',
                  'This will remove all members and delete the club. This action cannot be undone. Proceed?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Disband', style: 'destructive', onPress: async () => {
                      const res = await GuildService.disbandGuild(guildId, getCurrentUserId);
                      if (res.success) {
                        Alert.alert('Club Disbanded', 'The club has been deleted.');
                        navigation.navigate('Guilds');
                      } else {
                        Alert.alert('Error', res.message || 'Failed to disband club');
                      }
                    }}
                  ]
                );
              }}
            >
              <Text style={styles.dangerText}>Disband Club</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Members List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          {members.map((member, idx) => {
            const tier = getTier(member.xp, member.hasMonarchTitle);
            const roleColors = {
              leader: theme.colors.gold,
              officer: '#9d00ff',
              member: theme.colors.accent
            };
            const roleLabels = {
              leader: '👑 Leader',
              officer: '⭐ Officer',
              member: 'Member'
            };

            return (
              <Card key={member.id} style={styles.memberCard}>
                <View style={styles.memberRow}>
                  <View style={styles.memberLeft}>
                    <BadgeIcon label={tier.key[0]} color={tier.color} size={48} />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberMeta}>
                        Level {member.level} • {member.xp.toLocaleString()} XP
                      </Text>
                      <View style={[styles.roleBadge, { borderColor: roleColors[member.guildRole] }]}>
                        <Text style={[styles.roleText, { color: roleColors[member.guildRole] }]}>
                          {roleLabels[member.guildRole]}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  {isLeader && member.guildRole === 'member' && (
                    <TouchableOpacity 
                      style={styles.promoteButton}
                      onPress={() => handlePromote(member.id, member.name)}
                    >
                      <Text style={styles.promoteButtonText}>Promote</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    color: theme.colors.muted,
    fontSize: 16
  },
  guildInfoCard: {
    backgroundColor: 'rgba(199, 125, 255, 0.1)',
    borderColor: '#c77dff',
    borderWidth: 2,
    marginBottom: 24
  },
  chatButton: {
    backgroundColor: '#c77dff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  chatButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16
  },
  dangerButton: {
    borderWidth: 2,
    borderColor: '#e0aaff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(224,170,255,0.08)'
  },
  dangerText: {
    color: '#e0aaff',
    fontWeight: '900',
    fontSize: 15
  },
  guildHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  guildEmblem: {
    fontSize: 64,
    marginRight: 16
  },
  guildInfo: {
    flex: 1
  },
  guildName: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4
  },
  guildMeta: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600'
  },
  guildDescription: {
    color: theme.colors.muted,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(199, 125, 255, 0.2)'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    color: '#e0aaff',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: 0.5
  },
  memberCard: {
    marginBottom: 12
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1
  },
  memberName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4
  },
  memberMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)'
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700'
  },
  promoteButton: {
    backgroundColor: 'rgba(199, 125, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c77dff'
  },
  promoteButtonText: {
    color: '#e0aaff',
    fontWeight: '700',
    fontSize: 12
  }
});
