import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header({ title, onPressRight, rightLabel, showTitle = true, showBell = false, unreadCount = 0, onPressBell }) {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.container, { paddingTop: 12 + insets.top }]}>
      {showTitle ? (
        <View style={styles.badge}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : <View style={{ width: 1 }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {showBell && (
          <TouchableOpacity 
            onPress={onPressBell} 
            style={[styles.bellCard, { marginRight: rightLabel ? 16 : 0 }]}
            activeOpacity={0.8}
          >
            <View style={[styles.bellGlow, { backgroundColor: theme.colors.accent, opacity: 0.1 }]} />
            <View style={{ position: 'relative', zIndex: 1 }}>
              <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.accent} />
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        {rightLabel ? (
          <TouchableOpacity onPress={onPressRight}>
            <Text style={styles.right}>{rightLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
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
  },
  bellCard: {
    backgroundColor: '#0f0d12',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(199, 125, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bellGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#0f0d12',
  },
  unreadText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 10,
  },
});
