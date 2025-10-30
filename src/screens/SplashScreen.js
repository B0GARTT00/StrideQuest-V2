import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { theme } from '../theme/ThemeProvider';

export default function SplashScreen({ navigation, disableTap = false }) {
  // animated values for a quick scale + fade out on tap
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const pulseAnimRef = useRef(null);

  const handleTap = () => {
    if (disableTap) return;
    // stop any pulsing animation, then play a short scale+fade animation, then navigate
    if (pulseAnimRef.current) {
      pulseAnimRef.current.stop();
      pulseAnimRef.current = null;
    }

    Animated.parallel([
      Animated.timing(scale, { toValue: 0.94, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start(() => {
      if (navigation && navigation.replace) navigation.replace('Login');
    });
  };

  // start a gentle pulse on mount
  useEffect(() => {
    // smoother subtle pulse: 1 -> 1.02 -> 1 with easing to avoid abrupt jumps
    pulseAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.02,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    pulseAnimRef.current.start();

    return () => {
      if (pulseAnimRef.current) {
        pulseAnimRef.current.stop();
        pulseAnimRef.current = null;
      }
    };
  }, [scale]);

  return (
    <TouchableOpacity style={styles.bg} activeOpacity={1} onPress={handleTap}>
      <Animated.View style={[styles.center, { transform: [{ scale }], opacity }]}>
        {/* Logo Image */}
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>Stride Quest</Text>
        {!disableTap && <Text style={styles.tapHint}>Tap to continue</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a0f2e'
  },
  // glow removed to keep a uniform background color
  center: { alignItems: 'center' },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    borderRadius: 75, // Makes it circular (half of width/height)
    overflow: 'hidden', // Crops to circle shape
  },
  title: {
    color: '#fff',
    fontSize: 64,
    letterSpacing: 6,
    textTransform: 'uppercase',
    fontFamily: 'SoloLevel', // Eternal.ttf font
  },
  subtitle: {
    color: theme.colors.gold,
    marginTop: 8,
    fontWeight: '700'
  }
  ,
  tapHint: { color: '#cfd8e9', marginTop: 8, fontSize: 12 }
});
