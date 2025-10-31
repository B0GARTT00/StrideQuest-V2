import React, { useState, useEffect, useContext } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { globalStyles } from '../theme/ThemeProvider';
import Header from '../components/Header';
import { AppContext } from '../context/AppState';
import * as FirebaseService from '../services/FirebaseService';

export default function QuestScreen({ navigation }) {
  const { getCurrentUserId, loadUserData } = useContext(AppContext);
  const [quests, setQuests] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuests();
  }, []);

  // Refresh quests when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadQuests();
    }, [])
  );

  const loadQuests = async () => {
    try {
      const userId = getCurrentUserId;
      console.log('Loading quests for user:', userId);
      
      const questsResult = await FirebaseService.getQuests();
      console.log('Quests result:', questsResult);
      
      if (questsResult.success && questsResult.data) {
        console.log('Loaded quests:', questsResult.data.length);
        setQuests(questsResult.data);
        
        // Load progress for all quests at once
        if (userId) {
          const progressResult = await FirebaseService.getUserQuestProgress(userId);
          if (progressResult.success && progressResult.data) {
            // Convert array to map for easy lookup
            const progressMap = {};
            progressResult.data.forEach(progress => {
              progressMap[progress.questId] = progress;
            });
            console.log('Progress map:', progressMap);
            setUserProgress(progressMap);
          }
        }
      }
    } catch (error) {
      console.error('Error loading quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (questId) => {
    const userId = getCurrentUserId;
    if (!userId) return;

    const result = await FirebaseService.claimQuestReward(userId, questId);
    if (result.success) {
      alert(`Claimed ${result.reward} XP!`);
      
      // Reload user data to update XP display
      if (loadUserData) {
        await loadUserData(userId);
      }
      
      loadQuests(); // Reload to update UI
    } else {
      alert(result.error || 'Failed to claim reward');
    }
  };

  const getQuestTypeColor = (type) => {
    switch(type) {
      case 'daily': return ['#3b82f6', '#2563eb'];
      case 'weekly': return ['#8b5cf6', '#7c3aed'];
      case 'achievement': return ['#f59e0b', '#d97706'];
      default: return ['#6366f1', '#4f46e5'];
    }
  };

  const getQuestTypeLabel = (type) => {
    switch(type) {
      case 'daily': return '📅 Daily';
      case 'weekly': return '📆 Weekly';
      case 'achievement': return '🏆 Achievement';
      default: return 'Quest';
    }
  };

  const getProgressText = (quest) => {
    const progress = userProgress[quest.id];
    if (!progress) return '0%';
    
    const percentage = Math.min(100, (progress.progress / quest.requirement.value) * 100);
    return `${Math.round(percentage)}%`;
  };

  const getProgressValue = (quest) => {
    const progress = userProgress[quest.id];
    if (!progress) return { current: 0, target: quest.requirement.value };
    
    return {
      current: progress.progress || 0,
      target: quest.requirement.value
    };
  };

  const isQuestCompleted = (questId) => {
    const progress = userProgress[questId];
    return progress?.completed || false;
  };

  const isRewardClaimed = (questId) => {
    const progress = userProgress[questId];
    return progress?.claimed || false;
  };

  const renderQuest = (quest) => {
    const colors = getQuestTypeColor(quest.type);
    const { current, target } = getProgressValue(quest);
    const completed = isQuestCompleted(quest.id);
    const claimed = isRewardClaimed(quest.id);
    const progressPercent = Math.min(100, (current / target) * 100);

    return (
      <View key={quest.id} style={styles.questCard}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.questBadge}
        >
          <Text style={styles.questTypeText}>{getQuestTypeLabel(quest.type)}</Text>
        </LinearGradient>

        <View style={styles.questContent}>
          <Text style={styles.questTitle}>{quest.title}</Text>
          <Text style={styles.questDescription}>{quest.description}</Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={completed ? ['#10b981', '#059669'] : ['#6366f1', '#4f46e5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {current} / {target}
            </Text>
          </View>

          <View style={styles.questFooter}>
            <View style={styles.rewardContainer}>
              <Text style={styles.rewardLabel}>Reward:</Text>
              <Text style={styles.rewardValue}>⭐ {quest.reward} XP</Text>
            </View>

            {completed && !claimed && (
              <TouchableOpacity 
                style={styles.claimButton}
                onPress={() => handleClaimReward(quest.id)}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.claimButtonGradient}
                >
                  <Text style={styles.claimButtonText}>Claim Reward</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {claimed && (
              <View style={styles.claimedBadge}>
                <Text style={styles.claimedText}>✓ Claimed</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const activeQuests = quests.filter(q => q.active && !isRewardClaimed(q.id));
  const completedQuests = quests.filter(q => isRewardClaimed(q.id));

  return (
    <View style={globalStyles.container}>
      <Header title="Quests" showTitle={false} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Header */}
        <View style={styles.statsHeader}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{activeQuests.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{completedQuests.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{quests.reduce((sum, q) => sum + q.reward, 0)}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
        </View>

        {/* Active Quests */}
        {activeQuests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🎯 Active Quests</Text>
            {activeQuests.map(renderQuest)}
          </>
        )}

        {/* Completed Quests */}
        {completedQuests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>✅ Completed Quests</Text>
            {completedQuests.map(renderQuest)}
          </>
        )}

        {quests.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No quests available</Text>
            <Text style={styles.emptySubtext}>Check back later for new challenges!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f0d12',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#374151',
    marginHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    marginTop: 8,
  },
  questCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  questBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  questTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  questContent: {
    padding: 16,
  },
  questTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  questDescription: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1f2937',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  questFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 8,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  claimButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  claimButtonGradient: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  claimedBadge: {
    backgroundColor: '#1f2937',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  claimedText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
