import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.text}>Loading Stride Quest...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e27',
  },
  content: {
    alignItems: 'center',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  }
});

export default LoadingScreen;
