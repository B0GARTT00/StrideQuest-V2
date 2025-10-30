const TIERS = [
  { key: 'Monarch', min: 100000, color: '#9d00ff', maxUsers: 9, requiresTitle: true, requiresLevel: 100 },
  { key: 'National Ranker', min: 70000, color: '#ffd166' },
  { key: 'S', min: 30000, color: '#f94144' },
  { key: 'A', min: 15000, color: '#f3722c' },
  { key: 'B', min: 7000, color: '#f8961e' },
  { key: 'C', min: 3000, color: '#90be6d' },
  { key: 'D', min: 1000, color: '#4d908e' },
  { key: 'E', min: 0, color: '#577590' }
];

/**
 * Get the tier object for a given user (with xp and optional hasMonarchTitle).
 * Returns { key, min, color, nextMin, requiresTitle, maxUsers }
 */
export function getTier(xp = 0, hasMonarchTitle = false, level = null) {
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    // Monarch requires level 100 and title
    if (t.key === 'Monarch') {
      if (level === 100 && hasMonarchTitle) {
        const next = TIERS[i - 1];
        return {
          key: t.key,
          min: t.min,
          color: t.color,
          nextMin: next ? next.min : null,
          requiresTitle: t.requiresTitle || false,
          maxUsers: t.maxUsers || null,
          requiresLevel: t.requiresLevel || null
        };
      } else {
        continue;
      }
    }
    // Other tiers by XP
    if (xp >= t.min) {
      const next = TIERS[i - 1];
      return {
        key: t.key,
        min: t.min,
        color: t.color,
        nextMin: next ? next.min : null,
        requiresTitle: t.requiresTitle || false,
        maxUsers: t.maxUsers || null,
        requiresLevel: t.requiresLevel || null
      };
    }
  }
  // fallback to lowest
  const last = TIERS[TIERS.length - 1];
  return { 
    key: last.key, 
    min: last.min, 
    color: last.color, 
    nextMin: null,
    requiresTitle: false,
    maxUsers: null,
    requiresLevel: null
  };
}

// New: Get rank by level only
export function getRankByLevel(level) {
  if (level >= 100) return 'Monarch';
  if (level >= 71)  return 'S';
  if (level >= 51)  return 'A';
  if (level >= 36)  return 'B';
  if (level >= 21)  return 'C';
  if (level >= 11)  return 'D';
  return 'E';
}

/**
 * Compute progress within the tier as a value 0..1
 */
export function tierProgress(xp = 0, hasMonarchTitle = false) {
  const tier = getTier(xp, hasMonarchTitle);
  if (!tier.nextMin) return 1; // top tier
  const span = tier.nextMin - tier.min;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (xp - tier.min) / span));
}

export const TIERS_ORDER = TIERS.map(t => t.key);

export default {
  TIERS,
  getTier,
  tierProgress,
  TIERS_ORDER,
  getRankByLevel
};
