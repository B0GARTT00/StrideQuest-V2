import React, { useEffect, useState, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import ActivityCategoryScreen from '../screens/ActivityCategoryScreen';
import LeafletMapActivityScreen from '../screens/LeafletMapActivityScreen';
import TimerActivityScreen from '../screens/TimerActivityScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import WorldChatScreen from '../screens/WorldChatScreen';
import QuestScreen from '../screens/QuestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TitlesScreen from '../screens/TitlesScreen';
// Guilds screen removed from tab navigator; access via Home card
import { theme } from '../theme/ThemeProvider';
import GuildService from '../services/GuildService';
import { AppContext } from '../context/AppState';
import { View, Platform, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const ActivitiesStack = createNativeStackNavigator();

function ActivitiesNavigator() {
  return (
    <ActivitiesStack.Navigator screenOptions={{ headerShown: false }}>
      <ActivitiesStack.Screen name="ActivitiesList" component={ActivitiesScreen} />
      <ActivitiesStack.Screen name="ActivityCategory" component={ActivityCategoryScreen} />
      {/* Register activity execution screens here so navigation from category works in release builds */}
      <ActivitiesStack.Screen name="LeafletMapActivity" component={LeafletMapActivityScreen} />
      <ActivitiesStack.Screen name="TimerActivity" component={TimerActivityScreen} />
    </ActivitiesStack.Navigator>
  );
}

export default function TabNavigator() {
  const { getCurrentUserProfile } = useContext(AppContext);
  const me = getCurrentUserProfile;
  const [guildUnread, setGuildUnread] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!me?.id || !me?.guildId) return;
    const unsub = GuildService.subscribeGuildUnread(me.guildId, me.id, setGuildUnread);
    return () => unsub && unsub();
  }, [me?.id, me?.guildId]);

  // Calculate dynamic tab bar height to accommodate bottom safe area (nav buttons/gestures)
  const tabBarHeight = 72 + insets.bottom;

  // Custom animation for tab transitions
  const screenOptions = ({ route }) => ({
    headerShown: false,
    animation: 'shift', // Smooth slide animation
    // Custom slide from right animation
    cardStyleInterpolator: ({ current, layouts }) => {
      return {
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width * 0.3, 0],
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.7, 1],
          }),
        },
      };
    },
    // Tab bar styling
    tabBarStyle: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.dark,
      height: tabBarHeight,
      paddingBottom: Math.max(insets.bottom, 10),
      paddingTop: 8,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      overflow: 'hidden',
      borderTopWidth: 0,
      elevation: 8,
      zIndex: 999,
    },
    tabBarActiveTintColor: theme.colors.gold,
    tabBarInactiveTintColor: theme.colors.muted,
    tabBarShowLabel: false,
    tabBarIcon: ({ color, size, focused }) => {
      let name = 'circle';
      if (route.name === 'Home') name = 'home';
      if (route.name === 'Activities') name = 'directions-run';
      if (route.name === 'Quest') name = 'flag';
      if (route.name === 'Guilds') name = 'groups';
      if (route.name === 'Titles') name = 'military-tech';
      if (route.name === 'Leaderboard') name = 'leaderboard';
      if (route.name === 'WorldChat') name = 'forum';
      if (route.name === 'Profile') name = 'person';
      
      return (
        <View style={{ 
          transform: [{ scale: focused ? 1.1 : 1 }],
          backgroundColor: focused ? `${theme.colors.gold}15` : 'transparent',
          borderRadius: 12,
          padding: 8,
          transition: 'all 0.2s ease'
        }}>
          <MaterialIcons name={name} size={size + 2} color={color} />
        </View>
      );
    }
  });

  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: theme.colors.dark }}
      screenOptions={screenOptions}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Activities" component={ActivitiesNavigator} />
  <Tab.Screen name="Quest" component={QuestScreen} />
  <Tab.Screen name="WorldChat" component={WorldChatScreen} />
      <Tab.Screen name="Titles" component={TitlesScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
