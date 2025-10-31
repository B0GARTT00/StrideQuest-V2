import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import ActivityIcon from '../components/ActivityIcon';
import { AppContext } from '../context/AppState';
import FirebaseService from '../services/FirebaseService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const indoor = [
  { 
    id: 'i1',     
    title: 'Yoga', 
    subtitle: 'Flexibility & mindfulness', 
    type: 'yoga',
    xp: 25,
    icon: 'yoga',
    iconType: 'MaterialCommunityIcons',
    color: '#c892ff',
    difficulty: 'Beginner'
  },
  { 
    id: 'i2', 
    title: 'Treadmill', 
    subtitle: 'Indoor running workout', 
    type: 'treadmill',
    xp: 45,
    icon: 'run',
    iconType: 'MaterialCommunityIcons',
    color: '#ff6b6b',
    difficulty: 'Intermediate'
  },
  { 
    id: 'i3', 
    title: 'Push ups', 
    subtitle: 'Upper body strength', 
    type: 'pushups',
    xp: 30,
    icon: 'arm-flex-outline',
    iconType: 'MaterialCommunityIcons',
    color: '#ffb86b',
    difficulty: 'Beginner'
  }
];

const outdoor = [
  { 
    id: 'o1', 
    title: 'Run', 
    subtitle: 'Outdoor running', 
    type: 'run',
    xp: 60,
    icon: 'run',
    iconType: 'MaterialCommunityIcons',
    color: '#ff6b6b',
    difficulty: 'Intermediate'
  },
  { 
    id: 'o2', 
    title: 'Walk', 
    subtitle: 'Casual walking', 
    type: 'walk',
    xp: 20,
    icon: 'walk',
    iconType: 'MaterialCommunityIcons',
    color: '#8ad28a',
    difficulty: 'Beginner'
  },
  { 
    id: 'o3', 
    title: 'Bike Ride', 
    subtitle: 'Cycling workout', 
    type: 'cycle',
    xp: 80,
    icon: 'bike',
    iconType: 'MaterialCommunityIcons',
    color: '#6bd3ff',
    difficulty: 'Advanced'
  },
  { 
    id: 'o4', 
    title: 'Hike', 
    subtitle: 'Trail hiking', 
    type: 'hike',
    xp: 70,
    icon: 'hiking',
    iconType: 'MaterialCommunityIcons',
    color: '#f39c12',
    difficulty: 'Advanced'
  }
];

