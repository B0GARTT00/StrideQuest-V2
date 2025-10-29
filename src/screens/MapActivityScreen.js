import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Button } from 'react-native';
import MapView, { Polyline, Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';

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
import { theme } from '../theme/ThemeProvider';

const { width, height } = Dimensions.get('window');

export default function MapActivityScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const watchId = useRef(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
      watchId.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        loc => {
          setLocation(loc.coords);
          setSpeed(loc.coords.speed || 0);
          setRoute(prev => {
            const newRoute = [...prev, loc.coords];
            if (newRoute.length > 1) {
              setDistance(
                newRoute.reduce((acc, curr, i, arr) => {
                  if (i === 0) return 0;
                  const prevCoord = arr[i - 1];
                  const d = haversineDistance(
                    { latitude: prevCoord.latitude, longitude: prevCoord.longitude },
                    { latitude: curr.latitude, longitude: curr.longitude }
                  );
                  return acc + d;
                }, 0)
              );
            }
            return newRoute;
          });
        }
      );
    })();
    return () => {
      if (watchId.current) watchId.current.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Activity Tracking</Text>
      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          showsUserLocation
          followsUserLocation
          region={location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.002,
            longitudeDelta: 0.002,
          } : undefined}
        >
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
          {route.length > 1 && (
            <Polyline
              coordinates={route}
              strokeColor={theme.colors.accent}
              strokeWidth={4}
            />
          )}
          {route.length > 0 && (
            <Marker coordinate={route[0]} title="Start" />
          )}
        </MapView>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Distance: {(distance / 1000).toFixed(2)} km</Text>
        <Text style={styles.stat}>Speed: {(speed * 3.6).toFixed(2)} km/h</Text>
      </View>
      <Button title="End Activity" onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Main');
        }
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.dark },
  header: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 8,
  },
  mapWrap: {
    width: width,
    height: height * 0.5,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  map: {
    flex: 1,
  },
  stats: {
    margin: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 12,
  },
  stat: {
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 4,
  },
});
