-- Update persist_attempt_analysis_and_progression to use daily_mission_completed
CREATE OR REPLACE FUNCTION public.persist_attempt_analysis_and_progression(
    p_attempt_id UUID,
    p_scores JSONB,
    p_metrics JSONB,
    p_strengths JSONB DEFAULT '[]'::jsonb,
    p_improvements JSONB DEFAULT '[]'::jsonb,
    p_weakness_candidates JSONB DEFAULT '[]'::jsonb,
    p_coach_message TEXT DEFAULT '',
    p_recommended_focus TEXT DEFAULT '',
    p_analysis_version TEXT DEFAULT 'ai-v1',
    p_is_daily_mission BOOLEAN DEFAULT false,
    p_is_weakness BOOLEAN DEFAULT false,
    p_is_personal_best BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_user_id UUID;
    v_attempt public.challenge_attempts%ROWTYPE;
    v_challenge public.challenges%ROWTYPE;
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - 1;
    v_current_streak INTEGER := 1;
    v_longest_streak INTEGER := 1;
    v_last_activity DATE;
    v_base_xp INTEGER := 30;
    v_daily_bonus INTEGER := 0;
    v_weakness_bonus INTEGER := 0;
    v_best_bonus INTEGER := 0;
    v_total_earned_xp INTEGER := 0;
    v_overall_score INTEGER;
    v_fluency INTEGER;
    v_clarity INTEGER;
    v_vocabulary INTEGER;
    v_grammar INTEGER;
    v_confidence INTEGER;
    v_total_xp_sum INTEGER := 0;
BEGIN
    -- Fetch attempt
    SELECT * INTO v_attempt
    FROM public.challenge_attempts
    WHERE id = p_attempt_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
    END IF;

    v_user_id := v_attempt.user_id;

    -- Security Guard: Caller must own the attempt
    IF v_caller_id IS NOT NULL AND v_caller_id != v_user_id THEN
        RAISE EXCEPTION 'Access denied: Cannot mutate progression for another user';
    END IF;

    -- Extract scores
    v_overall_score := COALESCE((p_scores->>'overallScore')::INTEGER, (p_scores->>'overall_score')::INTEGER, 70);
    v_fluency := COALESCE((p_scores->>'fluency')::INTEGER, (p_scores->>'fluency_score')::INTEGER, 70);
    v_clarity := COALESCE((p_scores->>'clarity')::INTEGER, (p_scores->>'clarity_score')::INTEGER, 70);
    v_vocabulary := COALESCE((p_scores->>'vocabulary')::INTEGER, (p_scores->>'vocabulary_score')::INTEGER, 70);
    v_grammar := COALESCE((p_scores->>'grammar')::INTEGER, (p_scores->>'grammar_score')::INTEGER, 70);
    v_confidence := COALESCE((p_scores->>'confidence')::INTEGER, (p_scores->>'confidence_score')::INTEGER, 70);

    -- Fetch challenge metadata for base XP
    SELECT * INTO v_challenge
    FROM public.challenges
    WHERE id = v_attempt.challenge_id;

    IF v_challenge.id IS NOT NULL THEN
        v_base_xp := COALESCE(v_challenge.xp_reward, 30);
    END IF;

    -- Calculate XP bonuses
    IF p_is_daily_mission THEN
        v_daily_bonus := 20;
    END IF;
    IF p_is_weakness THEN
        v_weakness_bonus := 10;
    END IF;
    IF p_is_personal_best THEN
        v_best_bonus := 25;
    END IF;

    v_total_earned_xp := v_base_xp + v_daily_bonus + v_weakness_bonus + v_best_bonus;

    -- 1. Update attempt status
    UPDATE public.challenge_attempts
    SET 
        status = 'COMPLETED',
        completed_at = now(),
        duration_seconds = COALESCE((p_metrics->>'durationSeconds')::INTEGER, (p_metrics->>'duration_seconds')::INTEGER, duration_seconds),
        word_count = COALESCE((p_metrics->>'wordCount')::INTEGER, (p_metrics->>'word_count')::INTEGER, word_count),
        words_per_minute = COALESCE((p_metrics->>'wpm')::NUMERIC, (p_metrics->>'words_per_minute')::NUMERIC, words_per_minute)
    WHERE id = p_attempt_id;

    -- 2. Upsert speech_metrics
    INSERT INTO public.speech_metrics (
        attempt_id,
        duration_seconds,
        word_count,
        words_per_minute,
        filler_count,
        repetition_count,
        sentence_count,
        average_sentence_length,
        vocabulary_diversity
    ) VALUES (
        p_attempt_id,
        COALESCE((p_metrics->>'durationSeconds')::INTEGER, (p_metrics->>'duration_seconds')::INTEGER, 0),
        COALESCE((p_metrics->>'wordCount')::INTEGER, (p_metrics->>'word_count')::INTEGER, 0),
        COALESCE((p_metrics->>'wpm')::NUMERIC, (p_metrics->>'words_per_minute')::NUMERIC, 0),
        COALESCE((p_metrics->>'fillerCount')::INTEGER, (p_metrics->>'filler_count')::INTEGER, 0),
        COALESCE((p_metrics->>'repetitionCount')::INTEGER, (p_metrics->>'repetition_count')::INTEGER, 0),
        COALESCE((p_metrics->>'sentenceCount')::INTEGER, (p_metrics->>'sentence_count')::INTEGER, 0),
        COALESCE((p_metrics->>'averageSentenceLength')::NUMERIC, (p_metrics->>'average_sentence_length')::NUMERIC, 0),
        COALESCE((p_metrics->>'vocabularyDiversity')::NUMERIC, (p_metrics->>'vocabulary_diversity')::NUMERIC, 0)
    )
    ON CONFLICT (attempt_id) DO UPDATE SET
        duration_seconds = EXCLUDED.duration_seconds,
        word_count = EXCLUDED.word_count,
        words_per_minute = EXCLUDED.words_per_minute,
        filler_count = EXCLUDED.filler_count,
        repetition_count = EXCLUDED.repetition_count,
        sentence_count = EXCLUDED.sentence_count,
        average_sentence_length = EXCLUDED.average_sentence_length,
        vocabulary_diversity = EXCLUDED.vocabulary_diversity;

    -- 3. Upsert attempt_analysis
    INSERT INTO public.attempt_analysis (
        attempt_id,
        overall_score,
        fluency_score,
        clarity_score,
        vocabulary_score,
        grammar_score,
        confidence_score,
        strengths,
        improvements,
        analysis_version
    ) VALUES (
        p_attempt_id,
        v_overall_score,
        v_fluency,
        v_clarity,
        v_vocabulary,
        v_grammar,
        v_confidence,
        p_strengths,
        p_improvements,
        p_analysis_version
    )
    ON CONFLICT (attempt_id) DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        fluency_score = EXCLUDED.fluency_score,
        clarity_score = EXCLUDED.clarity_score,
        vocabulary_score = EXCLUDED.vocabulary_score,
        grammar_score = EXCLUDED.grammar_score,
        confidence_score = EXCLUDED.confidence_score,
        strengths = EXCLUDED.strengths,
        improvements = EXCLUDED.improvements,
        analysis_version = EXCLUDED.analysis_version;

    -- 4. Update user skills with multi-session trend tracking
    PERFORM public.update_user_skill_atomic(v_user_id, 'Fluency', v_fluency);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Clarity', v_clarity);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Vocabulary', v_vocabulary);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Grammar', v_grammar);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Confidence', v_confidence);

    -- 5. Streak calculation
    SELECT current_streak, longest_streak, last_activity_date
    INTO v_current_streak, v_longest_streak, v_last_activity
    FROM public.user_streaks
    WHERE user_id = v_user_id;

    IF v_last_activity IS NULL THEN
        v_current_streak := 1;
        v_longest_streak := 1;
    ELSIF v_last_activity = v_yesterday THEN
        v_current_streak := COALESCE(v_current_streak, 0) + 1;
        v_longest_streak := GREATEST(COALESCE(v_longest_streak, 1), v_current_streak);
    ELSIF v_last_activity < v_yesterday THEN
        v_current_streak := 1;
    END IF;

    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (v_user_id, v_current_streak, v_longest_streak, v_today, now())
    ON CONFLICT (user_id) DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = now();

    -- 6. Record XP Ledger events
    INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
    VALUES (v_user_id, 'challenge_completed', v_base_xp, p_attempt_id, jsonb_build_object('challenge_id', v_attempt.challenge_id))
    ON CONFLICT (attempt_id, event_type) DO NOTHING;

    IF p_is_daily_mission AND v_daily_bonus > 0 THEN
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
        VALUES (v_user_id, 'daily_mission_completed', v_daily_bonus, p_attempt_id, jsonb_build_object('mission_date', v_today))
        ON CONFLICT (attempt_id, event_type) DO NOTHING;

        UPDATE public.daily_missions
        SET completed = true, completed_at = now()
        WHERE user_id = v_user_id AND mission_date = v_today;
    END IF;

    IF p_is_weakness AND v_weakness_bonus > 0 THEN
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
        VALUES (v_user_id, 'weakness_bonus', v_weakness_bonus, p_attempt_id, jsonb_build_object('challenge_id', v_attempt.challenge_id))
        ON CONFLICT (attempt_id, event_type) DO NOTHING;
    END IF;

    IF p_is_personal_best AND v_best_bonus > 0 THEN
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
        VALUES (v_user_id, 'personal_best', v_best_bonus, p_attempt_id, jsonb_build_object('challenge_id', v_attempt.challenge_id))
        ON CONFLICT (attempt_id, event_type) DO NOTHING;
    END IF;

    -- Compute Authoritative XP Sum from Ledger
    SELECT COALESCE(SUM(xp_amount), 0) INTO v_total_xp_sum
    FROM public.xp_events
    WHERE user_id = v_user_id;

    -- Sync legacy profile XP and user_progress for secondary compatibility
    UPDATE public.profiles
    SET xp = v_total_xp_sum
    WHERE user_id = v_user_id;

    UPDATE public.user_progress
    SET 
        current_streak = v_current_streak,
        total_sessions = COALESCE(total_sessions, 0) + 1,
        last_practice_date = now()
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'status', 'COMPLETED',
        'attempt_id', p_attempt_id,
        'earned_xp', jsonb_build_object(
            'base', v_base_xp,
            'dailyBonus', v_daily_bonus,
            'weaknessBonus', v_weakness_bonus,
            'personalBestBonus', v_best_bonus,
            'total', v_base_xp + v_daily_bonus + v_weakness_bonus + v_best_bonus
        ),
        'total_xp', v_total_xp_sum,
        'current_streak', v_current_streak
    );
END;
$$;
