export interface UserLevelInfo {
  level: number;
  currentXp: number;
  currentLevelMinXp: number;
  nextLevelXp: number;
  progressPercent: number;
  xpToNextLevel: number;
  didLevelUp?: boolean;
}

export interface UserStreakInfo {
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | null;
  isActiveToday: boolean;
}

export interface DailyMissionRecord {
  id: string;
  userId: string;
  missionDate: string; // YYYY-MM-DD
  challengeId: string;
  completed: boolean;
  completedAt?: string;
  xpBonus: number;
}

// Deterministic level thresholds
const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, maxXp: 100 },
  { level: 2, minXp: 100, maxXp: 250 },
  { level: 3, minXp: 250, maxXp: 450 },
  { level: 4, minXp: 450, maxXp: 700 },
  { level: 5, minXp: 700, maxXp: 1000 },
  { level: 6, minXp: 1000, maxXp: 1400 },
  { level: 7, minXp: 1400, maxXp: 1900 },
  { level: 8, minXp: 1900, maxXp: 2500 },
];

export function calculateLevelFromXp(totalXp: number, previousXp?: number): UserLevelInfo {
  const safeXp = Math.max(0, totalXp);

  let currentTier = LEVEL_THRESHOLDS[0];
  for (const tier of LEVEL_THRESHOLDS) {
    if (safeXp >= tier.minXp) {
      currentTier = tier;
    }
  }

  // Handle beyond max tier
  const isBeyond = safeXp >= LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].maxXp;
  const minXp = currentTier.minXp;
  const maxXp = isBeyond ? minXp + 600 : currentTier.maxXp;
  const span = maxXp - minXp;
  const earnedInLevel = safeXp - minXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((earnedInLevel / span) * 100)));
  const xpToNextLevel = Math.max(0, maxXp - safeXp);

  const didLevelUp =
    previousXp !== undefined &&
    calculateLevelFromXp(previousXp).level < currentTier.level;

  return {
    level: currentTier.level,
    currentXp: safeXp,
    currentLevelMinXp: minXp,
    nextLevelXp: maxXp,
    progressPercent,
    xpToNextLevel,
    didLevelUp,
  };
}
