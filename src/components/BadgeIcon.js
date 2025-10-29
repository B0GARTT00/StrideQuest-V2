import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/ThemeProvider';

export default function BadgeIcon({ label = '', color = theme.colors.gold, size = 44 }) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}> 
      <View style={[styles.inner, { width: size - 10, height: size - 10, borderRadius: (size - 10) / 2, backgroundColor: '#0f0d12' }]}> 
        <Text style={[styles.label, { fontSize: Math.max(12, Math.floor(size / 3)), color }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontWeight: '900'
  }
});
