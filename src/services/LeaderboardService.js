/**
 * Mockable leaderboard service helpers.
 * For now these operate on a local `users` array passed in.
 * Later this module can be swapped to call network APIs with the same signatures.
 */

export function fetchTop(users = [], limit = 50, offset = 0) {
  const sorted = [...users].sort((a, b) => b.xp - a.xp);
  const total = sorted.length;
  const data = sorted.slice(offset, offset + limit);
  return { data, total, offset };
}

export function fetchAround(users = [], userId, radius = 5) {
  const sorted = [...users].sort((a, b) => b.xp - a.xp);
  const idx = sorted.findIndex(u => u.id === userId);
  if (idx === -1) return { data: [], rank: null, total: sorted.length };
  const start = Math.max(0, idx - radius);
  const end = Math.min(sorted.length, idx + radius + 1);
  const data = sorted.slice(start, end);
  return { data, rank: idx + 1, total: sorted.length, startIndex: start };
}

export function fetchUserRank(users = [], userId) {
  const sorted = [...users].sort((a, b) => b.xp - a.xp);
  const idx = sorted.findIndex(u => u.id === userId);
  if (idx === -1) return { rank: null, xp: 0, total: sorted.length };
  return { rank: idx + 1, xp: sorted[idx].xp, total: sorted.length };
}

export default {
  fetchTop,
  fetchAround,
  fetchUserRank
};
