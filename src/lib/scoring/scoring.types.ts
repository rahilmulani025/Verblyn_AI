import { SpeechMetricsSummary } from '@/lib/metrics';

export interface CalculatedScores {
  overallScore: number;
  clarityScore: number;
  pacingScore: number;
  concisenessScore: number;
  confidenceScore: number;
}

/**
 * Pure deterministic scoring formulas based on calculated speech metrics.
 */
export function calculateScoresFromMetrics(metrics: SpeechMetricsSummary): CalculatedScores {
  if (metrics.wordCount === 0) {
    return {
      overallScore: 0,
      clarityScore: 0,
      pacingScore: 0,
      concisenessScore: 0,
      confidenceScore: 0,
    };
  }

  // Pacing score: 100 at 140 WPM, decays gracefully if too fast or too slow
  const targetWpm = 140;
  const wpmDiff = Math.abs(metrics.wpm - targetWpm);
  const pacingScore = Math.max(20, Math.min(100, Math.round(100 - wpmDiff * 0.8)));

  // Conciseness & filler penalty
  const fillerPenalty = Math.min(50, Math.round(metrics.fillerStats.fillerPercentage * 5));
  const repetitionPenalty = Math.min(20, metrics.repetitionStats.total * 5);
  const concisenessScore = Math.max(20, Math.min(100, 100 - fillerPenalty - repetitionPenalty));

  // Clarity score based on vocabulary diversity and sentence length moderation
  const vocabBonus = Math.round(metrics.vocabularyDiversity * 40); // up to 40
  const avgLenDiff = Math.abs(metrics.averageSentenceLength - 15);
  const lengthScore = Math.max(20, 60 - Math.round(avgLenDiff * 2));
  const clarityScore = Math.max(20, Math.min(100, vocabBonus + lengthScore));

  // Confidence score: based on pacing and low filler percentage
  const confidenceScore = Math.max(20, Math.min(100, Math.round(pacingScore * 0.5 + concisenessScore * 0.5)));

  // Overall weighted score
  const overallScore = Math.round(
    clarityScore * 0.3 + pacingScore * 0.25 + concisenessScore * 0.25 + confidenceScore * 0.2
  );

  return {
    overallScore,
    clarityScore,
    pacingScore,
    concisenessScore,
    confidenceScore,
  };
}
