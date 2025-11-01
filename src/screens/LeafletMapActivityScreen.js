import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { theme } from '../theme/ThemeProvider';
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
      document.addEventListener('message', (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'loc') {
            const { latitude, longitude } = msg.coords;
            if (!startMarker) setStart(latitude, longitude);
            addPoint(latitude, longitude);
            fit(latitude, longitude);
          }
        } catch (err) {}
      });
    </script>
  </body>
  </html>`;

export default function LeafletMapActivityScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const activityType = route?.params?.preset?.type || 'run';
  const webRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [watcher, setWatcher] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [routePath, setRoutePath] = useState([]);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);

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
    };
  }, []);

  const sendToWeb = (obj) => {
    try {
      webRef.current?.postMessage(JSON.stringify(obj));
    } catch {}
  };

  const startTracking = async () => {
    setIsTracking(true);
    setIsPaused(false);
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
  };

  const resumeTracking = () => startTracking();

  const stopTracking = () => {
    if (watcher) {
      watcher.remove();
      setWatcher(null);
    }
    setIsTracking(false);
  };

  const getActivityEmoji = () => ({ run: '🏃', walk: '🚶', cycle: '🚴', hike: '🥾' }[activityType] || '🏃');

  return (
    <View style={styles.container}>
      <View style={styles.mapWrap}>
        {location ? (
          <WebView
            ref={webRef}
            source={{ html: leafletHTML }}
            style={styles.map}
            originWhitelist={["*"]}
            javaScriptEnabled
            domStorageEnabled
            geolocationEnabled={false}
            onHttpError={(e) => console.warn('WebView http error', e.nativeEvent?.statusCode)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.dark },
  mapWrap: { width, height: height * 0.55 },
  map: { flex: 1 },
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
});
