import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { globalStyles, theme } from '../theme/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppContext } from '../context/AppState';
import FirebaseService from '../services/OfflineFirebaseService';

export default function TimerActivityScreen({ route, navigation }) {
  const { preset } = route.params || {};
  const { getCurrentUserId, loadUserData } = useContext(AppContext);
  
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds(prevSeconds => prevSeconds + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    if (seconds < 60) {
      Alert.alert(
        'Activity Too Short',
        'Please complete at least 1 minute to earn XP.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Complete Activity?',
      `Duration: ${formatTime(seconds)}\n\nAre you sure you want to complete this activity?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: () => completeActivity()
        }
      ]
    );
  };

  const completeActivity = async () => {
    const userId = getCurrentUserId;
    if (!userId) {
      Alert.alert('Error', 'Please login to save your activity');
      return;
    }

    try {
      // Calculate XP based on duration
      const minutes = Math.floor(seconds / 60);
      const baseXP = preset?.xp || 25;
      const timeBonus = Math.floor(minutes * 2); // 2 XP per minute
      const totalXP = baseXP + timeBonus;

      const result = await FirebaseService.saveActivity(userId, {
        type: preset?.type || 'yoga',
        durationMinutes: minutes,
        xpEarned: totalXP
      });

      if (result.success) {
        if (loadUserData) {
          await loadUserData(userId);
        }

        if (result.leveledUp) {
          Alert.alert(
            '🎊 LEVEL UP! 🎊',
            `Congratulations! You reached Level ${result.newLevel}!\n\n` +
            `Duration: ${formatTime(seconds)}\n` +
            `+${result.xpGained} XP\n` +
            `+${result.statPointsGained} Free Stat Points!`,
            [{ 
              text: 'Amazing!', 
              onPress: () => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Main');
                }
              }
            }]
          );
        } else {
          Alert.alert(
            'Activity Completed! 🎉',
            `Duration: ${formatTime(seconds)}\n` +
            `You earned ${result.xpGained} XP!`,
            [{ 
              text: 'OK', 
              onPress: () => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Main');
                }
              }
            }]
          );
        }
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'Failed to save activity');
    }
  };

  return (
    <LinearGradient
      colors={[preset?.color || '#c892ff', '#1a0f2e']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{preset?.title || 'Activity'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons 
            name={preset?.icon || 'yoga'} 
            size={80} 
            color="#fff" 
          />
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
          <Text style={styles.timerLabel}>
            {isActive ? (isPaused ? 'PAUSED' : 'IN PROGRESS') : 'READY TO START'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{Math.floor(seconds / 60)}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {(preset?.xp || 25) + Math.floor(seconds / 60) * 2}
            </Text>
            <Text style={styles.statLabel}>Est. XP</Text>
          </View>
        </View>

        <View style={styles.controls}>
          {!isActive ? (
            <TouchableOpacity 
              style={[styles.controlButton, styles.startButton]}
              onPress={handleStart}
            >
              <MaterialCommunityIcons name="play" size={40} color="#fff" />
              <Text style={styles.controlButtonText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.controlButton, styles.pauseButton]}
                onPress={isPaused ? handleResume : handlePause}
              >
                <MaterialCommunityIcons 
                  name={isPaused ? "play" : "pause"} 
                  size={40} 
                  color="#fff" 
                />
                <Text style={styles.controlButtonText}>
                  {isPaused ? 'Resume' : 'Pause'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.controlButton, styles.stopButton]}
                onPress={handleStop}
              >
                <MaterialCommunityIcons name="stop" size={40} color="#fff" />
                <Text style={styles.controlButtonText}>Complete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.tipText}>
          💡 Tip: Complete at least 1 minute to earn XP. Longer sessions earn bonus XP!
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 50,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 30,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 20,
    minWidth: 140,
  },
  startButton: {
    backgroundColor: '#10b981',
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  tipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
