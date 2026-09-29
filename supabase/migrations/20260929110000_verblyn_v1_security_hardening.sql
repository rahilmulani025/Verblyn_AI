-- ============================================================================
-- VERBLYN V1 SECURITY & DATA INTEGRITY HARDENING MIGRATION
-- Locks down direct client mutation on progression & ledger tables.
-- All XP, streaks, scores, and baseline updates MUST pass through
-- audited SECURITY DEFINER functions.
-- ============================================================================

-- 1. HELPER: ATOMIC USER SKILL UPDATE (BASELINE IMMUTABILITY & MULTI-SESSION TREND)
CREATE OR REPLACE FUNCTION public.update_user_skill_atomic(
    p_user_id UUID,
    p_skill_name TEXT,
    p_new_score INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing public.user_skills%ROWTYPE;
    v_trend TEXT := 'steady';
    v_recent_count INTEGER := 0;
    v_recent_avg NUMERIC := 0;
BEGIN
    SELECT * INTO v_existing
    FROM public.user_skills
    WHERE user_id = p_user_id AND skill_name = p_skill_name;

    IF v_existing.id IS NULL THEN
        -- Initial insert (only happens during baseline assessment)
        INSERT INTO public.user_skills (
            user_id, skill_name, baseline_score, current_score, best_score, trend, last_assessed_at
        ) VALUES (
            p_user_id, p_skill_name, p_new_score, p_new_score, p_new_score, 'steady', now()
        )
        ON CONFLICT (user_id, skill_name) DO NOTHING;
    ELSE
        -- Baseline score is strictly IMMUTABLE!
        -- Determine multi-session trend from past 5 completed attempts
        SELECT COUNT(*), COALESCE(AVG(aa.overall_score), 0)
        INTO v_recent_count, v_recent_avg
        FROM public.attempt_analysis aa
        JOIN public.challenge_attempts ca ON ca.id = aa.attempt_id
        WHERE ca.user_id = p_user_id AND ca.status = 'COMPLETED';

        IF v_recent_count < 3 THEN
            v_trend := 'steady';
        ELSIF p_new_score >= COALESCE(v_existing.baseline_score, 70) + 4 THEN
            v_trend := 'improving';
        ELSIF p_new_score <= COALESCE(v_existing.baseline_score, 70) - 6 THEN
            v_trend := 'declining';
        ELSE
            v_trend := 'steady';
        END IF;

        UPDATE public.user_skills
        SET 
            current_score = p_new_score,
            best_score = GREATEST(COALESCE(best_score, 0), p_new_score),
            trend = v_trend,
            last_assessed_at = now(),
            updated_at = now()
        WHERE user_id = p_user_id AND skill_name = p_skill_name;
    END IF;
END;
$$;

-- 2. HARDENED ATOMIC PERSISTENCE FUNCTION
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
    v_weakness_elem JSONB;
    v_w_type TEXT;
    v_w_skill TEXT;
    v_w_evidence TEXT;
    v_w_conf INTEGER;
BEGIN
    -- Fetch attempt
    SELECT * INTO v_attempt
    FROM public.challenge_attempts
    WHERE id = p_attempt_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found: %', p_attempt_id;
    END IF;

    -- Security check: caller must be row owner OR service_role
    IF v_caller_id IS NOT NULL THEN
        IF v_attempt.user_id <> v_caller_id THEN
            RAISE EXCEPTION 'Unauthorized attempt ownership mismatch';
        END IF;
        v_user_id := v_caller_id;
    ELSE
        -- Service role call
        v_user_id := v_attempt.user_id;
    END IF;

    -- Fetch Challenge Meta
    SELECT * INTO v_challenge
    FROM public.challenges
    WHERE id = v_attempt.challenge_id;

    IF v_challenge.id IS NOT NULL THEN
        v_base_xp := COALESCE(v_challenge.xp_reward, 30);
    END IF;

    -- Extract & Validate Scores (Bounded 0 to 100)
    v_overall_score := LEAST(100, GREATEST(0, COALESCE((p_scores->>'overallScore')::INTEGER, (p_scores->>'overall_score')::INTEGER, 75)));
    v_fluency := LEAST(100, GREATEST(0, COALESCE((p_scores->>'fluency')::INTEGER, 75)));
    v_clarity := LEAST(100, GREATEST(0, COALESCE((p_scores->>'clarity')::INTEGER, 75)));
    v_vocabulary := LEAST(100, GREATEST(0, COALESCE((p_scores->>'vocabulary')::INTEGER, 75)));
    v_grammar := LEAST(100, GREATEST(0, COALESCE((p_scores->>'grammar')::INTEGER, 75)));
    v_confidence := LEAST(100, GREATEST(0, COALESCE((p_scores->>'confidence')::INTEGER, 75)));

    -- B. Transition Attempt to COMPLETED
    UPDATE public.challenge_attempts
    SET 
        status = 'COMPLETED',
        completed_at = now(),
        duration_seconds = COALESCE((p_metrics->>'duration_seconds')::INTEGER, (p_metrics->>'durationSeconds')::INTEGER, duration_seconds),
        word_count = COALESCE((p_metrics->>'word_count')::INTEGER, (p_metrics->>'wordCount')::INTEGER, word_count),
        words_per_minute = COALESCE((p_metrics->>'words_per_minute')::NUMERIC, (p_metrics->>'wordsPerMinute')::NUMERIC, words_per_minute)
    WHERE id = p_attempt_id;

    -- C. Persist Authoritative speech_metrics
    INSERT INTO public.speech_metrics (
        attempt_id,
        duration_seconds,
        word_count,
        words_per_minute,
        pause_count,
        average_pause_duration,
        filler_count,
        repetition_count,
        sentence_count,
        average_sentence_length,
        vocabulary_diversity
    ) VALUES (
        p_attempt_id,
        COALESCE((p_metrics->>'duration_seconds')::INTEGER, (p_metrics->>'durationSeconds')::INTEGER, 0),
        COALESCE((p_metrics->>'word_count')::INTEGER, (p_metrics->>'wordCount')::INTEGER, 0),
        COALESCE((p_metrics->>'words_per_minute')::NUMERIC, (p_metrics->>'wordsPerMinute')::NUMERIC, 0),
        (p_metrics->>'pause_count')::INTEGER,
        (p_metrics->>'average_pause_duration')::NUMERIC,
        COALESCE((p_metrics->>'filler_count')::INTEGER, (p_metrics->>'fillerCount')::INTEGER, 0),
        COALESCE((p_metrics->>'repetition_count')::INTEGER, (p_metrics->>'repetitionCount')::INTEGER, 0),
        COALESCE((p_metrics->>'sentence_count')::INTEGER, (p_metrics->>'sentenceCount')::INTEGER, 0),
        COALESCE((p_metrics->>'average_sentence_length')::NUMERIC, (p_metrics->>'averageSentenceLength')::NUMERIC, 0),
        COALESCE((p_metrics->>'vocabulary_diversity')::NUMERIC, (p_metrics->>'vocabularyDiversity')::NUMERIC, 0)
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

    -- D. Persist attempt_analysis
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
        coach_message,
        recommended_focus,
        weakness_candidates,
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
        p_coach_message,
        p_recommended_focus,
        p_weakness_candidates,
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
        coach_message = EXCLUDED.coach_message,
        recommended_focus = EXCLUDED.recommended_focus,
        weakness_candidates = EXCLUDED.weakness_candidates,
        analysis_version = EXCLUDED.analysis_version;

    -- E. Weakness Processing (Controlled Types & Multi-Session Status Transitions)
    IF jsonb_typeof(p_weakness_candidates) = 'array' THEN
        FOR v_weakness_elem IN SELECT * FROM jsonb_array_elements(p_weakness_candidates)
        LOOP
            v_w_type := v_weakness_elem->>'type';
            v_w_skill := COALESCE(v_weakness_elem->>'skill', 'Fluency');
            v_w_evidence := SUBSTRING(COALESCE(v_weakness_elem->>'evidence', ''), 1, 300);
            v_w_conf := LEAST(100, GREATEST(0, COALESCE((v_weakness_elem->>'confidence')::INTEGER, 75)));

            IF v_w_type IS NOT NULL AND v_w_type <> '' THEN
                INSERT INTO public.user_weaknesses (
                    user_id,
                    weakness_type,
                    weakness_label,
                    skill_name,
                    confidence_level,
                    occurrence_count,
                    status,
                    evidence_summary,
                    first_detected_at,
                    last_detected_at
                ) VALUES (
                    v_user_id,
                    v_w_type,
                    INITCAP(REPLACE(v_w_type, '_', ' ')),
                    v_w_skill,
                    v_w_conf,
                    1,
                    'ACTIVE',
                    v_w_evidence,
                    now(),
                    now()
                )
                ON CONFLICT (user_id, weakness_type) DO UPDATE SET
                    occurrence_count = public.user_weaknesses.occurrence_count + 1,
                    confidence_level = LEAST(100, GREATEST(public.user_weaknesses.confidence_level, EXCLUDED.confidence_level)),
                    evidence_summary = EXCLUDED.evidence_summary,
                    last_detected_at = now(),
                    status = CASE 
                        WHEN public.user_weaknesses.occurrence_count >= 2 AND v_overall_score >= 82 THEN 'IMPROVING'
                        ELSE public.user_weaknesses.status
                    END;
            END IF;
        END LOOP;
    END IF;

    -- F. Update user_skills (Atomic & Immutability Protected)
    PERFORM public.update_user_skill_atomic(v_user_id, 'Fluency', v_fluency);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Clarity', v_clarity);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Vocabulary', v_vocabulary);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Grammar', v_grammar);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Confidence', v_confidence);

    -- G. Authoritative Streak Update (Calendar Continuity Invariant)
    SELECT current_streak, longest_streak, last_activity_date
    INTO v_current_streak, v_longest_streak, v_last_activity
    FROM public.user_streaks
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        v_current_streak := 1;
        v_longest_streak := 1;
        INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date)
        VALUES (v_user_id, 1, 1, v_today);
    ELSE
        IF v_last_activity = v_today THEN
            -- Same calendar day: Keep streak unchanged
            NULL;
        ELSIF v_last_activity = v_yesterday THEN
            -- Exactly next day: Increment streak
            v_current_streak := v_current_streak + 1;
            IF v_current_streak > v_longest_streak THEN
                v_longest_streak := v_current_streak;
            END IF;
            UPDATE public.user_streaks
            SET current_streak = v_current_streak,
                longest_streak = v_longest_streak,
                last_activity_date = v_today,
                updated_at = now()
            WHERE user_id = v_user_id;
        ELSE
            -- Gap of 2+ days: Reset to 1
            v_current_streak := 1;
            UPDATE public.user_streaks
            SET current_streak = 1,
                last_activity_date = v_today,
                updated_at = now()
            WHERE user_id = v_user_id;
        END IF;
    END IF;

    -- H. Idempotent XP Awards (Unique Attempt & Event Constraints)
    IF p_is_daily_mission THEN
        v_daily_bonus := 20;
    END IF;
    IF p_is_weakness THEN
        v_weakness_bonus := 10;
    END IF;
    IF p_is_personal_best THEN
        v_best_bonus := 25;
    END IF;

    -- Base Challenge XP
    INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
    VALUES (v_user_id, 'challenge_completed', v_base_xp, p_attempt_id, jsonb_build_object('challenge_id', v_attempt.challenge_id))
    ON CONFLICT (attempt_id, event_type) DO NOTHING;

    -- Daily Mission Bonus
    IF v_daily_bonus > 0 THEN
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
        VALUES (v_user_id, 'daily_mission_completed', v_daily_bonus, p_attempt_id, jsonb_build_object('challenge_id', v_attempt.challenge_id))
        ON CONFLICT (attempt_id, event_type) DO NOTHING;

        UPDATE public.daily_missions
        SET completed = true, completed_at = now()
        WHERE user_id = v_user_id AND mission_date = v_today;
    END IF;

    -- Weakness Bonus
    IF v_weakness_bonus > 0 THEN
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
        VALUES (v_user_id, 'weakness_bonus', v_weakness_bonus, p_attempt_id, jsonb_build_object('challenge_id', v_attempt.challenge_id))
        ON CONFLICT (attempt_id, event_type) DO NOTHING;
    END IF;

    -- Personal Best Bonus
    IF v_best_bonus > 0 THEN
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
    WHERE id = v_user_id;

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
        'streak', v_current_streak,
        'longest_streak', v_longest_streak,
        'overall_score', v_overall_score
    );
END;
$$;

-- 3. RLS HARDENING: PREVENT DIRECT CLIENT WRITE TAMPERING
-- Sensitive ledger & progression tables allow SELECT only to authenticated owners;
-- direct client INSERT/UPDATE/DELETE is revoked.
DROP POLICY IF EXISTS "Users can view own xp events" ON public.xp_events;
DROP POLICY IF EXISTS "Users can manage own xp events" ON public.xp_events;
CREATE POLICY "Users can view own xp events" ON public.xp_events
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own streaks" ON public.user_streaks;
CREATE POLICY "Users can view own streaks" ON public.user_streaks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own user skills" ON public.user_skills;
CREATE POLICY "Users can view own user skills" ON public.user_skills
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own attempt analysis" ON public.attempt_analysis;
CREATE POLICY "Users can view own attempt analysis" ON public.attempt_analysis
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.challenge_attempts ca
            WHERE ca.id = public.attempt_analysis.attempt_id
            AND ca.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own speech metrics" ON public.speech_metrics;
CREATE POLICY "Users can view own speech metrics" ON public.speech_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.challenge_attempts ca
            WHERE ca.id = public.speech_metrics.attempt_id
            AND ca.user_id = auth.uid()
        )
    );
