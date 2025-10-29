import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme/ThemeProvider';

export default function Header({ title, onPressRight, rightLabel, showTitle = true }) {
  return (
    <View style={styles.container}>
      {showTitle ? (
        <View style={styles.badge}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : <View style={{ width: 1 }} />}
      {rightLabel ? (
        <TouchableOpacity onPress={onPressRight}>
          <Text style={styles.right}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800'
  },
  right: {
    color: theme.colors.gold,
    fontSize: 16,
  }
});
