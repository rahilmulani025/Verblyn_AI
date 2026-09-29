import { createClient } from '@supabase/supabase-js';

const url = 'https://jopgfbnlhjpjbtnhapev.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcGdmYm5saGpwamJ0bmhhcGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NDg2NDksImV4cCI6MjA4MjMyNDY0OX0.xElF3CIwCrtHD6lnHsqnPSm591FOMkghnFuQ4V_wWrk';

const sb = createClient(url, key);

async function checkAllTables() {
  const allTables = [
    'profiles',
    'speaking_sessions',
    'user_progress',
    'skills',
    'user_skills',
    'user_goals',
    'user_weaknesses',
    'challenges',
    'daily_missions',
    'challenge_attempts',
    'attempt_analysis',
    'speech_metrics',
    'learning_plans',
    'learning_plan_days',
    'xp_events',
    'levels',
    'achievements',
    'user_achievements',
    'user_streaks',
    'beta_feedback'
  ];

  console.log('=== CHECKING ACTUAL REMOTE SUPABASE TABLES ===');
  for (const t of allTables) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (error) {
      console.log(`❌ ${t.padEnd(22)} : [${error.code}] ${error.message}`);
    } else {
      console.log(`✅ ${t.padEnd(22)} : EXISTS (returned ${data.length} rows)`);
    }
  }
}

checkAllTables();
