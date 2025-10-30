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
import LoginScreen from './src/screens/LoginScreen';
import LoadingScreen from './src/components/LoadingScreen';

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
