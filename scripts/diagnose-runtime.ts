import { createClient } from '@supabase/supabase-js';

const url = 'https://omazwpvkdqtsiakeulru.supabase.co';
const key = 'sb_publishable_O6Qp_VU1ioECtOXRR-Z8GQ_OCyLV_o3';

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
