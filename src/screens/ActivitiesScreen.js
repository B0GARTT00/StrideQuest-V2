import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { globalStyles, theme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ActivitiesScreen({ navigation }) {
  const categories = [
    {
      id: 'indoor',
      title: 'Indoor Activities',
      subtitle: 'Yoga, Treadmill, HIIT',
      icon: 'home-outline',
      color: '#9b59b6',
      activities: '3 activities'
    },
    {
      id: 'outdoor',
      title: 'Outdoor Activities',
      subtitle: 'Run, Walk, Bike, Hike',
      icon: 'tree-outline',
      color: '#4a90e2',
      activities: '4 activities'
    }
  ];

  return (
    <View style={globalStyles.container}>
      <Header title="Activities" />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Choose Your Activity</Text>
        <Text style={styles.pageSubtitle}>Select a category to start your fitness journey</Text>

        <View style={styles.categoriesContainer}>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                { borderColor: category.color }
              ]}
              onPress={() => navigation.navigate('ActivityCategory', { category: category.id === 'indoor' ? 'Indoor' : 'Outdoor' })}
              activeOpacity={0.8}
            >
              <View style={[styles.categoryGlow, { backgroundColor: category.color, opacity: 0.08 }]} />
              
              <View style={styles.categoryHeader}>
                <View style={[styles.emojiCircle, { backgroundColor: `${category.color}15` }]}>
                  <MaterialCommunityIcons name={category.icon} size={32} color={category.color} />
                </View>
                <View style={styles.categoryArrow}>
                  <Text style={[styles.arrowText, { color: category.color }]}>→</Text>
                </View>
              </View>

              <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
                <View style={styles.categoryFooter}>
                  <Text style={[styles.categoryBadge, { color: category.color }]}>
                    {category.activities}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>Activity Benefits</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="arm-flex-outline" size={32} color="#ff6b6b" />
              <Text style={styles.statLabel}>Strength</Text>
              <Text style={styles.statValue}>Build Power</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="heart-pulse" size={32} color="#ff6b9d" />
              <Text style={styles.statLabel}>Cardio</Text>
              <Text style={styles.statValue}>Heart Health</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="lightning-bolt-outline" size={32} color="#ffd700" />
              <Text style={styles.statLabel}>Energy</Text>
              <Text style={styles.statValue}>Stay Active</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="target" size={32} color="#4a90e2" />
              <Text style={styles.statLabel}>Focus</Text>
              <Text style={styles.statValue}>Mental Clarity</Text>
            </View>
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
  pageTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 20,
    marginHorizontal: 16
  },
  pageSubtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    marginHorizontal: 16,
    marginBottom: 24
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 16
  },
  categoryCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 160
  },
  categoryGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1
  },
  emojiCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  categoryEmoji: {
    fontSize: 32
  },
  categoryArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  arrowText: {
    fontSize: 20,
    fontWeight: '900'
  },
  categoryContent: {
    position: 'relative',
    zIndex: 1
  },
  categoryTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  categorySubtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  
  // Stats Section
  statsSection: {
    marginTop: 32,
    paddingHorizontal: 16
  },
  statsSectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#0f0d12',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 8
  },
  statLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4
  },
  statValue: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '600'
  }
});
