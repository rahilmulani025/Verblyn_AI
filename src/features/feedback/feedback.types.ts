import { SpeechMetricsSummary } from '@/lib/metrics';

export interface FeedbackSummary {
  headline: string;
  strengths: string[];
  growthAreas: string[];
  actionableDrillTip: string;
  metrics: SpeechMetricsSummary;
}
