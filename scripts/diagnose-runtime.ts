import { createClient } from '@supabase/supabase-js';

const url = 'https://jopgfbnlhjpjbtnhapev.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcGdmYm5saGpwamJ0bmhhcGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NDg2NDksImV4cCI6MjA4MjMyNDY0OX0.xElF3CIwCrtHD6lnHsqnPSm591FOMkghnFuQ4V_wWrk';

const sb = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function main() {
  console.log('--- SUPABASE LIVE DIAGNOSTIC ---');
  console.log('Target URL:', url);

  const tables = [
    'skills',
    'challenges',
    'profiles',
    'user_goals',
    'user_skills',
    'daily_missions',
    'challenge_attempts',
    'attempt_analysis',
    'speech_metrics',
    'user_weaknesses',
    'learning_plans',
    'learning_plan_days',
    'xp_events',
    'levels',
    'achievements',
    'user_achievements',
    'user_streaks',
    'beta_feedback',
    'speaking_sessions',
    'user_progress'
  ];

  for (const t of tables) {
    try {
      const res = await sb.from(t).select('*', { count: 'exact', head: true });
      if (res.error) {
        console.log(`❌ Table [${t}]: ${res.error.code} - ${res.error.message}`);
      } else {
        console.log(`✅ Table [${t}]: exists (rows: ${res.count ?? 'hidden by RLS'})`);
      }
    } catch (e: unknown) {
      console.log(`💥 Table [${t}]: Exception ${(e as Error).message}`);
    }
  }

  console.log('\n--- TESTING CHALLENGES DATA ---');
  const { data: challenges, error: cErr } = await sb.from('challenges').select('id, title, target_skill').limit(5);
  if (cErr) {
    console.log('Challenges query error:', cErr);
  } else {
    console.log('Challenges fetched count:', challenges?.length, challenges);
  }

  console.log('\n--- TESTING AUTH STATUS ---');
  const { data: sessionData, error: sErr } = await sb.auth.getSession();
  console.log('Session result:', sErr ? sErr.message : (sessionData.session ? 'Active session' : 'No session (Clean state)'));
}

main().catch(err => {
  console.error('Fatal diagnostic error:', err);
});
