export type AnalyticsEventName =
  | 'app_opened'
  | 'session_started'
  | 'signup_completed'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'baseline_started'
  | 'baseline_completed'
  | 'home_viewed'
  | 'daily_mission_viewed'
  | 'challenge_started'
  | 'challenge_submitted'
  | 'analysis_started'
  | 'analysis_completed'
  | 'analysis_failed'
  | 'challenge_completed'
  | 'challenge_abandoned'
  | 'retry_started'
  | 'next_challenge_clicked'
  | 'xp_earned'
  | 'level_up'
  | 'weakness_detected'
  | 'weakness_improved'
  | 'feedback_submitted'
  | 'session_ended';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  properties?: Record<string, unknown>;
  timestamp: string;
}

const FORBIDDEN_KEYS = new Set(['email', 'phone', 'transcript', 'password', 'token', 'auth_token']);

function sanitizeProperties(props?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!FORBIDDEN_KEYS.has(key.toLowerCase())) {
      clean[key] = value;
    }
  }
  return clean;
}

export const analytics = {
  track(name: AnalyticsEventName, properties?: Record<string, unknown>) {
    const sanitized = sanitizeProperties(properties);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics] ${name}:`, sanitized);
    }
  },
};

