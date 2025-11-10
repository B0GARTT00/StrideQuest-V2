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
const LAST_READ_PATH = 'worldChat/lastRead';

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

// Subscribe to unread world chat message count for a user
// Counts messages newer than the user's last read timestamp
export const subscribeWorldChatUnreadCount = (userId, onUnreadCount) => {
  if (!userId) {
    onUnreadCount(0);
    return () => {};
  }

  // Get user's last read timestamp
  const lastReadRef = ref(realtimeDb, `${LAST_READ_PATH}/${userId}`);
  
  let lastReadTimestamp = 0;
  let messagesUnsubscribe = null;

  // First, get the last read timestamp
  const lastReadUnsubscribe = onValue(lastReadRef, (snapshot) => {
    lastReadTimestamp = snapshot.val() || 0;

    // Clean up previous messages listener if it exists
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
    }

    // Now subscribe to messages and count unread
    const messagesRef = ref(realtimeDb, MESSAGES_PATH);
    messagesUnsubscribe = onValue(messagesRef, (messagesSnapshot) => {
      const allMessages = messagesSnapshot.val() || {};
      let unreadCount = 0;

      // Count messages newer than last read timestamp (excluding user's own messages)
      Object.values(allMessages).forEach((msg) => {
        if (msg.createdAt > lastReadTimestamp && msg.userId !== userId) {
          unreadCount++;
        }
      });

      onUnreadCount(unreadCount);
    });
  });

  // Return cleanup function that unsubscribes both listeners
  return () => {
    lastReadUnsubscribe();
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
    }
  };
};

// Mark world chat as read for the current user by updating their last read timestamp
export const markWorldChatAsRead = async (userId) => {
  if (!userId) return;
  try {
    const { set } = await import('firebase/database');
    const lastReadRef = ref(realtimeDb, `${LAST_READ_PATH}/${userId}`);
    await set(lastReadRef, Date.now());
  } catch (e) {
    console.error('markWorldChatAsRead error:', e);
  }
};

// Delete a world chat message (only if user is the sender)
export const deleteWorldMessage = async (messageId, userId) => {
  try {
    const { remove, get } = await import('firebase/database');
    const messageRef = ref(realtimeDb, `${MESSAGES_PATH}/${messageId}`);
    
    // Verify the user owns this message
    const snapshot = await get(messageRef);
    const message = snapshot.val();
    
    if (!message) {
      return { success: false, error: 'Message not found' };
    }
    
    if (message.userId !== userId) {
      return { success: false, error: 'You can only delete your own messages' };
    }
    
    await remove(messageRef);
    return { success: true };
  } catch (e) {
    console.error('deleteWorldMessage error:', e);
    return { success: false, error: e?.message || 'Failed to delete message' };
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

// Delete a private message (only if user is the sender)
export const deletePrivateMessage = async (userA, userB, messageId, userId) => {
  try {
    const { remove, get } = await import('firebase/database');
    const path = getPrivatePath(userA, userB);
    const messageRef = ref(realtimeDb, `${path}/${messageId}`);
    
    // Verify the user owns this message
    const snapshot = await get(messageRef);
    const message = snapshot.val();
    
    if (!message) {
      return { success: false, error: 'Message not found' };
    }
    
    if (message.senderId !== userId) {
      return { success: false, error: 'You can only delete your own messages' };
    }
    
    await remove(messageRef);
    return { success: true };
  } catch (e) {
    console.error('deletePrivateMessage error:', e);
    return { success: false, error: e?.message || 'Failed to delete message' };
  }
};




