export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'STREAK' | 'MASTERY' | 'CHALLENGE' | 'MILESTONE';
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0 to 100
  targetValue: number;
  currentValue: number;
}
