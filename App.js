import React, { useContext, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as Updates from 'expo-updates';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TermsAgreementModal from './src/components/TermsAgreementModal';
import { ThemeProvider } from './src/theme/ThemeProvider';
import AppStateProvider, { AppContext } from './src/context/AppState';
import TabNavigator from './src/navigation/TabNavigator';
import SplashScreen from './src/screens/SplashScreen';
import TimerActivityScreen from './src/screens/TimerActivityScreen';
import LoginScreen from './src/screens/LoginScreen';
import LoadingScreen from './src/components/LoadingScreen';
import GuildDetailScreen from './src/screens/GuildDetailScreen';
import GuildsScreen from './src/screens/GuildsScreen';
import GuildChatScreen from './src/screens/GuildChatScreen';
import AdminScreen from './src/screens/AdminScreen';
import UserPreviewModal from './src/screens/UserPreviewModal';
import ProfileScreen from './src/screens/ProfileScreen';
import DirectChatScreen from './src/screens/DirectChatScreen';
import SyncService from './src/services/SyncService';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { loading } = useContext(AppContext);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="TimerActivity" component={TimerActivityScreen} />
    <Stack.Screen name="Guilds" component={GuildsScreen} />
        <Stack.Screen name="GuildDetail" component={GuildDetailScreen} />
  <Stack.Screen name="GuildChat" component={GuildChatScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
        <Stack.Screen
          name="UserPreview"
          component={UserPreviewModal}
          options={{ presentation: 'transparentModal', headerShown: false }}
        />
        <Stack.Screen
          name="DirectChat"
          component={DirectChatScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="UserProfile"
          component={ProfileScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SoloLevel: require('./assets/Eternal.ttf'),
  });
  const [showTerms, setShowTerms] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Check for OTA updates on app start
  useEffect(() => {
    async function checkForUpdates() {
      if (__DEV__) {
        // Skip update checks in development mode
        return;
      }

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          console.log('Update available, downloading...');
          await Updates.fetchUpdateAsync();
          
          // Show custom update modal
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.log('Error checking for updates:', error);
      }
    }

    checkForUpdates();
  }, []);

  const handleRestartApp = async () => {
    await Updates.reloadAsync();
  };

  // Request location permission immediately on app launch
  useEffect(() => {
    (async () => {
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch (e) {
        // Ignore errors, permission can be requested again later
      }
    })();
  }, []);

  // Initialize network monitoring and sync service
  useEffect(() => {
    const unsubscribe = SyncService.initNetworkMonitoring();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const agreed = await AsyncStorage.getItem('agreedToTerms');
      if (!agreed) setShowTerms(true);
    })();
  }, []);

  const handleAgree = async () => {
    await AsyncStorage.setItem('agreedToTerms', 'true');
    setShowTerms(false);
  };

  if (!fontsLoaded) {
    // Return null while font loads
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <ThemeProvider>
          <AppNavigator />
          <StatusBar style="light" />
          <TermsAgreementModal visible={showTerms} onClose={handleAgree} reviewMode={false} />
          
          {/* Custom Update Modal */}
          <Modal visible={showUpdateModal} animationType="fade" transparent={true}>
            <View style={updateStyles.overlay}>
              <View style={updateStyles.container}>
                {/* Glow effect */}
                <View style={[updateStyles.glow, { backgroundColor: '#c77dff', opacity: 0.1 }]} />
                
                {/* Icon */}
                <View style={updateStyles.iconContainer}>
                  <MaterialCommunityIcons name="download-circle" size={64} color="#c77dff" />
                </View>
                
                {/* Title */}
                <Text style={updateStyles.title}>Update Available</Text>
                
                {/* Message */}
                <Text style={updateStyles.message}>
                  A new version has been downloaded. The app needs to restart to apply the update.
                </Text>
                
                {/* Features list */}
                <View style={updateStyles.featuresList}>
                  <View style={updateStyles.featureItem}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={updateStyles.featureText}>Bug fixes and improvements</Text>
                  </View>
                  <View style={updateStyles.featureItem}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={updateStyles.featureText}>Enhanced performance</Text>
                  </View>
                  <View style={updateStyles.featureItem}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={updateStyles.featureText}>New features</Text>
                  </View>
                </View>
                
                {/* Restart Button */}
                <TouchableOpacity 
                  style={updateStyles.restartButton}
                  onPress={handleRestartApp}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="restart" size={24} color="#0f0d12" style={{ marginRight: 8 }} />
                  <Text style={updateStyles.restartButtonText}>Restart Now</Text>
                </TouchableOpacity>
                
                {/* Decorative corners */}
                <View style={[updateStyles.corner, updateStyles.topLeft]} />
                <View style={[updateStyles.corner, updateStyles.topRight]} />
                <View style={[updateStyles.corner, updateStyles.bottomLeft]} />
                <View style={[updateStyles.corner, updateStyles.bottomRight]} />
              </View>
            </View>
          </Modal>
        </ThemeProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const updateStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1a0f2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#c77dff',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconContainer: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#e0aaff',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'SoloLevel',
    letterSpacing: 4,
    textShadowColor: '#c77dff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    position: 'relative',
    zIndex: 1,
  },
  message: {
    fontSize: 15,
    color: '#e8dfff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  featuresList: {
    width: '100%',
    marginBottom: 24,
    position: 'relative',
    zIndex: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#e8dfff',
    marginLeft: 10,
    fontWeight: '600',
  },
  restartButton: {
    backgroundColor: '#c77dff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#c77dff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    zIndex: 1,
  },
  restartButtonText: {
    color: '#0f0d12',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#c77dff',
    borderWidth: 3,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
});
