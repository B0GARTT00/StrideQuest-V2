import { db, auth } from '../config/firebase';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SessionService {
  constructor() {
    this.sessionId = null;
    this.sessionListener = null;
  }

  // Generate a unique session ID for this device/app instance
  async generateSessionId() {
    // First, try to get existing session ID from storage
    const storedSessionId = await AsyncStorage.getItem('deviceSessionId');
    if (storedSessionId) {
      return storedSessionId;
    }

    // If no stored ID, generate a new one
    const deviceId = Device.modelId || Device.modelName || 'unknown';
    const timestamp = Date.now();
    const random = await Crypto.getRandomBytesAsync(16);
    const randomHex = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const newSessionId = `${deviceId}_${timestamp}_${randomHex}`;
    
    // Store it for future use
    await AsyncStorage.setItem('deviceSessionId', newSessionId);
    
    return newSessionId;
  }

  // Create a new session when user logs in
  async createSession(userId) {
    try {
      this.sessionId = await this.generateSessionId();
      
      // Check if there's already an active session with the same session ID
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const activeSession = userData.activeSession;
        
        // If the active session is already ours (same sessionId), just update it
        if (activeSession && activeSession.sessionId === this.sessionId) {
          console.log('Reusing existing session:', this.sessionId);
          await this.updateSessionActivity(userId);
          this.startSessionMonitor(userId);
          return this.sessionId;
        }
      }
      
      const sessionData = {
        sessionId: this.sessionId,
        deviceName: Device.deviceName || 'Unknown Device',
        deviceModel: Device.modelName || 'Unknown Model',
        osName: Device.osName || 'Unknown OS',
        osVersion: Device.osVersion || 'Unknown Version',
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      // Store session in user document
      await setDoc(doc(db, 'users', userId), {
        activeSession: sessionData
      }, { merge: true });

      console.log('Session created:', this.sessionId);
      
      // Start monitoring this session
      this.startSessionMonitor(userId);
      
      return this.sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  // Monitor the session for changes (if another device logs in)
  startSessionMonitor(userId) {
    if (this.sessionListener) {
      this.sessionListener(); // Unsubscribe previous listener
    }

    // Store current session ID to compare later
    const mySessionId = this.sessionId;

    this.sessionListener = onSnapshot(
      doc(db, 'users', userId),
      async (docSnapshot) => {
        if (!docSnapshot.exists()) return;

        const userData = docSnapshot.data();
        const activeSession = userData.activeSession;

        // Only invalidate if:
        // 1. There is an active session
        // 2. We have a session ID set
        // 3. The active session ID is different from ours
        // 4. The active session ID is not null/undefined
        if (activeSession && 
            activeSession.sessionId && 
            mySessionId && 
            activeSession.sessionId !== mySessionId) {
          console.log('Session invalidated - another device logged in');
          console.log('My session:', mySessionId);
          console.log('Active session:', activeSession.sessionId);
          await this.handleSessionInvalidated();
        }
      },
      (error) => {
        console.error('Session monitor error:', error);
      }
    );
  }

  // Handle being logged out by another device
  async handleSessionInvalidated() {
    try {
      // Stop monitoring
      if (this.sessionListener) {
        this.sessionListener();
        this.sessionListener = null;
      }

      // Sign out
      await signOut(auth);
      
      // Show alert to user
      alert('Your account has been logged in on another device. You have been logged out.');
    } catch (error) {
      console.error('Error handling session invalidation:', error);
    }
  }

  // Update session activity timestamp
  async updateSessionActivity(userId) {
    try {
      if (!this.sessionId) return;

      await setDoc(doc(db, 'users', userId), {
        'activeSession.lastActive': serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  // End the current session (logout)
  async endSession(userId) {
    try {
      if (this.sessionListener) {
        this.sessionListener();
        this.sessionListener = null;
      }

      // Only clear the session from Firestore if it's our session
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const activeSession = userData.activeSession;
        
        // Only clear if it's our session or no session exists
        if (!activeSession || activeSession.sessionId === this.sessionId) {
          await setDoc(doc(db, 'users', userId), {
            activeSession: null
          }, { merge: true });
        }
      }

      // Don't clear the device session ID - keep it for next login
      // await AsyncStorage.removeItem('deviceSessionId');

      this.sessionId = null;
      console.log('Session ended');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  // Check if another session is active
  async isAnotherSessionActive(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return false;

      const userData = userDoc.data();
      const activeSession = userData.activeSession;

      // If there's an active session and it's not ours
      if (activeSession && activeSession.sessionId !== this.sessionId) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new SessionService();
