import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Report Service for Stride Quest
 * Handles user and message reporting
 */

/**
 * Report a chat message
 * @param {Object} reportData - The report details
 * @param {string} reportData.reporterId - ID of user making the report
 * @param {string} reportData.reporterName - Name of user making the report
 * @param {string} reportData.reportedUserId - ID of user being reported
 * @param {string} reportData.reportedUserName - Name of user being reported
 * @param {string} reportData.messageId - ID of the message being reported
 * @param {string} reportData.messageText - Text content of the message
 * @param {string} reportData.chatType - Type of chat (world, guild, private)
 * @param {string} reportData.chatId - ID of the chat room (guildId for guild, chatKey for private)
 * @param {string} reportData.reason - Reason for the report
 * @param {string} reportData.details - Additional details (optional)
 */
export const reportMessage = async (reportData) => {
  try {
    const {
      reporterId,
      reporterName,
      reportedUserId,
      reportedUserName,
      messageId,
      messageText,
      chatType,
      chatId,
      reason,
      details
    } = reportData;

    if (!reporterId || !reportedUserId || !messageId || !reason) {
      return { success: false, message: 'Missing required fields' };
    }

    const reportsRef = collection(db, 'reports');
    await addDoc(reportsRef, {
      type: 'message',
      reporterId,
      reporterName: reporterName || 'Unknown',
      reportedUserId,
      reportedUserName: reportedUserName || 'Unknown',
      messageId,
      messageText: messageText || '',
      chatType,
      chatId: chatId || null,
      reason,
      details: details || '',
      status: 'pending',
      createdAt: serverTimestamp(),
      resolvedAt: null,
      resolvedBy: null,
      resolution: null
    });

    return { success: true, message: 'Report submitted successfully' };
  } catch (error) {
    console.error('Error reporting message:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Report a user
 * @param {Object} reportData - The report details
 * @param {string} reportData.reporterId - ID of user making the report
 * @param {string} reportData.reporterName - Name of user making the report
 * @param {string} reportData.reportedUserId - ID of user being reported
 * @param {string} reportData.reportedUserName - Name of user being reported
 * @param {string} reportData.reason - Reason for the report
 * @param {string} reportData.details - Additional details (optional)
 */
export const reportUser = async (reportData) => {
  try {
    const {
      reporterId,
      reporterName,
      reportedUserId,
      reportedUserName,
      reason,
      details
    } = reportData;

    if (!reporterId || !reportedUserId || !reason) {
      return { success: false, message: 'Missing required fields' };
    }

    // Prevent self-reporting
    if (reporterId === reportedUserId) {
      return { success: false, message: 'You cannot report yourself' };
    }

    const reportsRef = collection(db, 'reports');
    await addDoc(reportsRef, {
      type: 'user',
      reporterId,
      reporterName: reporterName || 'Unknown',
      reportedUserId,
      reportedUserName: reportedUserName || 'Unknown',
      reason,
      details: details || '',
      status: 'pending',
      createdAt: serverTimestamp(),
      resolvedAt: null,
      resolvedBy: null,
      resolution: null
    });

    return { success: true, message: 'Report submitted successfully' };
  } catch (error) {
    console.error('Error reporting user:', error);
    return { success: false, message: error.message };
  }
};

export default {
  reportMessage,
  reportUser
};
