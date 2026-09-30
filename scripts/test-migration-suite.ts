import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://omazwpvkdqtsiakeulru.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_O6Qp_VU1ioECtOXRR-Z8GQ_OCyLV_o3';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   VERBLYN BACKEND MIGRATION VERIFICATION SUITE');
  console.log('======================================================\n');

  const testEmail = `verblyn.qa.test.${Date.now()}@gmail.com`;
  const testPassword = `TestPass!_${Date.now()}`;
  let testUserId: string | null = null;
  let testAccessToken: string | null = null;

  // 1. New User Signup
  console.log('--- 1. AUTHENTICATION & SIGNUP ---');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Verblyn Test User',
      },
    },
  });

  assert(!signUpError, 'New user signup completed without error', signUpError?.message);
  assert(!!signUpData.user?.id, 'User ID generated', signUpData.user?.id);
  testUserId = signUpData.user?.id || null;
  testAccessToken = signUpData.session?.access_token || null;

  // If email confirmation is enabled or session is null, try sign in
  if (!testAccessToken && testUserId) {
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (!signInErr && signInData.session) {
      testAccessToken = signInData.session.access_token;
    }
  }

  // Create authenticated client
  const authSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: testAccessToken ? { Authorization: `Bearer ${testAccessToken}` } : {},
    },
  });

  // 2. Profile Creation Verification
  console.log('\n--- 2. PROFILE AUTOMATIC CREATION ---');
  if (testUserId) {
    const { data: profile, error: pErr } = await authSupabase
      .from('profiles')
      .select('*')
      .eq('user_id', testUserId)
      .maybeSingle();

    assert(!pErr, 'Profile query executed without error', pErr?.message);
    assert(!!profile, 'Profile record auto-created by auth trigger', JSON.stringify(profile));
    if (profile) {
      assert(profile.full_name === 'Verblyn Test User', 'Profile contains metadata full_name');
    }

    // Test profile update
    const { error: updateErr } = await authSupabase
      .from('profiles')
      .update({ profession: 'professional', institution: 'Tech Corp' })
      .eq('user_id', testUserId);

    assert(!updateErr, 'Profile update successful under RLS', updateErr?.message);
  }

  // 3. User Goals & Skills Read/Write
  console.log('\n--- 3. USER GOALS & USER SKILLS ---');
  if (testUserId) {
    const { data: goalData, error: goalErr } = await authSupabase
      .from('user_goals')
      .insert({
        user_id: testUserId,
        goal_id: 'executive_presence',
        is_active: true,
      })
      .select()
      .single();

    assert(!goalErr, 'User goal inserted successfully', goalErr?.message);
    assert(goalData?.goal_id === 'executive_presence', 'User goal read matches inserted value');

    const { data: skillData, error: skillErr } = await authSupabase
      .from('user_skills')
      .upsert({
        user_id: testUserId,
        skill_name: 'Fluency',
        baseline_score: 75,
        current_score: 78,
        best_score: 80,
      })
      .select()
      .single();

    assert(!skillErr, 'User skill upserted successfully', skillErr?.message);
    assert(skillData?.skill_name === 'Fluency', 'User skill record verified');
  }

  // 4. Challenges Read
  console.log('\n--- 4. CHALLENGES CATALOGUE ---');
  const { data: challenges, error: chalErr } = await authSupabase
    .from('challenges')
    .select('id, title, target_skill, duration_seconds')
    .limit(5);

  assert(!chalErr, 'Challenges catalogue query succeeded', chalErr?.message);
  assert(!!challenges && challenges.length >= 5, 'Challenges catalogue contains seeded challenges', `Count: ${challenges?.length}`);

  // 5. Daily Missions
  console.log('\n--- 5. DAILY MISSIONS ---');
  if (testUserId && challenges && challenges.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const { data: mission, error: missErr } = await authSupabase
      .from('daily_missions')
      .upsert({
        user_id: testUserId,
        mission_date: today,
        challenge_id: challenges[0].id,
        completed: false,
        reward_xp: 50,
      })
      .select()
      .single();

    assert(!missErr, 'Daily mission created/upserted', missErr?.message);
    assert(mission?.challenge_id === challenges[0].id, 'Daily mission matches assigned challenge');
  }

  // 6. Challenge Attempt & Progression RPC
  console.log('\n--- 6. CHALLENGE ATTEMPT & PROGRESSION RPC ---');
  if (testUserId && challenges && challenges.length > 0) {
    const { data: attempt, error: attErr } = await authSupabase
      .from('challenge_attempts')
      .insert({
        user_id: testUserId,
        challenge_id: challenges[0].id,
        status: 'STARTED',
        transcript: 'This is a high quality test practice attempt for Verblyn.',
        duration_seconds: 45,
      })
      .select()
      .single();

    assert(!attErr, 'Challenge attempt recorded', attErr?.message);
    assert(!!attempt?.id, 'Attempt ID returned');

    if (attempt) {
      // Execute authoritative atomic progression RPC
      const { data: rpcResult, error: rpcProgErr } = await authSupabase.rpc(
        'persist_attempt_analysis_and_progression',
        {
          p_attempt_id: attempt.id,
          p_scores: {
            overallScore: 85,
            fluency: 88,
            clarity: 82,
            vocabulary: 85,
            grammar: 90,
            confidence: 85,
          },
          p_metrics: {
            durationSeconds: 45,
            wordCount: 10,
            wpm: 120,
            fillerCount: 0,
            fillerStats: { total: 0, breakdown: {} },
            repetitionCount: 0,
            repetitionStats: { total: 0, repetitions: [] },
            sentenceCount: 1,
            averageSentenceLength: 10,
            vocabularyDiversity: 1.0,
            isComplete: true,
          },
          p_strengths: [{ title: 'Strong pacing', evidence: 'Steady flow', impact: 'High clarity' }],
          p_improvements: [],
          p_weakness_candidates: [],
          p_coach_message: 'Great execution with zero fillers.',
          p_recommended_focus: 'Fluency',
          p_analysis_version: 'deterministic-v1',
          p_is_daily_mission: true,
          p_is_weakness: false,
          p_is_personal_best: true,
        }
      );

      assert(!rpcProgErr, 'persist_attempt_analysis_and_progression RPC executed without error', rpcProgErr?.message);
      assert(!!rpcResult, 'RPC returned progression result');

      // Verify that analysis was saved
      const { data: savedAnalysis, error: aErr } = await authSupabase
        .from('attempt_analysis')
        .select('*')
        .eq('attempt_id', attempt.id)
        .maybeSingle();

      assert(!aErr && !!savedAnalysis, 'Attempt analysis record verified via RLS read');

      // Verify that speech metrics were saved
      const { data: savedMetrics, error: mErr } = await authSupabase
        .from('speech_metrics')
        .select('*')
        .eq('attempt_id', attempt.id)
        .maybeSingle();

      assert(!mErr && !!savedMetrics, 'Speech metrics record verified via RLS read');

      // Verify that XP was awarded
      const { data: xpEvents, error: xErr } = await authSupabase
        .from('xp_events')
        .select('*')
        .eq('attempt_id', attempt.id);

      assert(!xErr && !!xpEvents && xpEvents.length > 0, 'XP events awarded and verified via RLS read');

      // Verify streak updated
      const { data: streakRecord, error: sErr } = await authSupabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      assert(!sErr && !!streakRecord, 'User streak record verified via RLS read');
    }
  }

  // 7. Progression RPCs
  console.log('\n--- 7. DATABASE RPC FUNCTIONS ---');
  if (testUserId) {
    // Insert user progress to test calculate_rank_score
    await authSupabase.from('user_progress').upsert({
      user_id: testUserId,
      current_streak: 3,
      avg_grammar_score: 85,
      avg_fluency_score: 80,
      avg_vocabulary_score: 90,
      avg_confidence_score: 85,
    });

    const { data: rankScore, error: rpcErr } = await authSupabase
      .rpc('calculate_rank_score', { p_user_id: testUserId });

    assert(!rpcErr, 'calculate_rank_score RPC executed', rpcErr?.message);
    assert(typeof rankScore === 'number' && rankScore > 0, `calculate_rank_score returned numeric value: ${rankScore}`);
  }

  // 8. RLS Security Enforcement
  console.log('\n--- 8. RLS SECURITY ISOLATION ---');
  // Create an unauthenticated client to verify blocked access
  const anonClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (testUserId) {
    const { data: unauthGoals, error: unauthErr } = await anonClient
      .from('user_goals')
      .select('*')
      .eq('user_id', testUserId);

    assert(
      !unauthErr && (!unauthGoals || unauthGoals.length === 0),
      'RLS blocks unauthenticated reads on user_goals'
    );

    const { data: unauthAttempts } = await anonClient
      .from('challenge_attempts')
      .select('*')
      .eq('user_id', testUserId);

    assert(
      !unauthAttempts || unauthAttempts.length === 0,
      'RLS blocks unauthenticated reads on challenge_attempts'
    );
  }

  // 9. AI Coach Edge Function Invocation
  console.log('\n--- 9. AI COACH EDGE FUNCTION ---');
  // Test 9a: Invocation without auth header (Should return 401 UNAUTHORIZED)
  try {
    const unauthFuncRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test_connection' }),
    });
    const unauthJson = await unauthFuncRes.json();
    assert(
      unauthFuncRes.status === 401 && unauthJson.code === 'UNAUTHORIZED',
      'AI Coach function rejects unauthenticated invocations with 401 UNAUTHORIZED'
    );
  } catch (err: unknown) {
    assert(false, 'Edge function unauth test threw error', (err as Error).message);
  }

  // Test 9b: Invocation with authenticated user session but missing Gemini key
  if (testAccessToken) {
    try {
      const authFuncRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testAccessToken}`,
        },
        body: JSON.stringify({ action: 'test_connection' }),
      });
      const authJson = await authFuncRes.json();
      assert(
        authFuncRes.status === 400 && authJson.code === 'MISSING_API_KEY',
        'AI Coach function accepts authenticated session and validates required Gemini API key (MISSING_API_KEY)',
        JSON.stringify(authJson)
      );
    } catch (err: unknown) {
      assert(false, 'Edge function auth test threw error', (err as Error).message);
    }

    // Test 9c: Invocation with invalid Gemini key -> Should return clear INVALID_API_KEY error from Gemini
    try {
      const invalidKeyRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testAccessToken}`,
        },
        body: JSON.stringify({
          action: 'test_connection',
          gemini_api_key: 'AIzaSyFakeInvalidGeminiKeyForTestingPurposes_12345',
        }),
      });
      const invalidJson = await invalidKeyRes.json();
      assert(
        (invalidKeyRes.status === 400 || invalidKeyRes.status === 403 || invalidKeyRes.status === 401) &&
          invalidJson.code === 'INVALID_API_KEY',
        'AI Coach function communicates with Gemini API and maps 400/401/403 to INVALID_API_KEY',
        JSON.stringify(invalidJson)
      );
    } catch (err: unknown) {
      assert(false, 'Edge function invalid key test threw error', (err as Error).message);
    }
  }

  console.log('\n======================================================');
  console.log(`TEST RUN FINISHED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');
}

runTestSuite().catch((e) => {
  console.error('Fatal test error:', e);
});
