import { db, auth } from '../config/firebase';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';

class SessionService {
  constructor() {
    this.sessionId = null;
    this.sessionListener = null;
  }

  // Generate a unique session ID for this device/app instance
  async generateSessionId() {
    const deviceId = Device.modelId || Device.modelName || 'unknown';
    const timestamp = Date.now();
    const random = await Crypto.getRandomBytesAsync(16);
    const randomHex = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `${deviceId}_${timestamp}_${randomHex}`;
  }

  // Create a new session when user logs in
  async createSession(userId) {
    try {
      this.sessionId = await this.generateSessionId();
      
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

    this.sessionListener = onSnapshot(
      doc(db, 'users', userId),
      async (docSnapshot) => {
        if (!docSnapshot.exists()) return;

        const userData = docSnapshot.data();
        const activeSession = userData.activeSession;

        // If there's an active session and it's not ours, we've been logged out
        if (activeSession && activeSession.sessionId !== this.sessionId) {
          console.log('Session invalidated - another device logged in');
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

      // Clear active session from Firestore
      await setDoc(doc(db, 'users', userId), {
        activeSession: null
      }, { merge: true });

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
