/**
 * Set last read timestamp for guild chat
 */
export const setGuildChatRead = async (guildId, userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      [`guildChatLastRead.${guildId}`]: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error setting guild chat read:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get unread count for guild chat
 */
export const getGuildChatUnreadCount = async (guildId, userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    let lastRead = 0;
    if (userSnap.exists()) {
      const data = userSnap.data();
      lastRead = data.guildChatLastRead?.[guildId]?.seconds || 0;
    }
    const messagesRef = collection(db, 'guilds', guildId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    let unread = 0;
    snapshot.forEach(doc => {
      const msg = doc.data();
      if ((msg.createdAt?.seconds || 0) > lastRead) unread++;
    });
    return unread;
  } catch (error) {
    console.error('Error getting guild chat unread count:', error);
    return 0;
  }
};

/**
 * Subscribe to unread count for guild chat
 */
export const subscribeGuildUnread = (guildId, userId, onCount) => {
  try {
    const userRef = doc(db, 'users', userId);
    const messagesRef = collection(db, 'guilds', guildId, 'messages');
    const msgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

    let lastReadSeconds = 0;

    const calc = (snapshot) => {
      let count = 0;
      snapshot.forEach(d => {
        const m = d.data();
        if ((m.createdAt?.seconds || 0) > lastReadSeconds) count++;
      });
      onCount(count);
    };

    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        lastReadSeconds = docSnap.data().guildChatLastRead?.[guildId]?.seconds || 0;
      }
    });

    const unsubMsgs = onSnapshot(msgQuery, (snap) => calc(snap));

    return () => {
      unsubUser && unsubUser();
      unsubMsgs && unsubMsgs();
    };
  } catch (error) {
    console.error('Error subscribing to guild unread:', error);
    return () => {};
  }
};
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
  addDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Guild Service for Stride Quest
 * Handles all guild-related database operations
 */

/**
 * Create a new guild
 */
