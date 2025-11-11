import React, { useEffect, useRef, useState, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Platform, ScrollView, Animated, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { theme } from '../theme/ThemeProvider';
import { AppContext } from '../context/AppState';
import * as FirebaseService from '../services/OfflineFirebaseService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Small helper for meters between two coords
function haversineDistance(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const c = 2 * Math.atan2(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2), Math.sqrt(1 - (Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2)));
  return R * c;
}

const leafletHTML = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="initial-scale=1, maximum-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <style>
      html, body, #map { height: 100%; margin: 0; background: #06214a; }
      .leaflet-control-attribution { display: none; }
      .leaflet-container { background: #06214a; }
      .leaflet-tile-pane { 
        filter: grayscale(20%) contrast(110%) brightness(85%) hue-rotate(240deg) saturate(140%);
      }
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(199, 125, 255, 0.9); }
        50% { box-shadow: 0 0 0 15px rgba(199, 125, 255, 0); }
        100% { box-shadow: 0 0 0 0 rgba(199, 125, 255, 0); }
      }
      .pulse-marker {
        animation: pulse 2s infinite;
      }
      .leaflet-popup-content-wrapper {
        background: #1a0f2e;
        color: #e0aaff;
        border: 2px solid #c77dff;
        box-shadow: 0 0 15px rgba(199, 125, 255, 0.6);
        border-radius: 8px;
      }
      .leaflet-popup-tip {
        background: #1a0f2e;
        border: 2px solid #c77dff;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const map = L.map('map', { zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'rpg-tiles'
      }).addTo(map);
      let poly = null;
      let startMarker = null;
      let currentMarker = null;
      
      // Custom start marker icon
      const startIcon = L.divIcon({
        html: '<div style="background: #ffd166; border: 3px solid #ffe89e; width: 24px; height: 24px; border-radius: 50%; box-shadow: 0 0 15px rgba(255, 209, 102, 0.8);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        className: 'custom-start-marker'
      });
      
      function ensurePoly() {
        if (!poly) {
          poly = L.polyline([], { 
            color: '#c77dff', 
            weight: 6,
            opacity: 0.9,
            dashArray: '10, 5',
            lineCap: 'round',
            lineJoin: 'round',
            shadowBlur: 15,
            shadowColor: 'rgba(199, 125, 255, 0.8)'
          }).addTo(map);
        }
      }
      function setStart(lat, lng) {
        if (!startMarker) {
          startMarker = L.marker([lat, lng], { icon: startIcon })
            .addTo(map)
            .bindPopup('<strong style="color: #e0aaff; font-family: monospace; letter-spacing: 1px;">⚔️ START ⚔️</strong>');
        }
      }
      function addPoint(lat, lng) {
        ensurePoly();
        poly.addLatLng([lat, lng]);
      }
      function fit(lat, lng) {
        map.setView([lat, lng], 16);
      }
      function handleMessageData(data) {
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'loc') {
            const { latitude, longitude } = msg.coords;
            if (!startMarker) setStart(latitude, longitude);
            addPoint(latitude, longitude);
            fit(latitude, longitude);
            if (!currentMarker) {
              // Create a larger, more visible current position marker with glow
              currentMarker = L.circleMarker([latitude, longitude], { 
                radius: 10, 
                color: '#ffffff', 
                fillColor: '#6366f1', 
                fillOpacity: 1, 
                weight: 3,
                className: 'pulse-marker'
              }).addTo(map);
            } else {
              currentMarker.setLatLng([latitude, longitude]);
            }
          } else if (msg.type === 'center') {
            const { latitude, longitude } = msg.coords;
            fit(latitude, longitude);
          } else if (msg.type === 'showCurrent') {
            const { latitude, longitude } = msg.coords;
            if (!currentMarker) {
              // Create current position marker before tracking starts
              currentMarker = L.circleMarker([latitude, longitude], { 
                radius: 10, 
                color: '#ffffff', 
                fillColor: '#6366f1', 
                fillOpacity: 1, 
                weight: 3,
                className: 'pulse-marker'
              }).addTo(map);
            } else {
              currentMarker.setLatLng([latitude, longitude]);
            }
          }
        } catch (err) {}
      }

      document.addEventListener('message', (e) => {
        try {
          handleMessageData(e.data);
        } catch (err) {}
      });

      // For iOS/Android modern WebView bridge
      window.addEventListener('message', (e) => {
        try { handleMessageData(e.data); } catch (err) {}
      });

      // Notify React Native that the WebView content is ready
      setTimeout(() => {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }
      }, 0);
    </script>
  </body>
  </html>`;

export default function LeafletMapActivityScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const activityType = route?.params?.preset?.type || 'run';
  const webRef = useRef(null);
  const { getCurrentUserId, loadUserData } = useContext(AppContext);
  const [webReady, setWebReady] = useState(false);

  const [location, setLocation] = useState(null);
  const [watcher, setWatcher] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [routePath, setRoutePath] = useState([]);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerId, setTimerId] = useState(null);
  const [baseElapsed, setBaseElapsed] = useState(0);
  const startTimeRef = useRef(null);
  const [showSummary, setShowSummary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [xpReward, setXpReward] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const longPressTimerRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [showTooShortModal, setShowTooShortModal] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [showTooShortSaveModal, setShowTooShortSaveModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEndedModal, setShowEndedModal] = useState(false);
  // Filtering & smoothing helpers for accurate tracking
  const lastAcceptedRef = useRef(null); // { coord: { latitude, longitude }, t: number }
  const speedEmaRef = useRef(0); // exponential moving average of speed (m/s)

  useEffect(() => {
    // Request location permission on mount
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Location permission is needed for tracking.');
        setShowErrorModal(true);
        setTimeout(() => navigation.goBack(), 2000);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
    })();

    return () => {
      if (watcher) watcher.remove();
      if (timerId) clearInterval(timerId);
    };
  }, []);

  // Center the map on initial location as soon as WebView is ready and show current position marker
  useEffect(() => {
    if (webReady && location) {
      sendToWeb({ type: 'center', coords: { latitude: location.latitude, longitude: location.longitude } });
      // Also show the current position marker immediately
      sendToWeb({ type: 'showCurrent', coords: { latitude: location.latitude, longitude: location.longitude } });
    }
  }, [webReady, location]);

  const sendToWeb = (obj) => {
    try {
      webRef.current?.postMessage(JSON.stringify(obj));
    } catch {}
  };

  const startTracking = async () => {
    setIsTracking(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    // start ticking timer
    const id = setInterval(() => {
      setElapsedMs(baseElapsed + (Date.now() - (startTimeRef.current || Date.now())));
    }, 1000);
    setTimerId(id);
    // Initialize last accepted point with current known location (if any)
    if (location?.latitude && location?.longitude) {
      lastAcceptedRef.current = {
        coord: { latitude: location.latitude, longitude: location.longitude },
        t: Date.now(),
      };
    }

    const highAccuracy = Location.Accuracy.BestForNavigation ?? Location.Accuracy.High;
    const sub = await Location.watchPositionAsync(
      {
        accuracy: highAccuracy,
        timeInterval: 1000,
        distanceInterval: 5,
        mayShowUserSettingsDialog: true,
      },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        const now = Date.now();
        const acc = typeof loc.coords.accuracy === 'number' ? loc.coords.accuracy : null; // meters
        const isAccurate = acc === null || acc <= 30; // ignore low-accuracy fixes (>30m)

        let accept = false;
        let segSpeed = 0; // m/s computed from distance/time as fallback
        const last = lastAcceptedRef.current;
        if (!last) {
          accept = isAccurate;
        } else {
          const dt = Math.max(1, now - last.t) / 1000; // seconds
          const segDist = haversineDistance(last.coord, { latitude, longitude }); // meters
          // ignore micro-drift
          if (segDist >= 1) {
            segSpeed = segDist / dt; // m/s
            const activityMax = (route?.params?.preset?.type || activityType) === 'cycle' ? 20 : 8; // 72 km/h for cycle, 28.8 km/h others
            if (segSpeed <= activityMax && isAccurate) {
              accept = true;
            }
          }
        }

        if (!accept) {
          // Still update displayed last known location for UI centering if needed
          setLocation(loc.coords);
          return; // do not add to path/distance
        }

        // Accept this point: update refs and state
        lastAcceptedRef.current = { coord: { latitude, longitude }, t: now };
        setLocation(loc.coords);

        // Smooth speed: prefer sensor speed, fallback to segment speed
        const sensorSpeed = (typeof loc.coords.speed === 'number' && loc.coords.speed >= 0) ? loc.coords.speed : null;
        const rawSpeed = sensorSpeed !== null ? sensorSpeed : segSpeed;
        const ema = 0.7 * speedEmaRef.current + 0.3 * rawSpeed;
        speedEmaRef.current = ema;
        setSpeed(Math.max(0, ema));

        setRoutePath((prev) => {
          const next = [...prev, { latitude, longitude }];
          if (next.length > 1) {
            const a = next[next.length - 2];
            const b = next[next.length - 1];
            setDistance((d) => d + haversineDistance(a, b));
          }
          return next;
        });

        sendToWeb({ type: 'loc', coords: { latitude, longitude } });
      }
    );
    setWatcher(sub);
  };

  const pauseTracking = () => {
    if (isLocked) {
      setShowLockedModal(true);
      return;
    }
    setIsPaused(true);
    if (watcher) {
      watcher.remove();
      setWatcher(null);
    }
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
    if (startTimeRef.current) {
      setBaseElapsed(baseElapsed + (Date.now() - startTimeRef.current));
      startTimeRef.current = null;
    }
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  const handleFinishPressIn = () => {
    // Start long press timer and animation
    setLongPressProgress(0);
    progressAnim.setValue(0);
    
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    let progress = 0;
    longPressTimerRef.current = setInterval(() => {
      progress += 0.1;
      setLongPressProgress(progress);
      
      if (progress >= 1) {
        handleFinishComplete();
      }
    }, 200);
  };

  const handleFinishPressOut = () => {
    // Cancel long press
    if (longPressTimerRef.current) {
      clearInterval(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    progressAnim.stopAnimation();
    progressAnim.setValue(0);
    setLongPressProgress(0);
  };

  const handleFinishComplete = () => {
    // Clean up timer
    if (longPressTimerRef.current) {
      clearInterval(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    progressAnim.setValue(0);
    setLongPressProgress(0);

    if (distance < 100) {
      // Show a custom modal instead of an alert so the UI looks consistent
      setShowTooShortModal(true);
      return;
    }

    stopTracking();
  };

  const endWithoutXP = () => {
    if (watcher) {
      watcher.remove();
      setWatcher(null);
    }
    setIsTracking(false);
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
    
    setShowTooShortModal(false);
    setShowEndedModal(true);
  };

  const resumeTracking = () => startTracking();

  const stopTracking = () => {
    if (distance < 10) {
      setShowTooShortSaveModal(true);
      return;
    }
    if (watcher) {
      watcher.remove();
      setWatcher(null); 
    }
    setIsTracking(false);
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
    setShowSummary(true);
  };

  const saveActivity = async () => {
    setSaving(true);
    const userId = getCurrentUserId;
    if (!userId) {
      setErrorMessage('You must be logged in to save activities.');
      setShowErrorModal(true);
      setSaving(false);
      return;
    }
    try {
      const durationMinutes = Math.floor(elapsedMs / 60000);
      const distanceKm = distance / 1000;
      const result = await FirebaseService.saveActivity(userId, {
        type: activityType,
        distanceKm,
        durationMinutes,
        route: routePath.length > 0 ? routePath : null,
      });
      if (result.success) {
        setXpReward({
          xp: result.xpGained,
          leveledUp: result.leveledUp,
          newLevel: result.newLevel,
          oldLevel: result.oldLevel,
        });
        if (loadUserData) await loadUserData(userId);
      } else {
        setErrorMessage('Failed to save activity. Please try again.');
        setShowErrorModal(true);
      }
    } catch (e) {
      console.error('Error saving activity:', e);
      setErrorMessage('An error occurred while saving your activity.');
      setShowErrorModal(true);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    setShowSummary(false);
    navigation.navigate('Main', { screen: 'Home' });
  };

  const getActivityEmoji = () => ({ run: '🏃', walk: '🚶', cycle: '🚴', hike: '🥾' }[activityType] || '🏃');

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        {/* Stats overlay above the map */}
        <View style={styles.statsOverlay} pointerEvents="none">
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{(distance / 1000).toFixed(2)} km</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formatTime(elapsedMs)}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Pace</Text>
            <Text style={styles.statValue}>{formatPace(elapsedMs, distance)}</Text>
          </View>
        </View>
        {location ? (
          <WebView
            ref={webRef}
            source={{ html: leafletHTML }}
            style={styles.map}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            geolocationEnabled={false}
            onLoadEnd={() => setWebReady(true)}
            onHttpError={(e) => console.warn('WebView http error', e.nativeEvent?.statusCode)}
            onMessage={(e) => {
              try {
                const msg = JSON.parse(e.nativeEvent.data);
                if (msg.type === 'ready') {
                  setWebReady(true);
                }
              } catch (_) {}
            }}
          />
        ) : (
          <View style={[styles.map, { alignItems: 'center', justifyContent: 'center' }]}> 
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Getting your location…</Text>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.controlPanel}
        contentContainerStyle={{ 
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: Math.max(120, 80 + insets.bottom),
        }}
        showsVerticalScrollIndicator={false}
      >        
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

        <View style={styles.buttonRow}>
          {!isTracking ? (
            <TouchableOpacity style={styles.startButton} onPress={startTracking}>
              <MaterialCommunityIcons name="play" size={40} color="#1a0f2e" />
              <Text style={styles.startButtonText}>Start Activity</Text>
            </TouchableOpacity>
          ) : !isPaused ? (
            // Running state - show only pause with lock
            <View style={styles.pauseWrapper}>
              <TouchableOpacity 
                style={[styles.circleButton, styles.pauseButton, isLocked && styles.pauseButtonLocked]}
                onPress={pauseTracking}
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
            // Paused state - show play and finish
            <View style={styles.pausedButtonsWrapper}>
              <TouchableOpacity 
                style={[styles.circleButton, styles.playButton]}
                onPress={resumeTracking}
              >
                <MaterialCommunityIcons 
                  name="play" 
                  size={32} 
                  color="#fff" 
                />
              </TouchableOpacity>
              
              <View style={styles.finishButtonWrapper}>
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
                  onPressIn={handleFinishPressIn}
                  onPressOut={handleFinishPressOut}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons 
                    name="stop" 
                    size={32} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        
        {isTracking && !isPaused && (
          <Text style={styles.tipText}>
            💡 {isLocked ? 'Unlock to pause' : 'Lock prevents accidental pause'}
          </Text>
        )}
        {isPaused && (
          <Text style={styles.tipText}>
            💡 Hold Finish for 2 seconds to complete activity
          </Text>
        )}

        {!isTracking && (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Summary Modal */}
      {showSummary && (
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
                <Text style={styles.summaryStatValue}>{formatTime(elapsedMs)}</Text>
              </View>
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatLabel}>Avg Pace</Text>
                <Text style={styles.summaryStatValue}>{formatPace(elapsedMs, distance)} /km</Text>
              </View>
              <View style={styles.summaryStatRow}>
                <Text style={styles.summaryStatLabel}>Avg Speed</Text>
                <Text style={styles.summaryStatValue}>{((distance / 1000) / (elapsedMs / 3600000)).toFixed(2)} km/h</Text>
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
      )}

      {/* Too-short activity modal (replaces previous Alert) */}
      {showTooShortModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.tooShortCard}>
            <Text style={styles.tooShortTitle}>Activity Too Short</Text>
            <Text style={styles.tooShortText}>
              You have not reached the minimum distance of 100 meters to earn XP.
            </Text>

            <View style={styles.tooShortStats}>
              <Text style={styles.tooShortStatLabel}>Distance</Text>
              <Text style={styles.tooShortStatValue}>{(distance / 1000).toFixed(3)} km</Text>
            </View>
            <View style={styles.tooShortButtons}>
              <TouchableOpacity
                style={[styles.tooShortButton, styles.tooShortButtonCancel]}
                onPress={() => setShowTooShortModal(false)}
              >
                <Text style={styles.tooShortButtonText}>Continue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tooShortButton, styles.tooShortButtonDestructive]}
                onPress={() => {
                  setShowTooShortModal(false);
                  endWithoutXP();
                }}
              >
                <Text style={styles.tooShortButtonText}>End Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Locked button modal */}
      {showLockedModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>🔒 Button Locked</Text>
            <Text style={styles.alertText}>
              Please unlock the Pause button to pause your activity.
            </Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setShowLockedModal(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Too short to save modal */}
      {showTooShortSaveModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Too Short</Text>
            <Text style={styles.alertText}>
              Your activity is too short to save. Walk at least 10 meters.
            </Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setShowTooShortSaveModal(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error modal */}
      {showErrorModal && (
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
      )}

      {/* Activity ended modal */}
      {showEndedModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Activity Ended</Text>
            <Text style={styles.alertText}>
              Distance: {(distance / 1000).toFixed(2)} km{'\n'}
              Duration: {formatTime(elapsedMs)}{'\n\n'}
              No XP earned (minimum 100m required)
            </Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => {
                setShowEndedModal(false);
                navigation.navigate('Main', { screen: 'Home' });
              }}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06214a' },
  mapWrap: { width, height: height * 0.55 },
  map: { flex: 1 },
  statsOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(26, 15, 46, 0.92)',
    borderWidth: 2,
    borderColor: '#c77dff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  statLabel: { 
    color: '#d4a5ff', 
    fontSize: 10, 
    fontWeight: '800', 
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '900',
    textShadowColor: '#c77dff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  controlPanel: { 
    flex: 1, 
    backgroundColor: '#1a0f2e', 
    borderTopWidth: 3,
    borderTopColor: '#c77dff',
  },
  activityHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(199, 125, 255, 0.3)',
  },
  activityEmoji: { fontSize: 36, marginRight: 12 },
  activityTitle: { 
    color: '#e0aaff', 
    fontSize: 24, 
    fontWeight: '900', 
    letterSpacing: 3,
    fontFamily: 'SoloLevel',
    textShadowColor: '#c77dff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  mainStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  mainStatItem: { 
    flex: 1, 
    backgroundColor: 'rgba(199, 125, 255, 0.1)', 
    borderRadius: 8, 
    padding: 16, 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: 'rgba(199, 125, 255, 0.3)',
  },
  mainStatHighlight: { 
    backgroundColor: 'rgba(199, 125, 255, 0.15)', 
    borderColor: '#c77dff', 
    borderWidth: 2,
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  mainStatValue: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '900', 
    marginBottom: 4,
    textShadowColor: '#c77dff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  mainStatValueLarge: { 
    fontSize: 28, 
    color: '#e0aaff',
  },
  mainStatLabel: { 
    color: '#d4a5ff', 
    fontSize: 11, 
    fontWeight: '800', 
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedButtonsWrapper: {
    flexDirection: 'row',
    gap: 50,
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#c77dff', 
    paddingVertical: 16,
    paddingHorizontal: 24, 
    borderRadius: 8, 
    borderWidth: 2,
    borderColor: '#e0aaff',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  startButtonText: { 
    color: '#1a0f2e', 
    fontSize: 18, 
    fontWeight: '900', 
    letterSpacing: 2,
  },
  pauseWrapper: {
    position: 'relative',
    alignItems: 'center',
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
  finishButtonWrapper: {
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
  tipText: {
    color: 'rgba(224, 170, 255, 0.7)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  pauseButtonText: { 
    color: '#1a0f2e', 
    fontSize: 16, 
    fontWeight: '900',
    letterSpacing: 1,
  },
  resumeButton: { 
    flex: 1, 
    backgroundColor: '#27ae60', 
    paddingVertical: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#58d68d',
  },
  resumeButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '900',
    letterSpacing: 1,
  },
  stopButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '900',
    letterSpacing: 1,
  },
  backButton: { 
    backgroundColor: 'rgba(199, 125, 255, 0.15)', 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#c77dff',
  },
  backButtonText: { 
    color: '#e0aaff', 
    fontSize: 14, 
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Modal (matching status card styling)
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(6, 33, 74, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#1a0f2e',
    borderRadius: 8,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: '#c77dff',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  summaryTitle: {
    color: '#e0aaff',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'SoloLevel',
    letterSpacing: 4,
    textShadowColor: '#c77dff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  rewardSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  levelUpBanner: {
    backgroundColor: '#ffd166',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffe89e',
    shadowColor: '#ffd166',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  levelUpText: {
    color: '#1a0f2e',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 2,
  },
  levelUpDetail: {
    color: '#1a0f2e',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  xpBadge: {
    backgroundColor: 'rgba(199, 125, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c77dff',
    alignItems: 'center',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  xpValue: {
    color: '#e0aaff',
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 4,
    textShadowColor: '#c77dff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  xpLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  summaryStats: {
    marginBottom: 20,
  },
  summaryStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: 'rgba(199, 125, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(199, 125, 255, 0.3)',
  },
  summaryStatLabel: {
    color: '#d4a5ff',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  saveButton: {
    backgroundColor: '#c77dff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0aaff',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  saveButtonText: {
    color: '#1a0f2e',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  finishButton: {
    backgroundColor: '#e0aaff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c77dff',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  finishButtonText: {
    color: '#1a0f2e',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  // Too-short modal styles
  tooShortCard: {
    backgroundColor: '#1a0f2e',
    borderRadius: 8,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 3,
    borderColor: '#ff7d9a',
    alignItems: 'center',
  },
  tooShortTitle: {
    color: '#ffd6e0',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 2,
  },
  tooShortText: {
    color: '#e7cfe6',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  tooShortStats: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,125,154,0.06)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,125,154,0.18)',
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tooShortStatLabel: { color: '#ffd6e0', fontWeight: '800' },
  tooShortStatValue: { color: '#fff', fontWeight: '900' },
  tooShortButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  tooShortButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  tooShortButtonCancel: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.12)'
  },
  tooShortButtonDestructive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444'
  },
  tooShortButtonText: {
    color: '#fff',
    fontWeight: '900',
  },

  // Generic alert modal styles
  alertCard: {
    backgroundColor: '#1a0f2e',
    borderRadius: 8,
    padding: 20,
    width: '85%',
    maxWidth: 360,
    borderWidth: 2,
    borderColor: '#c77dff',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  alertTitle: {
    color: '#e0aaff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1.5,
  },
  alertText: {
    color: '#d4a5ff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  alertButton: {
    backgroundColor: '#c77dff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0aaff',
  },
  alertButtonText: {
    color: '#1a0f2e',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

// Helpers
function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const hh = h > 0 ? `${h}:` : '';
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return `${hh}${mm}:${ss}`;
}

function formatPace(ms, distanceMeters) {
  const km = distanceMeters / 1000;
  if (!km || km <= 0) return '--:-- /km';
  const secPerKm = Math.floor(ms / 1000 / km);
  const min = Math.floor(secPerKm / 60);
  const sec = secPerKm % 60;
  return `${String(min).padStart(1, '0')}:${String(sec).padStart(2, '0')} /km`;
}
