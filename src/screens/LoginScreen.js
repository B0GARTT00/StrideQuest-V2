import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Animated, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme, globalStyles } from '../theme/ThemeProvider';
import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import FirebaseService from '../services/FirebaseService';
import { GM_ACCOUNT } from '../services/AdminService';
import getAppVersion from '../utils/getAppVersion';
import SessionService from '../services/SessionService';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_EXPO_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '../config/googleSignIn';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);
  const appVersion = getAppVersion();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const passwordRef = useRef();
  const confirmPasswordRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  // Glitch effect states
  const glitchOffset1 = useRef(new Animated.Value(0)).current;
  const glitchOffset2 = useRef(new Animated.Value(0)).current;
  const glitchOpacity = useRef(new Animated.Value(0)).current;
  const [isGlitching, setIsGlitching] = useState(false);

  // Use useIdTokenAuthRequest with all client IDs
  // expo-auth-session will automatically choose the right one based on the platform
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      expoClientId: GOOGLE_EXPO_CLIENT_ID,
    }
  );

  console.log('Auth Request:', request);

  // Handle Google Sign-In response
  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === 'success') {
        console.log('Google Sign-In Success!');
        console.log('Full Response:', JSON.stringify(response, null, 2));
        
        // useIdTokenAuthRequest should provide the ID token in params
        const idToken = response.params?.id_token;
        
        if (idToken) {
          console.log('ID Token received, signing in...');
          await handleGoogleSignInSuccess(idToken);
        } else {
          console.error('No ID token in response. Response params:', response.params);
          setError('Failed to get authentication token from Google');
        }
      } else if (response?.type === 'error') {
        console.error('Google Sign-In Error:', response.error);
        setError(`Google sign-in failed: ${response.error?.message || 'Please try again'}`);
      } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
        console.log('Google Sign-In was cancelled');
      } else if (response) {
        console.log('Unknown response type:', response.type, response);
      }
    };
    
    if (response) {
      handleResponse();
    }
  }, [response]);

  useEffect(() => {
    // Load saved preference and credentials
    loadRememberMePreference();
    loadSavedCredentials();
    
    // Initialize GM account in background
    initializeGMAccount();
  }, []);

  const loadRememberMePreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('rememberMe');
      if (savedPreference !== null) {
        setRememberMe(savedPreference === 'true');
      }
    } catch (error) {
      console.error('Error loading remember me preference:', error);
    }
  };

  const loadSavedCredentials = async () => {
    try {
      const savedRememberMe = await AsyncStorage.getItem('rememberMe');
      if (savedRememberMe === 'true') {
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        const savedPassword = await AsyncStorage.getItem('savedPassword');
        if (savedEmail) {
          setEmail(savedEmail);
        }
        if (savedPassword) {
          setPassword(savedPassword);
        }
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const saveRememberMePreference = async (value) => {
    try {
      await AsyncStorage.setItem('rememberMe', value.toString());
    } catch (error) {
      console.error('Error saving remember me preference:', error);
    }
  };

  // Initialize GM account if it doesn't exist
  const initializeGMAccount = async () => {
    try {
      // Try to sign in as GM first to check if account exists
      try {
        await signInWithEmailAndPassword(auth, GM_ACCOUNT.email, GM_ACCOUNT.password);
        // Account exists, sign out
        await auth.signOut();
      } catch (error) {
        // Account doesn't exist, create it
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          console.log('Creating GM account...');
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            GM_ACCOUNT.email, 
            GM_ACCOUNT.password
          );
          const user = userCredential.user;

          // Create GM profile in Firestore with admin flag
          await FirebaseService.saveUser(user.uid, {
            name: GM_ACCOUNT.displayName,
            email: GM_ACCOUNT.email,
            xp: 0,
            level: 1,
            hasMonarchTitle: false,
            equippedTitle: 'admin',
            isAdmin: true,
            stats: {
              strength: 10,
              agility: 10,
              sense: 10,
              vitality: 10,
              intelligence: 10
            },
            statPoints: 0
          });

          console.log('GM account created successfully');
          // Sign out the GM account
          await auth.signOut();
        }
      }
    } catch (error) {
      console.error('Error initializing GM account:', error);
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Set persistence based on remember me option
      // Note: Firebase Web SDK uses different persistence methods
      // For React Native, Firebase Auth automatically persists by default
      await saveRememberMePreference(rememberMe);
      
      // Save credentials if remember me is checked
      if (rememberMe) {
        await AsyncStorage.setItem('savedEmail', email);
        await AsyncStorage.setItem('savedPassword', password);
      } else {
        await AsyncStorage.removeItem('savedEmail');
        await AsyncStorage.removeItem('savedPassword');
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if this is the GM account
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      // Check if user is banned
      if (userData?.isBanned) {
        // Check if ban has expired
        if (userData.banExpiresAt) {
          const expirationDate = userData.banExpiresAt.toDate ? userData.banExpiresAt.toDate() : new Date(userData.banExpiresAt);
          const now = new Date();
          
          if (now >= expirationDate) {
            // Ban has expired - unban the user and let them in
            await FirebaseService.updateUser(user.uid, {
              isBanned: false,
              banExpired: true,
              banExpiredAt: new Date()
            });
            // Continue with login
          } else {
            // Still banned
            await signOut(auth);
            setError(`Account banned until ${expirationDate.toLocaleString()}. Reason: ${userData.banReason || 'Violation of terms'}`);
            setLoading(false);
            return;
          }
        } else {
          // Permanent ban
          await signOut(auth);
          setError(`Account permanently banned: ${userData.banReason || 'Violation of terms'}`);
          setLoading(false);
          return;
        }
      }
      
      // Create session for this device
      await SessionService.createSession(user.uid);
      
      if (userData?.isAdmin || user.email === 'gamemaster@stridequest.com' || userData?.username === 'GM') {
        // Admin/GM goes directly to Admin Panel
        navigation.replace('Admin');
      } else {
        // Regular users go to main app
        navigation.replace('Main');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setLoading(true);

    if (!username.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      await FirebaseService.saveUser(user.uid, {
        name: username,
        xp: 0,
        level: 1,
        hasMonarchTitle: false,
        equippedTitle: 'newbie',
        stats: {
          strength: 10,
          agility: 10,
          sense: 10,
          vitality: 10,
          intelligence: 10
        },
        statPoints: 0
      });

      // Add to leaderboard
      await FirebaseService.updateLeaderboard(user.uid, username, 0, 1);

      // Create session for this device
      await SessionService.createSession(user.uid);

      // Navigation will happen automatically via AppState's auth listener
      navigation.replace('Main');
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await promptAsync();
      // Loading will be set to true in handleGoogleSignInSuccess
    } catch (error) {
      console.error('Error prompting Google Sign-In:', error);
      setError('Failed to open Google Sign-In');
    }
  };

  const handleGoogleSignInSuccess = async (idToken) => {
    setLoading(true);
    try {
      // Create Firebase credential with Google ID token
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // New user - create profile
        const displayName = user.displayName || user.email.split('@')[0];
        await FirebaseService.saveUser(user.uid, {
          name: displayName,
          email: user.email,
          xp: 0,
          level: 1,
          hasMonarchTitle: false,
          equippedTitle: 'newbie',
          stats: {
            strength: 10,
            agility: 10,
            sense: 10,
            vitality: 10,
            intelligence: 10
          },
          statPoints: 0
        });

        // Add to leaderboard
        await FirebaseService.updateLeaderboard(user.uid, displayName, 0, 1);
      } else {
        // Existing user - check ban status
        const userData = userDoc.data();
        if (userData?.isBanned) {
          // Check if ban has expired
          if (userData.banExpiresAt) {
            const expirationDate = userData.banExpiresAt.toDate ? userData.banExpiresAt.toDate() : new Date(userData.banExpiresAt);
            const now = new Date();
            
            if (now >= expirationDate) {
              // Ban has expired - unban the user
              await FirebaseService.updateUser(user.uid, {
                isBanned: false,
                banExpired: true,
                banExpiredAt: new Date()
              });
            } else {
              // Still banned
              await signOut(auth);
              setError(`Account banned until ${expirationDate.toLocaleString()}. Reason: ${userData.banReason || 'Violation of terms'}`);
              setLoading(false);
              return;
            }
          } else {
            // Permanent ban
            await signOut(auth);
            setError(`Account permanently banned: ${userData.banReason || 'Violation of terms'}`);
            setLoading(false);
            return;
          }
        }
      }

      // Create session for this device
      await SessionService.createSession(user.uid);

      // Navigation will happen automatically via AppState's auth listener
      navigation.replace('Main');
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (isRegister) {
      handleRegister();
    } else {
      handleLogin();
    }
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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();

    // Random glitch effect every 2-4 seconds
    const glitchInterval = setInterval(() => {
      if (!isGlitching) {
        triggerGlitch();
      }
    }, Math.random() * 2000 + 2000); // Random between 2-4 seconds

    return () => {
      clearInterval(glitchInterval);
    };
  }, [isGlitching]);

  return (
    <KeyboardAvoidingView style={[styles.screen]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.bgGradient} />
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <Text style={styles.brand}>Stride Quest</Text>
            {/* Glitch Layer 1 - Magenta channel offset */}
            <Animated.Text 
              style={[
                styles.brand, 
                styles.glitchLayer1,
                { 
                  transform: [{ translateX: glitchOffset1 }],
                  opacity: glitchOpacity
                }
              ]}
              pointerEvents="none"
            >
              Stride Quest
            </Animated.Text>
            {/* Glitch Layer 2 - Cyan channel offset */}
            <Animated.Text 
              style={[
                styles.brand, 
                styles.glitchLayer2,
                { 
                  transform: [{ translateX: glitchOffset2 }],
                  opacity: glitchOpacity
                }
              ]}
              pointerEvents="none"
            >
              Stride Quest
            </Animated.Text>
          </View>
          <Text style={styles.tag}>Arise with every step</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.formCard}>
          <View style={styles.modeToggle}>
            <TouchableOpacity 
              style={[styles.modeButton, !isRegister && styles.modeButtonActive]}
              onPress={() => { setIsRegister(false); setError(''); }}
            >
              <Text style={[styles.modeButtonText, !isRegister && styles.modeButtonTextActive]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeButton, isRegister && styles.modeButtonActive]}
              onPress={() => { setIsRegister(true); setError(''); }}
            >
              <Text style={[styles.modeButtonText, isRegister && styles.modeButtonTextActive]}>Register</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{isRegister ? 'Create account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            {isRegister ? 'Start your journey today' : 'Sign in to continue your journey'}
          </Text>

          {isRegister && (
            <View style={[styles.inputWrap, focused === 'username' && styles.inputFocus]}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                placeholder="Choose a username"
                placeholderTextColor="#5a5464"
                style={styles.input}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused(null)}
                returnKeyType="next"
                onSubmitEditing={() => document.getElementById('email')?.focus()}
              />
            </View>
          )}

          <View style={[styles.inputWrap, focused === 'email' && styles.inputFocus]}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              placeholder="your@email.com"
              placeholderTextColor="#5a5464"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current && passwordRef.current.focus()}
            />
          </View>

          <View style={[styles.inputWrap, focused === 'password' && styles.inputFocus]}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              ref={passwordRef}
              placeholder="••••••••"
              placeholderTextColor="#5a5464"
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              returnKeyType={isRegister ? 'next' : 'done'}
              onSubmitEditing={isRegister ? () => confirmPasswordRef.current?.focus() : handleSubmit}
            />
            <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.showToggle}>
              <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {isRegister && (
            <View style={[styles.inputWrap, focused === 'confirmPassword' && styles.inputFocus]}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                ref={confirmPasswordRef}
                placeholder="••••••••"
                placeholderTextColor="#5a5464"
                style={styles.input}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocused('confirmPassword')}
                onBlur={() => setFocused(null)}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
          )}

          {!isRegister && (
            <TouchableOpacity 
              style={styles.rememberMeRow} 
              onPress={() => {
                const newValue = !rememberMe;
                setRememberMe(newValue);
                saveRememberMePreference(newValue);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>
          )}

          {!!error && (
            <View style={styles.errorWrap}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, (!email || !password || (isRegister && (!username || !confirmPassword))) && styles.buttonDisabled]} 
            onPress={handleSubmit} 
            activeOpacity={0.85}
            disabled={loading}
          >
            <View style={styles.buttonShine} />
            {loading ? (
              <ActivityIndicator color="#20160b" />
            ) : (
              <>
                <Text style={styles.buttonText}>{isRegister ? 'Create Account' : 'Log in'}</Text>
                <Text style={styles.buttonArrow}>→</Text>
              </>
            )}
          </TouchableOpacity>

          {!isRegister && (
            <>
              <View style={styles.orDivider}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              <TouchableOpacity 
                style={styles.googleButton} 
                onPress={handleGoogleSignIn} 
                activeOpacity={0.85}
                disabled={loading}
              >
                <MaterialCommunityIcons name="google" size={20} color="#fff" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Guest access removed - users must log in or register */}
          <Text style={styles.versionText}>App Version: {appVersion}</Text>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0612',
    position: 'relative'
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#1a0f2e',
    opacity: 0.6
  },
  decorTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: theme.colors.primary,
    opacity: 0.08
  },
  decorBottom: {
    position: 'absolute',
    bottom: -120,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: theme.colors.accent,
    opacity: 0.06
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    marginBottom: 32,
    alignItems: 'center'
  },
  brandContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: theme.colors.text,
    fontSize: 32,
    fontFamily: 'SoloLevel',
    letterSpacing: 4,
    textShadowColor: 'rgba(235, 186, 242, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8
  },
  glitchLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    color: '#ff00ff', // Magenta/Pink for RGB split effect
    mixBlendMode: 'screen',
    textShadowColor: 'transparent',
  },
  glitchLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    color: '#00ffff', // Cyan for RGB split effect
    mixBlendMode: 'screen',
    textShadowColor: 'transparent',
  },
  tag: { 
    color: theme.colors.muted, 
    marginTop: 8,
    fontSize: 13,
    letterSpacing: 1
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: theme.colors.gold,
    marginTop: 12,
    opacity: 0.6
  },
  formCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0f0d12',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(235, 186, 242, 0.08)'
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#17141a',
    borderRadius: 10,
    padding: 4
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8
  },
  modeButtonActive: {
    backgroundColor: theme.colors.accent
  },
  modeButtonText: {
    color: theme.colors.muted,
    fontWeight: '700',
    fontSize: 13
  },
  modeButtonTextActive: {
    color: '#0f0d12'
  },
  title: { 
    color: theme.colors.text, 
    fontSize: 22, 
    fontWeight: '900', 
    marginBottom: 4 
  },
  subtitle: { 
    color: theme.colors.muted, 
    marginBottom: 20,
    fontSize: 13
  },
  inputWrap: { 
    position: 'relative', 
    marginTop: 14 
  },
  inputLabel: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#17141a',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: theme.colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  inputFocus: { 
    borderWidth: 0
  },
  showToggle: { 
    position: 'absolute', 
    right: 14, 
    bottom: 14 
  },
  showText: { 
    color: theme.colors.accent, 
    fontWeight: '700',
    fontSize: 12
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.muted,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  checkmark: {
    color: '#0f0d12',
    fontSize: 12,
    fontWeight: '900',
  },
  rememberMeText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  button: { 
    marginTop: 22, 
    backgroundColor: theme.colors.gold, 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: theme.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  buttonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  buttonDisabled: { 
    opacity: 0.5 
  },
  buttonText: { 
    color: '#20160b', 
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1
  },
  buttonArrow: {
    color: '#20160b',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(189, 183, 199, 0.15)'
  },
  dividerText: {
    color: theme.colors.muted,
    marginHorizontal: 12,
    fontSize: 12
  },
  link: { 
    alignItems: 'center',
    paddingVertical: 8
  },
  linkText: { 
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 14
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ff6b6b'
  },
  errorIcon: {
    color: '#ff6b6b',
    fontSize: 16,
    marginRight: 8
  },
  error: { 
    color: '#ff6b6b',
    flex: 1,
    fontSize: 13
  },
  versionText: {
    color: '#c77dff',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 18,
    letterSpacing: 1,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(189, 183, 199, 0.15)',
  },
  orText: {
    color: theme.colors.muted,
    fontSize: 12,
    marginHorizontal: 12,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  googleButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
    letterSpacing: 0.5,
  }
});