export const createGuild = async (guildData, creatorId) => {
  try {
    const { name, description, emblem } = guildData;
    
    if (!name || name.trim().length < 3) {
      return { success: false, message: 'Guild name must be at least 3 characters' };
    }

    // Check if guild name already exists
    const guildsRef = collection(db, 'guilds');
    const nameQuery = query(guildsRef, where('name', '==', name.trim()));
    const existingGuilds = await getDocs(nameQuery);
    
    if (!existingGuilds.empty) {
      return { success: false, message: 'A guild with this name already exists' };
    }

    // Create new guild
    const guildId = `guild_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const guildRef = doc(db, 'guilds', guildId);
    
    await setDoc(guildRef, {
      id: guildId,
      name: name.trim(),
      description: description?.trim() || '',
      emblem: emblem || '⚔️',
      leaderId: creatorId,
      officers: [],
      members: [creatorId],
      memberCount: 1,
      totalXP: 0,
      totalActivities: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update user's guildId
    const userRef = doc(db, 'users', creatorId);
    await updateDoc(userRef, {
      guildId: guildId,
      guildRole: 'leader'
    });

    return { success: true, guildId, message: 'Guild created successfully!' };
  } catch (error) {
    console.error('Error creating guild:', error);
    return { success: false, message: error.message, error };
  }
};

/**
 * Get guild by ID
 * Calculates total XP from all guild members
 */
export const getGuild = async (guildId) => {
  try {
    const guildRef = doc(db, 'guilds', guildId);
    const guildSnap = await getDoc(guildRef);
    
    if (!guildSnap.exists()) {
      return { success: false, message: 'Guild not found' };
    }

    const guildData = { id: guildSnap.id, ...guildSnap.data() };
    
    // Calculate total XP from all members
    let totalXP = 0;
    const memberIds = guildData.members || [];
    
    for (const userId of memberIds) {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        totalXP += userData.xp || 0;
      }
    }

    return { success: true, data: { ...guildData, totalXP } };
  } catch (error) {
    console.error('Error getting guild:', error);
    return { success: false, message: error.message, error };
  }
};

/**
 * Get all guilds (for discovery)
 * Calculates total XP from all guild members
 */
export const getAllGuilds = async (limitCount = 50) => {
  try {
    const guildsRef = collection(db, 'guilds');
    const snapshot = await getDocs(guildsRef);
    
    const guilds = [];
    
    // Fetch each guild and calculate total XP from members
    for (const guildDoc of snapshot.docs) {
      const guildData = { id: guildDoc.id, ...guildDoc.data() };
      
      // Calculate total XP from all members
      let totalXP = 0;
      const memberIds = guildData.members || [];
      
      for (const userId of memberIds) {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          totalXP += userData.xp || 0;
        }
      }
      
      guilds.push({ ...guildData, totalXP });
    }
    
    // Sort by total XP (descending)
    guilds.sort((a, b) => b.totalXP - a.totalXP);

    return { success: true, data: guilds.slice(0, limitCount) };
  } catch (error) {
    console.error('Error getting guilds:', error);
    return { success: false, message: error.message, error, data: [] };
  }
};

/**
 * Subscribe to guild messages (real-time)
 */
export const subscribeToGuildMessages = (guildId, onMessages, limitCount = 100) => {
  try {
    const messagesRef = collection(db, 'guilds', guildId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // present in ascending order for chat UI
      msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      onMessages(msgs);
    });
    return unsub;
  } catch (error) {
    console.error('Error subscribing to guild messages:', error);
    return () => {};
  }
};

/**
 * Send a message to a guild
 */
export const sendGuildMessage = async (guildId, { userId, userName }, text) => {
  try {
    if (!text || !text.trim()) return { success: false, message: 'Empty message' };
    const messagesRef = collection(db, 'guilds', guildId, 'messages');
    const res = await addDoc(messagesRef, {
      text: text.trim(),
      senderId: userId,
      senderName: userName || 'Unknown',
      createdAt: serverTimestamp(),
      type: 'text'
    });
    return { success: true, id: res.id };
  } catch (error) {
    console.error('Error sending guild message:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Get guild members with their user data
 */
export const getGuildMembers = async (guildId) => {
  try {
    const guildResult = await getGuild(guildId);
    if (!guildResult.success) {
      return guildResult;
    }

    const guild = guildResult.data;
    const memberIds = guild.members || [];
    
    if (memberIds.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch user data for all members
    const members = [];
    for (const userId of memberIds) {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = { id: userSnap.id, ...userSnap.data() };
        // Determine role
        let role = 'member';
        if (userId === guild.leaderId) role = 'leader';
        else if (guild.officers?.includes(userId)) role = 'officer';
        
        members.push({ ...userData, guildRole: role });
      }
    }

    return { success: true, data: members };
  } catch (error) {
    console.error('Error getting guild members:', error);
    return { success: false, message: error.message, error };
  }
};

/**
 * Join a guild
 */
export const joinGuild = async (guildId, userId) => {
  try {
    const guildRef = doc(db, 'guilds', guildId);
    const guildSnap = await getDoc(guildRef);
    
    if (!guildSnap.exists()) {
      return { success: false, message: 'Guild not found' };
    }

    const guild = guildSnap.data();
    
    // Check if user is already in a guild
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().guildId) {
      return { success: false, message: 'You are already in a guild. Leave your current guild first.' };
    }

    // Check if already a member
    if (guild.members?.includes(userId)) {
      return { success: false, message: 'You are already a member of this guild' };
    }

    // Add user to guild
    await updateDoc(guildRef, {
      members: arrayUnion(userId),
      memberCount: increment(1),
      updatedAt: serverTimestamp()
    });

    // Update user's guildId
    await updateDoc(userRef, {
      guildId: guildId,
      guildRole: 'member'
    });

    return { success: true, message: 'Successfully joined the guild!' };
  } catch (error) {
    console.error('Error joining guild:', error);
    return { success: false, message: error.message, error };
  }
};

/**
 * Leave a guild
 */
export const leaveGuild = async (guildId, userId) => {
  try {
    const guildRef = doc(db, 'guilds', guildId);
    const guildSnap = await getDoc(guildRef);
    
    if (!guildSnap.exists()) {
      return { success: false, message: 'Guild not found' };
    }

    const guild = guildSnap.data();

    // Check if user is the leader
    if (guild.leaderId === userId) {
      // Transfer leadership or disband
      const remainingMembers = guild.members.filter(m => m !== userId);
      if (remainingMembers.length > 0) {
        // Transfer leadership to first officer or first member
        const newLeader = guild.officers?.[0] || remainingMembers[0];
        await updateDoc(guildRef, {
          leaderId: newLeader,
          officers: arrayRemove(newLeader),
          members: arrayRemove(userId),
          memberCount: increment(-1),
          updatedAt: serverTimestamp()
        });
        
        // Update new leader's role
        const newLeaderRef = doc(db, 'users', newLeader);
        await updateDoc(newLeaderRef, {
          guildRole: 'leader'
        });
      } else {
        // Delete guild if no members left
        await deleteDoc(guildRef);
      }
    } else {
      // Remove user from guild
      await updateDoc(guildRef, {
        members: arrayRemove(userId),
        officers: arrayRemove(userId),
        memberCount: increment(-1),
        updatedAt: serverTimestamp()
      });
    }

    // Update user's guildId
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      guildId: null,
      guildRole: null
    });

    return { success: true, message: 'Successfully left the guild' };
  } catch (error) {
    console.error('Error leaving guild:', error);
    return { success: false, message: error.message, error };
  }
};

/**
 * Disband a guild (leader only)
 * - Clears guildId and guildRole for all members
 * - Deletes guild messages subcollection
 * - Deletes the guild document
 */
export const disbandGuild = async (guildId, leaderId) => {
  try {
    const guildRef = doc(db, 'guilds', guildId);
    const guildSnap = await getDoc(guildRef);
    if (!guildSnap.exists()) {
      return { success: false, message: 'Guild not found' };
    }

    const guild = guildSnap.data();
    if (guild.leaderId !== leaderId) {
      return { success: false, message: 'Only the leader can disband the guild' };
    }

    const memberIds = Array.isArray(guild.members) ? guild.members : [];

    // Clear guild references for all members
    for (const uid of memberIds) {
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { guildId: null, guildRole: null });
      } catch (e) {
        console.warn('Failed to clear guild for user', uid, e?.message);
      }
    }

    // Delete guild messages subcollection (best-effort)
    try {
      const msgsRef = collection(db, 'guilds', guildId, 'messages');
      const msgsSnap = await getDocs(msgsRef);
      const deletions = msgsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletions);
    } catch (e) {
      console.warn('Failed to delete guild messages for', guildId, e?.message);
    }

    // Finally, delete the guild document
    await deleteDoc(guildRef);

    return { success: true, message: 'Guild disbanded successfully' };
  } catch (error) {
    console.error('Error disbanding guild:', error);
    return { success: false, message: error.message, error };
  }
};

/**
 * Promote member to officer
 */
export const promoteToOfficer = async (guildId, userId, promoterId) => {
  try {
    const guildRef = doc(db, 'guilds', guildId);
    const guildSnap = await getDoc(guildRef);
    
    if (!guildSnap.exists()) {
      return { success: false, message: 'Guild not found' };
    }

    const guild = guildSnap.data();

    // Check if promoter is the leader
    if (guild.leaderId !== promoterId) {
      return { success: false, message: 'Only the guild leader can promote members' };
    }

    // Check if user is a member
    if (!guild.members?.includes(userId)) {
      return { success: false, message: 'User is not a member of this guild' };
    }

    // Check if already an officer
    if (guild.officers?.includes(userId)) {
      return { success: false, message: 'User is already an officer' };
    }

    // Promote to officer
    await updateDoc(guildRef, {
      officers: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });

    // Update user's role
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      guildRole: 'officer'
    });

    return { success: true, message: 'Member promoted to officer' };
  } catch (error) {
    console.error('Error promoting member:', error);
    return { success: false, message: error.message, error };
  }
};

export default {
  createGuild,
  getGuild,
  getAllGuilds,
  getGuildMembers,
  joinGuild,
  leaveGuild,
  disbandGuild,
  promoteToOfficer,
  subscribeToGuildMessages,
  sendGuildMessage,
  setGuildChatRead,
  getGuildChatUnreadCount,
  subscribeGuildUnread,
};
