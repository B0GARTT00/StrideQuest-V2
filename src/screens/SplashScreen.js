import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { theme } from '../theme/ThemeProvider';

export default function SplashScreen({ navigation, disableTap = false }) {
  // animated values for a quick scale + fade out on tap
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const pulseAnimRef = useRef(null);
  
  // Glitch effect states
  const glitchOffset1 = useRef(new Animated.Value(0)).current;
  const glitchOffset2 = useRef(new Animated.Value(0)).current;
  const glitchOpacity = useRef(new Animated.Value(0)).current;
  const [isGlitching, setIsGlitching] = useState(false);

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

  // Glitch animation function
  const triggerGlitch = () => {
    setIsGlitching(true);
    
    Animated.sequence([
      // First glitch
      Animated.parallel([
        Animated.timing(glitchOffset1, {
          toValue: Math.random() > 0.5 ? 5 : -5,
          duration: 120,
          useNativeDriver: true
        }),
        Animated.timing(glitchOffset2, {
          toValue: Math.random() > 0.5 ? -8 : 8,
          duration: 120,
          useNativeDriver: true
        }),
        Animated.timing(glitchOpacity, {
          toValue: 0.8,
          duration: 120,
          useNativeDriver: true
        })
      ]),
      // Reset
      Animated.parallel([
        Animated.timing(glitchOffset1, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(glitchOffset2, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(glitchOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true
        })
      ]),
      // Second quick glitch
      Animated.parallel([
        Animated.timing(glitchOffset1, {
          toValue: Math.random() > 0.5 ? -6 : 6,
          duration: 80,
          useNativeDriver: true
        }),
        Animated.timing(glitchOffset2, {
          toValue: Math.random() > 0.5 ? 7 : -7,
          duration: 80,
          useNativeDriver: true
        }),
        Animated.timing(glitchOpacity, {
          toValue: 0.6,
          duration: 80,
          useNativeDriver: true
        })
      ]),
      // Final reset
      Animated.parallel([
        Animated.timing(glitchOffset1, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true
        }),
        Animated.timing(glitchOffset2, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true
        }),
        Animated.timing(glitchOpacity, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true
        })
      ])
    ]).start(() => setIsGlitching(false));
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

    // Random glitch effect every 2-4 seconds
    const glitchInterval = setInterval(() => {
      if (!isGlitching) {
        triggerGlitch();
      }
    }, Math.random() * 2000 + 2000); // Random between 2-4 seconds

    return () => {
      if (pulseAnimRef.current) {
        pulseAnimRef.current.stop();
        pulseAnimRef.current = null;
      }
      clearInterval(glitchInterval);
    };
  }, [scale, isGlitching]);

  return (
    <TouchableOpacity style={styles.bg} activeOpacity={1} onPress={handleTap}>
      <Animated.View style={[styles.center, { transform: [{ scale }], opacity }]}>
        {/* Logo Image */}
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        
        {/* Title Container with Glitch Effect */}
        <View style={styles.titleContainer}>
          {/* Main Title */}
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>Stride Quest</Text>
          
          {/* Glitch Layer 1 - Magenta channel offset */}
          <Animated.Text 
            style={[
              styles.title, 
              styles.glitchLayer1,
              { 
                transform: [{ translateX: glitchOffset1 }],
                opacity: glitchOpacity
              }
            ]} 
            numberOfLines={1} 
            adjustsFontSizeToFit 
            minimumFontScale={0.5}
            pointerEvents="none"
          >
            Stride Quest
          </Animated.Text>
          
          {/* Glitch Layer 2 - Cyan channel offset */}
          <Animated.Text 
            style={[
              styles.title, 
              styles.glitchLayer2,
              { 
                transform: [{ translateX: glitchOffset2 }],
                opacity: glitchOpacity
              }
            ]} 
            numberOfLines={1} 
            adjustsFontSizeToFit 
            minimumFontScale={0.5}
            pointerEvents="none"
          >
            Stride Quest
          </Animated.Text>
        </View>
        
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
  titleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 64,
    letterSpacing: 6,
    textTransform: 'uppercase',
    fontFamily: 'SoloLevel', // Eternal.ttf font
  },
  glitchLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    color: '#ff00ff', // Magenta/Pink for RGB split effect
    mixBlendMode: 'screen',
  },
  glitchLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    color: '#00ffff', // Cyan for RGB split effect
    mixBlendMode: 'screen',
  },
  subtitle: {
    color: theme.colors.gold,
    marginTop: 8,
    fontWeight: '700'
  }
  ,
  tapHint: { color: '#cfd8e9', marginTop: 8, fontSize: 12 }
});
