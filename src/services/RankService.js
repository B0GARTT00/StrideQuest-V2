import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getTier } from '../utils/ranks';

/**
 * Get global and tier rank for a user
 * @param {string} userId
 * @param {number} userXP
 * @param {boolean} hasMonarchTitle
 * @param {number} userLevel
 * @returns {Promise<{globalRank: number, tierRank: number}>}
 */
export async function getUserRanks(userId, userXP, hasMonarchTitle, userLevel) {
  // Get all users ordered by XP
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('xp', 'desc'));
  const querySnapshot = await getDocs(q);
  const allUsers = [];
  querySnapshot.forEach(doc => {
    allUsers.push({ id: doc.id, ...doc.data() });
  });

  // Global rank
  const globalRank = allUsers.findIndex(u => u.id === userId) + 1;

  // Tier rank
  const userTier = getTier(userXP, hasMonarchTitle, userLevel)?.key;
  const tierUsers = allUsers.filter(u => getTier(u.xp, u.hasMonarchTitle, u.level)?.key === userTier);
  const tierRank = tierUsers.findIndex(u => u.id === userId) + 1;

  return { globalRank, tierRank };
}
