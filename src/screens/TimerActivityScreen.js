import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
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
  const [longPressProgress, setLongPressProgress] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showTooShortModal, setShowTooShortModal] = useState(false);
  const [showConfirmCompleteModal, setShowConfirmCompleteModal] = useState(false);
  const [showEndedModal, setShowEndedModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activityResult, setActivityResult] = useState(null);
  const intervalRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

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
    if (isLocked) {
      setShowLockedModal(true);
      return;
    }
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  const handleStopPressIn = () => {

    // Start long press timer and animation
    setLongPressProgress(0);
    progressAnim.setValue(0);
    
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000, // Changed to 2 seconds
      useNativeDriver: false,
    }).start();

    let progress = 0;
    longPressTimerRef.current = setInterval(() => {
      progress += 0.1;
      setLongPressProgress(progress);
      
      if (progress >= 1) {
        handleStopComplete();
      }
    }, 200); // Adjusted interval for 2 seconds
  };

  const handleStopPressOut = () => {
    // Cancel long press
    if (longPressTimerRef.current) {
      clearInterval(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    setLongPressProgress(0);
  };

  const handleStopComplete = () => {
    // Clean up timer
    if (longPressTimerRef.current) {
      clearInterval(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    progressAnim.setValue(0);
    setLongPressProgress(0);

    if (seconds < 60) {
      setShowTooShortModal(true);
      return;
    }

    setShowConfirmCompleteModal(true);
  };

  const endWithoutXP = () => {
    setShowTooShortModal(false);
    setShowEndedModal(true);
  };

  const handleStop = () => {
    // This function is now replaced by handleStopPressIn/Out/Complete
    // Keeping for compatibility but functionality moved to long press handlers
  };

  const completeActivity = async () => {
    const userId = getCurrentUserId;
    if (!userId) {
      setErrorMessage('Please login to save your activity');
      setShowErrorModal(true);
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

        setActivityResult(result);
        setShowConfirmCompleteModal(false);
        
        if (result.leveledUp) {
          setShowLevelUpModal(true);
        } else {
          setShowSuccessModal(true);
        }
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      setErrorMessage('Failed to save activity');
      setShowErrorModal(true);
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
          ) : !isPaused ? (
            // Running state - show only pause with lock
            <View style={styles.completeWrapper}>
              <TouchableOpacity 
                style={[styles.circleButton, styles.pauseButton, isLocked && styles.pauseButtonLocked]}
                onPress={handlePause}
              >
                <MaterialCommunityIcons 
                  name="pause" 
                  size={32} 
                  color="#fff" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.lockButtonSmall}
                onPress={toggleLock}
              >
                <MaterialCommunityIcons 
                  name={isLocked ? "lock" : "lock-open-variant"} 
                  size={16} 
                  color={isLocked ? '#ef4444' : '#10b981'} 
                />
              </TouchableOpacity>
            </View>
          ) : (
            // Paused state - show play and complete
            <>
              <TouchableOpacity 
                style={[styles.circleButton, styles.playButton]}
                onPress={handleResume}
              >
                <MaterialCommunityIcons 
                  name="play" 
                  size={32} 
                  color="#fff" 
                />
              </TouchableOpacity>
              
              <View style={styles.stopButtonWrapper}>
                {longPressProgress > 0 && (
                  <Animated.View 
                    style={[
                      styles.progressRing,
                      {
                        transform: [
                          {
                            rotate: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg']
                            })
                          }
                        ]
                      }
                    ]}
                  >
                    <View style={styles.progressSegment1} />
                    <View style={styles.progressSegment2} />
                    <View style={styles.progressSegment3} />
                    <View style={styles.progressSegment4} />
                  </Animated.View>
                )}
                <TouchableOpacity 
                  style={[styles.circleButton, styles.stopButton]}
                  onPressIn={handleStopPressIn}
                  onPressOut={handleStopPressOut}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons 
                    name="stop" 
                    size={32} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <Text style={styles.tipText}>
          💡 Tip: {!isActive ? 'Start your activity' : !isPaused ? (isLocked ? 'Unlock to pause' : 'Lock prevents accidental pause') : 'Hold Complete for 2 seconds'}. Min 1 min to earn XP!
        </Text>
      </View>

      {/* Locked Button Modal */}
      <Modal
        visible={showLockedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLockedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Locked!</Text>
            <Text style={styles.alertText}>Unlock the timer first to pause!</Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => setShowLockedModal(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Too Short Modal */}
      <Modal
        visible={showTooShortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTooShortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tooShortCard}>
            <Text style={styles.alertTitle}>Activity Too Short</Text>
            <Text style={styles.alertText}>
              Activities must be at least 1 minute to earn XP.{'\n\n'}
              Continue to reach 1 minute or end without saving.
            </Text>
            <View style={styles.twoButtonRow}>
              <TouchableOpacity 
                style={[styles.alertButton, styles.secondaryButton, { flex: 1 }]}
                onPress={() => {
                  setShowTooShortModal(false);
                  setIsPaused(false);
                }}
              >
                <Text style={[styles.alertButtonText, styles.secondaryButtonText]}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.alertButton, { flex: 1 }]}
                onPress={endWithoutXP}
              >
                <Text style={styles.alertButtonText}>End Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Complete Modal */}
      <Modal
        visible={showConfirmCompleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.tooShortCard}>
            <Text style={styles.alertTitle}>Complete Activity?</Text>
            <Text style={styles.alertText}>
              Save this activity and earn XP?
            </Text>
            <View style={styles.twoButtonRow}>
              <TouchableOpacity 
                style={[styles.alertButton, styles.secondaryButton, { flex: 1 }]}
                onPress={() => setShowConfirmCompleteModal(false)}
              >
                <Text style={[styles.alertButtonText, styles.secondaryButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.alertButton, { flex: 1 }]}
                onPress={completeActivity}
              >
                <Text style={styles.alertButtonText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ended Without XP Modal */}
      <Modal
        visible={showEndedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEndedModal(false);
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Main');
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Activity Ended</Text>
            <Text style={styles.alertText}>Activity ended without earning XP</Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => {
                setShowEndedModal(false);
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Main');
                }
              }}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Error</Text>
            <Text style={styles.alertText}>{errorMessage}</Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Main');
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Activity Completed! 🎉</Text>
            <Text style={styles.alertText}>
              Duration: {activityResult?.duration || formatTime(seconds)}{'\n'}
              You earned {activityResult?.xpGained || 0} XP!
            </Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => {
                setShowSuccessModal(false);
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Main');
                }
              }}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Level Up Modal */}
      <Modal
        visible={showLevelUpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowLevelUpModal(false);
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Main');
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>🎊 LEVEL UP! 🎊</Text>
            <Text style={styles.alertText}>
              Congratulations! You reached Level {activityResult?.newLevel}!{'\n\n'}
              Duration: {activityResult?.duration || formatTime(seconds)}{'\n'}
              +{activityResult?.xpGained || 0} XP{'\n'}
              +{activityResult?.statPointsGained || 0} Free Stat Points!
            </Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => {
                setShowLevelUpModal(false);
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Main');
                }
              }}
            >
              <Text style={styles.alertButtonText}>Amazing!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    gap: 30,
    marginBottom: 30,
    alignItems: 'center',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 20,
    minWidth: 140,
  },
  circleButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButton: {
    backgroundColor: '#10b981',
  },
  pauseButton: {
    backgroundColor: '#f59e0b',
  },
  pauseButtonLocked: {
    backgroundColor: '#64748b',
    opacity: 0.7,
  },
  playButton: {
    backgroundColor: '#10b981',
  },
  completeWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  stopButtonWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSegment1: {
    position: 'absolute',
    width: 20,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
    top: -3,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  progressSegment2: {
    position: 'absolute',
    width: 20,
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
    bottom: -3,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  progressSegment3: {
    position: 'absolute',
    width: 6,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 3,
    left: -3,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  progressSegment4: {
    position: 'absolute',
    width: 6,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 3,
    right: -3,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  stopButtonLocked: {
    backgroundColor: '#64748b',
    opacity: 0.7,
  },
  lockButtonSmall: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertCard: {
    backgroundColor: '#1a0f2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(199, 125, 255, 0.3)',
  },
  tooShortCard: {
    backgroundColor: '#1a0f2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(199, 125, 255, 0.3)',
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  alertText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  alertButton: {
    backgroundColor: '#c77dff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
    alignSelf: 'stretch',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  twoButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: 'rgba(199, 125, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#c77dff',
  },
  secondaryButtonText: {
    color: '#c77dff',
  },
});
