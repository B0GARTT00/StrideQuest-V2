import React, { useContext } from 'react';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from './src/theme/ThemeProvider';
import AppStateProvider, { AppContext } from './src/context/AppState';
import TabNavigator from './src/navigation/TabNavigator';
import SplashScreen from './src/screens/SplashScreen';
import MapActivityScreen from './src/screens/MapActivityScreen';
import TimerActivityScreen from './src/screens/TimerActivityScreen';
import LoginScreen from './src/screens/LoginScreen';
import LoadingScreen from './src/components/LoadingScreen';
import GuildDetailScreen from './src/screens/GuildDetailScreen';
import GuildsScreen from './src/screens/GuildsScreen';
import GuildChatScreen from './src/screens/GuildChatScreen';
import UserPreviewModal from './src/screens/UserPreviewModal';
import ProfileScreen from './src/screens/ProfileScreen';

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
        <Stack.Screen name="MapActivity" component={MapActivityScreen} />
        <Stack.Screen name="TimerActivity" component={TimerActivityScreen} />
    <Stack.Screen name="Guilds" component={GuildsScreen} />
        <Stack.Screen name="GuildDetail" component={GuildDetailScreen} />
  <Stack.Screen name="GuildChat" component={GuildChatScreen} />
        <Stack.Screen
          name="UserPreview"
          component={UserPreviewModal}
          options={{ presentation: 'transparentModal', headerShown: false }}
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
        </ThemeProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
