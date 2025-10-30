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

export default {
  subscribeWorldChat,
  sendWorldMessage
};
