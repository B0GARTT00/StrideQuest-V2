import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme/ThemeProvider';

export default function BottomNav({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
       
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Activities')}>
        
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Quest')}>
       
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
       
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
        
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#111',
    backgroundColor: theme.colors.dark,
  },
  link: {
    color: theme.colors.accent,
    fontWeight: '600'
  }
});
