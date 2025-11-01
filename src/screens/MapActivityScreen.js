import React, { useEffect, useState, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../theme/ThemeProvider';
import { AppContext } from '../context/AppState';
import * as FirebaseService from '../services/FirebaseService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Haversine formula to calculate distance between two lat/lng points in meters
function haversineDistance(coord1, coord2) {
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const { width, height } = Dimensions.get('window');

export default function MapActivityScreen({ navigation, route }) {
  const { getCurrentUserId, loadUserData } = useContext(AppContext);
  const insets = useSafeAreaInsets();
  const activityType = route?.params?.preset?.type || 'run';
  
  const [location, setLocation] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [xpReward, setXpReward] = useState(null);
  
  const watchId = useRef(null);
  const timerInterval = useRef(null);
  const startTime = useRef(null);
  const pausedDuration = useRef(0);

  useEffect(() => {
    requestLocationPermission();
    return () => {
      cleanup();
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to track your activity.');
        navigation.goBack();
        return;
      }
      // Get initial location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      setLocation(loc.coords);
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Could not access your location.');
    }
  };

  const startTracking = async () => {
    setIsTracking(true);
    setIsPaused(false);
    startTime.current = Date.now() - pausedDuration.current;
    
    // Start timer
    timerInterval.current = setInterval(() => {
      setDuration(Date.now() - startTime.current);
    }, 1000);

    // Start watching position
    try {
      watchId.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (loc) => {
          setLocation(loc.coords);
          // Ensure speed is non-negative (GPS can return negative values when stationary)
          const currentSpeed = loc.coords.speed !== null && loc.coords.speed >= 0 ? loc.coords.speed : 0;
          setSpeed(currentSpeed);
          
          setRoutePath((prev) => {
            const newRoute = [...prev, {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            }];
            
            if (newRoute.length > 1) {
              const lastCoord = newRoute[newRoute.length - 2];
              const currentCoord = newRoute[newRoute.length - 1];
              const additionalDistance = haversineDistance(lastCoord, currentCoord);
              setDistance((prevDistance) => prevDistance + additionalDistance);
            }
            
            return newRoute;
          });
        }
      );
    } catch (error) {
      console.error('Error starting location watch:', error);
      Alert.alert('Error', 'Could not start tracking.');
      setIsTracking(false);
    }
  };

  const pauseTracking = () => {
    setIsPaused(true);
    pausedDuration.current = Date.now() - startTime.current;
    
    // Stop timer
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    
    // Stop watching location
    if (watchId.current) {
      watchId.current.remove();
      watchId.current = null;
    }
  };

  const resumeTracking = () => {
    setIsPaused(false);
    startTime.current = Date.now() - pausedDuration.current;
    
    // Restart timer
    timerInterval.current = setInterval(() => {
      setDuration(Date.now() - startTime.current);
    }, 1000);
    
    // Restart watching location
    startTracking();
  };

  const stopTracking = () => {
    if (distance < 10) {
      Alert.alert('Too Short', 'Your activity is too short to save. Walk at least 10 meters.');
      return;
    }
    
    cleanup();
    setShowSummary(true);
  };

  const cleanup = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    if (watchId.current) {
      watchId.current.remove();
      watchId.current = null;
    }
  };

  const saveActivity = async () => {
    setSaving(true);
    const userId = getCurrentUserId;
    
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to save activities.');
      setSaving(false);
      return;
    }

    try {
      const durationMinutes = Math.floor(duration / 60000);
      const distanceKm = distance / 1000;
      
      const result = await FirebaseService.saveActivity(userId, {
        type: activityType,
        distanceKm: distanceKm,
        durationMinutes: durationMinutes,
        route: routePath.length > 0 ? routePath : null,
      });

      if (result.success) {
        setXpReward({
          xp: result.xpGained,
          leveledUp: result.leveledUp,
          newLevel: result.newLevel,
          oldLevel: result.oldLevel
        });
        
        // Reload user data
        if (loadUserData) {
          await loadUserData(userId);
        }
      } else {
        Alert.alert('Error', 'Failed to save activity. Please try again.');
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      Alert.alert('Error', 'An error occurred while saving your activity.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    setShowSummary(false);
    navigation.navigate('Main', { screen: 'Home' });
  };

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculatePace = () => {
    if (distance === 0 || duration === 0) return '0:00';
    const kmDistance = distance / 1000;
    const minutesDuration = duration / 60000;
    const paceMinPerKm = minutesDuration / kmDistance;
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.floor((paceMinPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getActivityEmoji = () => {
    const emojiMap = {
      run: '🏃',
      walk: '🚶',
      cycle: '🚴',
      bike: '🚴',
      hike: '🥾',
    };
    return emojiMap[activityType] || '🏃';
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          showsUserLocation
          followsUserLocation
          region={location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          } : undefined}
        >
          {/* Removed UrlTile - using native map provider (Google Maps on Android, Apple Maps on iOS) for better reliability */}
          {routePath.length > 1 && (
              <Polyline
                coordinates={routePath}
                strokeColor={'#8e44ad'} // Violet color
                strokeWidth={6}
              />
          )}
          {routePath.length > 0 && (
            <Marker coordinate={routePath[0]} title="Start" pinColor={theme.colors.gold} />
          )}
        </MapView>

        {/* Top Stats Overlay */}
        <View style={styles.topOverlay}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{(distance / 1000).toFixed(2)}</Text>
            <Text style={styles.statUnit}>km</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statUnit}>time</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pace</Text>
            <Text style={styles.statValue}>{calculatePace()}</Text>
            <Text style={styles.statUnit}>min/km</Text>
          </View>
        </View>
      </View>

  {/* Bottom Control Panel */}
  <View style={[styles.controlPanel, { paddingBottom: 20 + insets.bottom }]}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityEmoji}>{getActivityEmoji()}</Text>
          <Text style={styles.activityTitle}>{activityType.charAt(0).toUpperCase() + activityType.slice(1)}</Text>
        </View>

        <View style={styles.mainStats}>
          <View style={styles.mainStatItem}>
            <Text style={styles.mainStatValue}>{Math.max(0, speed * 3.6).toFixed(1)}</Text>
            <Text style={styles.mainStatLabel}>km/h</Text>
          </View>
          <View style={[styles.mainStatItem, styles.mainStatHighlight]}>
            <Text style={[styles.mainStatValue, styles.mainStatValueLarge]}>{(distance / 1000).toFixed(2)}</Text>
            <Text style={styles.mainStatLabel}>kilometers</Text>
          </View>
          <View style={styles.mainStatItem}>
            <Text style={styles.mainStatValue}>{Math.floor((distance / 1000) * 20)}</Text>
            <Text style={styles.mainStatLabel}>XP Est.</Text>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.buttonRow}>
          {!isTracking ? (
            <TouchableOpacity style={styles.startButton} onPress={startTracking}>
              <Text style={styles.startButtonText}>Start Activity</Text>
            </TouchableOpacity>
          ) : (
            <>
              {!isPaused ? (
                <>
                  <TouchableOpacity style={styles.pauseButton} onPress={pauseTracking}>
                    <Text style={styles.pauseButtonText}>⏸ Pause</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
                    <Text style={styles.stopButtonText}>⏹ Finish</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.resumeButton} onPress={resumeTracking}>
                    <Text style={styles.resumeButtonText}>▶ Resume</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
                    <Text style={styles.stopButtonText}>⏹ Finish</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </View>

        {!isTracking && (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Modal */}
      <Modal visible={showSummary} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Activity Complete! 🎉</Text>
            
            {xpReward ? (
              <View style={styles.rewardSection}>
                {xpReward.leveledUp && (
                  <View style={styles.levelUpBanner}>
                    <Text style={styles.levelUpText}>🎊 LEVEL UP! 🎊</Text>
                    <Text style={styles.levelUpDetail}>
                      Level {xpReward.oldLevel} → {xpReward.newLevel}
                    </Text>
                  </View>
                )}
                <View style={styles.xpBadge}>
                  <Text style={styles.xpValue}>+{xpReward.xp}</Text>
                  <Text style={styles.xpLabel}>XP Earned</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.summaryStats}>
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatLabel}>Distance</Text>
                <Text style={styles.summaryStatValue}>{(distance / 1000).toFixed(2)} km</Text>
              </View>
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatLabel}>Duration</Text>
                <Text style={styles.summaryStatValue}>{formatDuration(duration)}</Text>
              </View>
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatLabel}>Avg Pace</Text>
                <Text style={styles.summaryStatValue}>{calculatePace()} /km</Text>
              </View>
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatLabel}>Avg Speed</Text>
                <Text style={styles.summaryStatValue}>{((distance / 1000) / (duration / 3600000)).toFixed(2)} km/h</Text>
              </View>
            </View>

            {!xpReward ? (
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={saveActivity}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Activity</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                <Text style={styles.finishButtonText}>Return to Home</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.dark 
  },
  mapWrap: {
    width: width,
    height: height * 0.55,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  
  // Top Overlay Stats
  topOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 13, 18, 0.9)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  statUnit: {
    color: theme.colors.muted,
    fontSize: 9,
    fontWeight: '600',
  },

  // Control Panel
  controlPanel: {
    flex: 1,
    backgroundColor: theme.colors.dark,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  activityEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  activityTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Main Stats
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  mainStatItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mainStatHighlight: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderColor: theme.colors.accent,
    borderWidth: 2,
  },
  mainStatValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  mainStatValueLarge: {
    fontSize: 28,
    color: theme.colors.accent,
  },
  mainStatLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  startButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#f39c12',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  summaryCard: {
    backgroundColor: theme.colors.dark,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  summaryTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
  },
  rewardSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  levelUpBanner: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  levelUpText: {
    color: '#1a0f0a',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  levelUpDetail: {
    color: '#1a0f0a',
    fontSize: 14,
    fontWeight: '700',
  },
  xpBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: 'center',
  },
  xpValue: {
    color: theme.colors.accent,
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 4,
  },
  xpLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  summaryStats: {
    marginBottom: 20,
  },
  summaryStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  summaryStatLabel: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryStatValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  finishButton: {
    backgroundColor: theme.colors.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#1a0f0a',
    fontSize: 18,
    fontWeight: '900',
  },
});
