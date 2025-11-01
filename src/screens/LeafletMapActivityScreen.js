import React, { useEffect, useRef, useState, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { theme } from '../theme/ThemeProvider';
import { AppContext } from '../context/AppState';
import * as FirebaseService from '../services/FirebaseService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      html, body, #map { height: 100%; margin: 0; background: #0f0d12; }
      .leaflet-control-attribution { display: none; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const map = L.map('map', { zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);
  let poly = null;
  let startMarker = null;
  let currentMarker = null;
      function ensurePoly() {
        if (!poly) {
          poly = L.polyline([], { color: '#8e44ad', weight: 5 }).addTo(map);
        }
      }
      function setStart(lat, lng) {
        if (!startMarker) {
          startMarker = L.marker([lat, lng]).addTo(map).bindPopup('Start');
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
              currentMarker = L.circleMarker([latitude, longitude], { radius: 6, color: '#ffd166', fillColor: '#ffd166', fillOpacity: 1, weight: 2 }).addTo(map);
            } else {
              currentMarker.setLatLng([latitude, longitude]);
            }
          } else if (msg.type === 'center') {
            const { latitude, longitude } = msg.coords;
            fit(latitude, longitude);
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

  useEffect(() => {
    // Request location permission on mount
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed for tracking.');
        navigation.goBack();
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

  // Center the map on initial location as soon as WebView is ready
  useEffect(() => {
    if (webReady && location) {
      sendToWeb({ type: 'center', coords: { latitude: location.latitude, longitude: location.longitude } });
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
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude, speed: s } = loc.coords;
        setLocation(loc.coords);
        setSpeed(Math.max(0, s || 0));
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

  const resumeTracking = () => startTracking();

  const stopTracking = () => {
    if (distance < 10) {
      Alert.alert('Too Short', 'Your activity is too short to save. Walk at least 10 meters.');
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
      Alert.alert('Error', 'You must be logged in to save activities.');
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
        Alert.alert('Error', 'Failed to save activity. Please try again.');
      }
    } catch (e) {
      console.error('Error saving activity:', e);
      Alert.alert('Error', 'An error occurred while saving your activity.');
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.dark },
  mapWrap: { width, height: height * 0.55 },
  map: { flex: 1 },
  statsOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: { color: theme.colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { color: theme.colors.text, fontSize: 14, fontWeight: '900' },
  controlPanel: { flex: 1, backgroundColor: theme.colors.dark, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  activityEmoji: { fontSize: 32, marginRight: 12 },
  activityTitle: { color: theme.colors.text, fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  mainStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  mainStatItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  mainStatHighlight: { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: theme.colors.accent, borderWidth: 2 },
  mainStatValue: { color: theme.colors.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  mainStatValueLarge: { fontSize: 28, color: theme.colors.accent },
  mainStatLabel: { color: theme.colors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  startButton: { flex: 1, backgroundColor: theme.colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 4 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  pauseButton: { flex: 1, backgroundColor: '#f39c12', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  pauseButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  resumeButton: { flex: 1, backgroundColor: '#27ae60', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  resumeButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  stopButton: { flex: 1, backgroundColor: '#e74c3c', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  stopButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  backButton: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  backButtonText: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },

  // Modal (matching native screen styling)
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
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