export default function ActivityCategoryScreen({ route, navigation }) {
  const { category } = route.params || { category: 'Outdoor' };
  const { getCurrentUserId, loadUserData } = useContext(AppContext);

  const list = category === 'Indoor' ? indoor : outdoor;
  const categoryColor = category === 'Indoor' ? '#9b59b6' : '#4a90e2';
  const categoryIcon = category === 'Indoor' ? 'home-outline' : 'tree-outline';

  const handleSelect = async (item) => {
    if (item.type === 'run') {
      navigation.navigate('MapActivity', { preset: item });
    } else if (item.type === 'yoga' || item.type === 'pushups' || item.type === 'treadmill') {
      navigation.navigate('TimerActivity', { preset: item });
    } else {
      // Save activity to Firebase
      const userId = getCurrentUserId;
      if (userId) {
        try {
          const result = await FirebaseService.saveActivity(userId, {
            type: item.type,
            xpEarned: item.xp
          });
          if (result.success) {
            // Reload user data to update profile
            if (loadUserData) {
              await loadUserData(userId);
            }
            // Check if leveled up
            if (result.leveledUp) {
              Alert.alert(
                '🎊 LEVEL UP! 🎊',
                `Congratulations! You reached Level ${result.newLevel}!\n\n` +
                `+${result.xpGained} XP\n` +
                `+${result.statPointsGained} Free Stat Points\n` +
                `All stats increased by ${result.newLevel - result.oldLevel}!`,
                [{ text: 'Amazing!', onPress: () => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Main');
                  }
                }}]
              );
            } else {
              Alert.alert(
                'Activity Completed! 🎉',
                `You earned ${result.xpGained} XP!`,
                [{ text: 'OK', onPress: () => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Main');
                  }
                }}]
              );
            }
          }
        } catch (error) {
          console.error('Error saving activity:', error);
          Alert.alert('Error', 'Failed to save activity');
        }
      }
    }
  };

  return (
    <View style={globalStyles.container}>
      <Header title={category} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Header */}
        <View style={[styles.categoryHeader, { borderColor: categoryColor }]}>
          <View style={[styles.headerGlow, { backgroundColor: categoryColor, opacity: 0.08 }]} />
          <View style={styles.headerContent}>
            <View style={[styles.headerIconCircle, { backgroundColor: `${categoryColor}15` }]}>
              <MaterialCommunityIcons name={categoryIcon} size={28} color={categoryColor} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{category} Activities</Text>
              <Text style={styles.headerSubtitle}>{list.length} activities available</Text>
            </View>
          </View>
        </View>

        {/* Activities List */}
        <View style={styles.activitiesContainer}>
          <Text style={styles.sectionTitle}>Available Activities</Text>
          
          {list.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.activityCard, { borderColor: item.color }]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.activityGlow, { backgroundColor: item.color, opacity: 0.05 }]} />
              
              <View style={styles.activityHeader}>
                <View style={[styles.activityIconCircle, { backgroundColor: `${item.color}20` }]}>
                  {item.iconType === 'MaterialCommunityIcons' ? (
                    <MaterialCommunityIcons name={item.icon} size={32} color={item.color} />
                  ) : (
                    <ActivityIcon type={item.type} color={item.color} size={32} />
                  )}
                </View>
                
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{item.title}</Text>
                  <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                </View>

                <View style={styles.activityRight}>
                  <View style={[styles.xpBadge, { backgroundColor: `${item.color}15`, borderColor: item.color }]}>
                    <Text style={[styles.xpText, { color: item.color }]}>+{item.xp}</Text>
                    <Text style={[styles.xpLabel, { color: item.color }]}>XP</Text>
                  </View>
                </View>
              </View>

              <View style={styles.activityFooter}>
                <View style={[styles.difficultyBadge, { 
                  backgroundColor: item.difficulty === 'Beginner' ? 'rgba(138, 210, 138, 0.1)' :
                                   item.difficulty === 'Intermediate' ? 'rgba(255, 184, 107, 0.1)' :
                                   'rgba(255, 107, 107, 0.1)'
                }]}>
                  <Text style={[styles.difficultyText, {
                    color: item.difficulty === 'Beginner' ? '#8ad28a' :
                           item.difficulty === 'Intermediate' ? '#ffb86b' :
                           '#ff6b6b'
                  }]}>
                    {item.difficulty}
                  </Text>
                </View>
                
                <View style={styles.actionButton}>
                  <Text style={[styles.actionButtonText, { color: item.color }]}>
                    {item.type === 'run' ? 'Start Run →' : 'Start Activity →'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsSectionTitle}>💡 Quick Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>• Stay hydrated during your workout</Text>
            <Text style={styles.tipText}>• Warm up before starting</Text>
            <Text style={styles.tipText}>• Track your progress consistently</Text>
            <Text style={styles.tipText}>• Listen to your body and rest when needed</Text>
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
  
  // Category Header
  categoryHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#0f0d12',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1
  },
  headerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  headerEmoji: {
    fontSize: 28
  },
  headerTextContainer: {
    flex: 1
  },
  headerTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  headerSubtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4
  },

  // Activities List
  activitiesContainer: {
    marginTop: 24,
    paddingHorizontal: 16
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 16
  },
  activityCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  activityGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    position: 'relative',
    zIndex: 1
  },
  activityIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  activityEmoji: {
    fontSize: 26
  },
  activityInfo: {
    flex: 1
  },
  activityTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 4
  },
  activitySubtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  activityRight: {
    alignItems: 'flex-end'
  },
  xpBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center'
  },
  xpText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3
  },
  xpLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3
  },

  // Tips Section
  tipsSection: {
    marginTop: 24,
    paddingHorizontal: 16
  },
  tipsSectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 12
  },
  tipCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  tipText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20
  }
});
