export interface MetricTrendPoint {
  date: string;
  score: number;
}

export interface SkillProgressItem {
  skillName: string;
  currentScore: number;
  baselineScore: number;
  bestScore: number;
  trend: 'improving' | 'steady' | 'declining';
  improvementDelta: number;
}

export interface TrackedWeaknessItem {
  id: string;
  label: string;
  type: string;
  skillName: string;
  status: 'ACTIVE' | 'IMPROVING' | 'RESOLVED';
  occurrenceCount: number;
  confidence: number;
  evidenceSummary?: string;
  lastDetectedAt: string;
}

export interface UserProgressMetrics {
  totalSessions: number;
  currentStreak: number;
  bestStreak: number;
  avgConfidenceScore: number;
  avgFluencyScore: number;
  avgGrammarScore: number;
  avgVocabularyScore: number;
  overallMasteryScore: number;
  skills: SkillProgressItem[];
  activeWeaknesses: TrackedWeaknessItem[];
  improvingWeaknesses: TrackedWeaknessItem[];
  currentFocus?: {
    label: string;
    reason: string;
    improvingDelta?: number;
  };
  recentSessions: Array<{
    id: string;
    topic: string;
    date: string;
    durationSeconds: number;
    score: number;
  }>;
}

