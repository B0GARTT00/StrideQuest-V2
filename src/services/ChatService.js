import { ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

// Message shape:
// {
//   id: <string>,
//   userId: <string>,
//   userName: <string>,
//   text: <string>,
//   createdAt: <number ms>
// }

const MESSAGES_PATH = 'worldChat/messages';

export const subscribeWorldChat = (onMessages) => {
  const q = query(ref(realtimeDb, MESSAGES_PATH), orderByChild('createdAt'), limitToLast(100));
  const unsubscribe = onValue(q, (snapshot) => {
    const val = snapshot.val() || {};
    const list = Object.keys(val)
      .map((key) => ({ id: key, ...val[key] }))
      .sort((a, b) => a.createdAt - b.createdAt);
    onMessages(list);
  });
  return () => unsubscribe();
};

export const sendWorldMessage = async (userId, userName, text) => {
  if (!text || !text.trim()) return { success: false, error: 'Empty message' };
  try {
    const msg = {
      userId,
      userName,
      text: text.trim().slice(0, 500),
      createdAt: Date.now()
    };
    await push(ref(realtimeDb, MESSAGES_PATH), msg);
    return { success: true };
  } catch (e) {
    console.error('sendWorldMessage error:', e);
    return { success: false, error: e?.message || 'Failed to send message' };
  }
};



// ========== Private / Direct Chats ==========

const getPrivatePath = (a, b) => `privateChats/${[a, b].sort().join('_')}/messages`;

export const subscribePrivateChat = (userA, userB, onMessages, limitCount = 100) => {
  const path = getPrivatePath(userA, userB);
  const q = query(ref(realtimeDb, path), orderByChild('createdAt'), limitToLast(limitCount));
  const unsubscribe = onValue(q, (snapshot) => {
    const val = snapshot.val() || {};
    const list = Object.keys(val)
      .map((key) => ({ id: key, ...val[key] }))
      .sort((a, b) => a.createdAt - b.createdAt);
    onMessages(list);
  });
  return () => unsubscribe();
};

export const sendPrivateMessage = async (fromUserId, toUserId, fromUserName, text) => {
  if (!text || !text.trim()) return { success: false, error: 'Empty message' };
  try {
    const path = getPrivatePath(fromUserId, toUserId);
    const msg = {
      senderId: fromUserId,
      senderName: fromUserName,
      recipientId: toUserId,
      text: text.trim().slice(0, 1000),
      createdAt: Date.now(),
      read: false
    };
    await push(ref(realtimeDb, path), msg);
    return { success: true };
  } catch (e) {
    console.error('sendPrivateMessage error:', e);
    return { success: false, error: e?.message || 'Failed to send message' };
  }
};

// Subscribe to unread private message count for a user
// This checks all private chats where the user is a recipient and counts unread messages
export const subscribePrivateUnreadCount = (userId, onUnreadCount) => {
  if (!userId) {
    onUnreadCount(0);
    return () => {};
  }

  // Listen to all private chats in the database
  const privateChatRef = ref(realtimeDb, 'privateChats');
  const unsubscribe = onValue(privateChatRef, (snapshot) => {
    const allChats = snapshot.val() || {};
    let totalUnread = 0;

    // Iterate through all chat rooms
    Object.keys(allChats).forEach((chatKey) => {
      // Check if this user is part of this chat
      const [userA, userB] = chatKey.split('_');
      if (userA === userId || userB === userId) {
        // Count unread messages where this user is the recipient
        const messages = allChats[chatKey].messages || {};
        Object.values(messages).forEach((msg) => {
          if (msg.recipientId === userId && msg.read === false) {
            totalUnread++;
          }
        });
      }
    });

    onUnreadCount(totalUnread);
  });

  return () => unsubscribe();
};

// Mark all messages in a private chat as read for the current user
export const markPrivateChatAsRead = async (userA, userB, currentUserId) => {
  try {
    const path = getPrivatePath(userA, userB);
    const chatRef = ref(realtimeDb, `${path}`);
    
    // Get all messages
    const snapshot = await new Promise((resolve) => {
      onValue(chatRef, resolve, { onlyOnce: true });
    });
    
    const messages = snapshot.val() || {};
    const updates = {};
    
    // Mark messages as read where current user is recipient
    Object.keys(messages).forEach((msgKey) => {
      if (messages[msgKey].recipientId === currentUserId && messages[msgKey].read === false) {
        updates[`${path}/${msgKey}/read`] = true;
      }
    });
    
    if (Object.keys(updates).length > 0) {
      const { update } = await import('firebase/database');
      await update(ref(realtimeDb), updates);
    }
    
    return { success: true };
  } catch (e) {
    console.error('markPrivateChatAsRead error:', e);
    return { success: false, error: e?.message || 'Failed to mark as read' };
  }
};




