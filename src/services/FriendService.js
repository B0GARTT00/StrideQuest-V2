import { doc, updateDoc, getDoc, arrayUnion, arrayRemove, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Send a friend request
 */
export const sendFriendRequest = async (fromUserId, toUserId) => {
  try {
    const reqRef = doc(db, 'friendRequests', `${fromUserId}_${toUserId}`);
    await setDoc(reqRef, {
      from: fromUserId,
      to: toUserId,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (fromUserId, toUserId) => {
  try {
    const reqRef = doc(db, 'friendRequests', `${fromUserId}_${toUserId}`);
    await updateDoc(reqRef, { status: 'accepted', updatedAt: serverTimestamp() });
    // Add each other to friends list
    const fromRef = doc(db, 'users', fromUserId);
    const toRef = doc(db, 'users', toUserId);
    await updateDoc(fromRef, { friends: arrayUnion(toUserId) });
    await updateDoc(toRef, { friends: arrayUnion(fromUserId) });
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Decline a friend request
 */
export const declineFriendRequest = async (fromUserId, toUserId) => {
  try {
    const reqRef = doc(db, 'friendRequests', `${fromUserId}_${toUserId}`);
    await updateDoc(reqRef, { status: 'declined', updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Get incoming friend requests for a user
 */
export const getIncomingFriendRequests = async (userId) => {
  try {
    const reqsRef = collection(db, 'friendRequests');
    const snapshot = await getDocs(reqsRef);
    const requests = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.to === userId && data.status === 'pending') {
        requests.push(data);
      }
    });
    return { success: true, data: requests };
  } catch (error) {
    return { success: false, message: error.message, data: [] };
  }
};

/**
 * Get friends list for a user
 */
export const getFriends = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, data: [] };
    const data = userSnap.data();
    return { success: true, data: data.friends || [] };
  } catch (error) {
    return { success: false, message: error.message, data: [] };
  }
};

export default {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getIncomingFriendRequests,
  getFriends,
};
