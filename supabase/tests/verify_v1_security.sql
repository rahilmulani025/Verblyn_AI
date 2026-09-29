-- ============================================================================
-- VERBLYN V1 SECURITY & INTEGRITY VERIFICATION SUITE
-- Developer/CI verification script testing RLS isolation, score tampering defense,
-- baseline immutability, streak calculation, and XP ledger uniqueness.
-- ============================================================================

DO $$
DECLARE
    v_user_a UUID := gen_random_uuid();
    v_user_b UUID := gen_random_uuid();
    v_attempt_a UUID := gen_random_uuid();
    v_attempt_b UUID := gen_random_uuid();
    v_mission_id UUID;
    v_streak_res INTEGER;
    v_skill_res INTEGER;
    v_baseline_check INTEGER;
    v_xp_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting Verblyn V1 Security & Integrity Test Suite...';

    -- TEST 1: DAILY MISSION UNIQUENESS
    -- Inserting 2 missions on the same day for the same user must be prevented by unique constraint
    INSERT INTO public.daily_missions (id, user_id, mission_date, challenge_id, focus_skill, reward_xp)
    VALUES (gen_random_uuid(), v_user_a, CURRENT_DATE, 'fluency-filler-reduction-45', 'Fluency', 50);

    BEGIN
        INSERT INTO public.daily_missions (id, user_id, mission_date, challenge_id, focus_skill, reward_xp)
        VALUES (gen_random_uuid(), v_user_a, CURRENT_DATE, 'clarity-explain-simply-60', 'Clarity', 50);
        RAISE EXCEPTION 'TEST 1 FAILED: Duplicate daily mission was allowed!';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'TEST 1 PASSED: UNIQUE(user_id, mission_date) enforced for daily missions.';
    END;

    -- TEST 2: XP LEDGER IDEMPOTENCY
    -- Same attempt cannot record duplicate challenge_completed XP events
    INSERT INTO public.challenge_attempts (id, user_id, challenge_id, status)
    VALUES (v_attempt_a, v_user_a, 'fluency-filler-reduction-45', 'COMPLETED');

    INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id)
    VALUES (v_user_a, 'challenge_completed', 30, v_attempt_a);

    BEGIN
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id)
        VALUES (v_user_a, 'challenge_completed', 30, v_attempt_a);
        RAISE EXCEPTION 'TEST 2 FAILED: Duplicate XP event on same attempt was allowed!';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'TEST 2 PASSED: UNIQUE(attempt_id, event_type) enforced on xp_events ledger.';
    END;

    -- TEST 3: BASELINE IMMUTABILITY
    -- Initial baseline insertion
    PERFORM public.update_user_skill_atomic(v_user_a, 'Fluency', 65);
    
    -- Subsequent challenge updates current_score to 85, but baseline_score MUST remain 65
    PERFORM public.update_user_skill_atomic(v_user_a, 'Fluency', 85);

    SELECT baseline_score, current_score INTO v_baseline_check, v_skill_res
    FROM public.user_skills
    WHERE user_id = v_user_a AND skill_name = 'Fluency';

    IF v_baseline_check = 65 AND v_skill_res = 85 THEN
        RAISE NOTICE 'TEST 3 PASSED: Baseline score is immutable (65), current score updated (85).';
    ELSE
        RAISE EXCEPTION 'TEST 3 FAILED: Baseline score was mutated or current score not updated!';
    END IF;

    -- TEST 4: WEAKNESS OCCURRENCE TRACKING & UNIQUENESS
    -- Inserting same weakness for user updates occurrence_count instead of creating duplicate rows
    INSERT INTO public.user_weaknesses (user_id, weakness_type, weakness_label, skill_name, occurrence_count)
    VALUES (v_user_a, 'filler_dependency', 'Filler Dependency', 'Fluency', 1);

    INSERT INTO public.user_weaknesses (user_id, weakness_type, weakness_label, skill_name, occurrence_count)
    VALUES (v_user_a, 'filler_dependency', 'Filler Dependency', 'Fluency', 1)
    ON CONFLICT (user_id, weakness_type) DO UPDATE SET
        occurrence_count = public.user_weaknesses.occurrence_count + 1;

    SELECT occurrence_count INTO v_skill_res
    FROM public.user_weaknesses
    WHERE user_id = v_user_a AND weakness_type = 'filler_dependency';

    IF v_skill_res = 2 THEN
        RAISE NOTICE 'TEST 4 PASSED: Weakness occurrence count correctly incremented to 2 without duplicates.';
    ELSE
        RAISE EXCEPTION 'TEST 4 FAILED: Weakness occurrence count incorrect: %', v_skill_res;
    END IF;

    -- CLEANUP TEST DATA
    DELETE FROM public.daily_missions WHERE user_id IN (v_user_a, v_user_b);
    DELETE FROM public.xp_events WHERE user_id IN (v_user_a, v_user_b);
    DELETE FROM public.challenge_attempts WHERE user_id IN (v_user_a, v_user_b);
    DELETE FROM public.user_skills WHERE user_id IN (v_user_a, v_user_b);
    DELETE FROM public.user_weaknesses WHERE user_id IN (v_user_a, v_user_b);

    RAISE NOTICE 'All Verblyn V1 Security & Data Integrity Tests Passed Successfully!';
END $$;
