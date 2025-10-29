import React from 'react';
import { StyleSheet } from 'react-native';

export const theme = {
  colors: {
    // Soft pale background (light tint)
    background: '#FBF8FA',
    // Light pastel accent
    accent: '#EBBAF2',
    // Deep purple primary (for cards, headers)
    primary: '#463671',
    // Near-black for strong contrast
    dark: '#18171D',
    // Warm gold/beige accent
    gold: '#E8C28D',
    // Text colors
    text: '#FBF8FA',
    muted: '#B8B4BB'
  },
  spacing: {
    s: 8,
    m: 16,
    l: 24,
  }
};

// globalStyles uses dark background by default to match Solo Leveling mood
export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark,
    padding: 8,
  },
});

export const ThemeProvider = ({ children }) => {
  return children;
};

export default ThemeProvider;
