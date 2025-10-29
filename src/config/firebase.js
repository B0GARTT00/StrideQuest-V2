import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiyvb49NYGzKTQ7nJ2IeuOfe2GU-RYbTc",
  authDomain: "stride-quest-772f9.firebaseapp.com",
  databaseURL: "https://stride-quest-772f9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "stride-quest-772f9",
  storageBucket: "stride-quest-772f9.firebasestorage.app",
  messagingSenderId: "300404105909",
  appId: "1:300404105909:web:2e783de6bd0adc248954fc",
  measurementId: "G-61NNBZ7EFW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
// Check if auth is already initialized to avoid errors
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

export { auth };
export const db = getFirestore(app); // For structured data (users, activities, quests)
export const realtimeDb = getDatabase(app); // For real-time leaderboard

export default app;
