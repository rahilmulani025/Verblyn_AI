import { createClient } from '@supabase/supabase-js';

const url = 'https://omazwpvkdqtsiakeulru.supabase.co';
const key = 'sb_publishable_O6Qp_VU1ioECtOXRR-Z8GQ_OCyLV_o3';

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
