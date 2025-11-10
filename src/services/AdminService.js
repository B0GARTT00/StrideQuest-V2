import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Admin Service for Stride Quest
 * Handles admin operations like report management and user moderation
 */

// Special Game Master account credentials
export const GM_ACCOUNT = {
  email: 'gamemaster@stridequest.com',
  password: 'GameMaster2024!',
  displayName: 'GM',
  isAdmin: true
};

/**
 * Check if a user is the Game Master
 */
export const isGameMaster = (user) => {
  if (!user) return false;
  return user.email === GM_ACCOUNT.email || user.displayName === 'GM';
};

/**
 * Check if a user is an admin
 */
export const isAdmin = async (userId) => {
  try {
    if (!userId) return false;
    
    // Check if user has admin flag in database
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Check if it's the GM account or has admin flag
      return userData.isAdmin === true || userData.name === 'GM' || userData.email === GM_ACCOUNT.email;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Make a user an admin (can only be done by existing admin)
 */
export const makeAdmin = async (adminUserId, targetUserId) => {
  try {
    // Verify requester is admin
    const isRequesterAdmin = await isAdmin(adminUserId);
    if (!isRequesterAdmin) {
      return { success: false, message: 'Unauthorized: You are not an admin' };
    }
    
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, {
      isAdmin: true,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, message: 'User is now an admin' };
  } catch (error) {
    console.error('Error making user admin:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get all pending reports
 */
export const getPendingReports = async () => {
  try {
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef, 
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const snapshot = await getDocs(q);
    const reports = [];
    
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: reports };
  } catch (error) {
    console.error('Error getting pending reports:', error);
    return { success: false, message: error.message, data: [] };
  }
};

/**
 * Get all reports (pending, resolved, dismissed)
 */
export const getAllReports = async () => {
  try {
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef,
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    
    const snapshot = await getDocs(q);
    const reports = [];
    
    snapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: reports };
  } catch (error) {
    console.error('Error getting all reports:', error);
    return { success: false, message: error.message, data: [] };
  }
};

/**
 * Resolve a report (mark as handled)
 */
export const resolveReport = async (adminUserId, reportId, resolution) => {
  try {
    // Verify user is admin
    const isUserAdmin = await isAdmin(adminUserId);
    if (!isUserAdmin) {
      return { success: false, message: 'Unauthorized: You are not an admin' };
    }
    
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, {
      status: 'resolved',
      resolution: resolution,
      resolvedBy: adminUserId,
      resolvedAt: serverTimestamp()
    });
    
    return { success: true, message: 'Report resolved' };
  } catch (error) {
    console.error('Error resolving report:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Dismiss a report (mark as invalid/no action needed)
 */
export const dismissReport = async (adminUserId, reportId, reason) => {
  try {
    // Verify user is admin
    const isUserAdmin = await isAdmin(adminUserId);
    if (!isUserAdmin) {
      return { success: false, message: 'Unauthorized: You are not an admin' };
    }
    
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, {
      status: 'dismissed',
      resolution: reason,
      resolvedBy: adminUserId,
      resolvedAt: serverTimestamp()
    });
    
    return { success: true, message: 'Report dismissed' };
  } catch (error) {
    console.error('Error dismissing report:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Ban a user with different severity levels
 * @param {string} adminUserId - Admin performing the ban
 * @param {string} targetUserId - User to ban
 * @param {string} reason - Reason for ban
 * @param {string} severity - 'warning' | 'hours' | 'days' | 'months' | 'permanent'
 * @param {number} duration - Duration number (e.g., 24 for 24 hours, 7 for 7 days)
 */
export const banUser = async (adminUserId, targetUserId, reason, severity = 'warning', duration = 0) => {
  try {
    // Verify user is admin
    const isUserAdmin = await isAdmin(adminUserId);
    if (!isUserAdmin) {
      return { success: false, message: 'Unauthorized: You are not an admin' };
    }
    
    const userRef = doc(db, 'users', targetUserId);
    const now = new Date();
    let banExpiresAt = null;
    let banData = {
      banSeverity: severity,
      banReason: reason,
      bannedBy: adminUserId,
      bannedAt: serverTimestamp(),
    };

    // Calculate expiration based on severity
    if (severity === 'warning') {
      // Warning only - no actual ban
      banData.isBanned = false;
      banData.warningCount = await incrementWarningCount(targetUserId);
      banData.lastWarningAt = serverTimestamp();
    } else if (severity === 'hours') {
      banExpiresAt = new Date(now.getTime() + duration * 60 * 60 * 1000);
      banData.isBanned = true;
      banData.banExpiresAt = banExpiresAt;
    } else if (severity === 'days') {
      banExpiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
      banData.isBanned = true;
      banData.banExpiresAt = banExpiresAt;
    } else if (severity === 'months') {
      banExpiresAt = new Date(now.getTime() + duration * 30 * 24 * 60 * 60 * 1000);
      banData.isBanned = true;
      banData.banExpiresAt = banExpiresAt;
    } else if (severity === 'permanent') {
      banData.isBanned = true;
      banData.banExpiresAt = null; // No expiration
    }
    
    await updateDoc(userRef, banData);
    
    let message = '';
    if (severity === 'warning') {
      message = `User warned (Total warnings: ${banData.warningCount})`;
    } else if (severity === 'permanent') {
      message = 'User permanently banned';
    } else {
      message = `User banned for ${duration} ${severity} (until ${banExpiresAt?.toLocaleString()})`;
    }
    
    return { success: true, message };
  } catch (error) {
    console.error('Error banning user:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Helper function to increment warning count
 */
const incrementWarningCount = async (userId) => {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const currentWarnings = userDoc.data()?.warningCount || 0;
  return currentWarnings + 1;
};

/**
 * Unban a user
 */
export const unbanUser = async (adminUserId, targetUserId) => {
  try {
    // Verify user is admin
    const isUserAdmin = await isAdmin(adminUserId);
    if (!isUserAdmin) {
      return { success: false, message: 'Unauthorized: You are not an admin' };
    }
    
    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, {
      isBanned: false,
      unbannedAt: serverTimestamp(),
      unbannedBy: adminUserId
    });
    
    return { success: true, message: 'User has been unbanned' };
  } catch (error) {
    console.error('Error unbanning user:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Delete a message (admin power)
 */
export const deleteMessageAsAdmin = async (adminUserId, messageId, chatType, chatId) => {
  try {
    // Verify user is admin
    const isUserAdmin = await isAdmin(adminUserId);
    if (!isUserAdmin) {
      return { success: false, message: 'Unauthorized: You are not an admin' };
    }
    
    // Delete based on chat type
    if (chatType === 'world') {
      const { ref, remove } = await import('firebase/database');
      const { realtimeDb } = await import('../config/firebase');
      const messageRef = ref(realtimeDb, `worldChat/messages/${messageId}`);
      await remove(messageRef);
    } else if (chatType === 'guild') {
      const messageRef = doc(db, 'guilds', chatId, 'messages', messageId);
      await deleteDoc(messageRef);
    } else if (chatType === 'private') {
      const { ref, remove } = await import('firebase/database');
      const { realtimeDb } = await import('../config/firebase');
      const messageRef = ref(realtimeDb, `privateChats/${chatId}/messages/${messageId}`);
      await remove(messageRef);
    }
    
    return { success: true, message: 'Message deleted' };
  } catch (error) {
    console.error('Error deleting message as admin:', error);
    return { success: false, message: error.message };
  }
};

export default {
  isAdmin,
  makeAdmin,
  getPendingReports,
  getAllReports,
  resolveReport,
  dismissReport,
  banUser,
  unbanUser,
  deleteMessageAsAdmin
};
