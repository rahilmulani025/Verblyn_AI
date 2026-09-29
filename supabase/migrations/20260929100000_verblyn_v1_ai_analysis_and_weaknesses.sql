-- ============================================================================
-- VERBLYN V1 AI ANALYSIS & WEAKNESS TRACKING HARDENING MIGRATION
-- Additive migration for AI coaching, recurring weakness detection,
-- hybrid scoring, and atomic server progression.
-- ============================================================================

-- 1. EXTEND USER_WEAKNESSES FOR OCCURRENCE TRACKING & STATUS
ALTER TABLE public.user_weaknesses 
    ADD COLUMN IF NOT EXISTS weakness_type TEXT,
    ADD COLUMN IF NOT EXISTS skill_name TEXT DEFAULT 'Fluency',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'IMPROVING', 'RESOLVED')),
    ADD COLUMN IF NOT EXISTS occurrence_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS evidence_summary TEXT,
    ADD COLUMN IF NOT EXISTS first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ADD COLUMN IF NOT EXISTS last_detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Create unique index on user_id + weakness_type to enable UPSERT occurrence tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_weakness_type'
    ) THEN
        ALTER TABLE public.user_weaknesses 
        ADD CONSTRAINT unique_user_weakness_type UNIQUE (user_id, weakness_type);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        NULL;
END $$;

-- 2. EXTEND ATTEMPT_ANALYSIS FOR RICH COACHING FEEDBACK
ALTER TABLE public.attempt_analysis
    ADD COLUMN IF NOT EXISTS coach_message TEXT,
    ADD COLUMN IF NOT EXISTS recommended_focus TEXT,
    ADD COLUMN IF NOT EXISTS weakness_candidates JSONB DEFAULT '[]'::jsonb;

-- 3. SERVER-AUTHORITATIVE ATOMIC PROGRESSION FUNCTION
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
    v_user_id UUID := auth.uid();
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
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User session required';
    END IF;

    -- A. Verify Attempt Ownership
    SELECT * INTO v_attempt
    FROM public.challenge_attempts
    WHERE id = p_attempt_id AND user_id = v_user_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found or unauthorized';
    END IF;

    -- Fetch Challenge Meta
    SELECT * INTO v_challenge
    FROM public.challenges
    WHERE id = v_attempt.challenge_id;

    IF v_challenge.id IS NOT NULL THEN
        v_base_xp := COALESCE(v_challenge.xp_reward, 30);
    END IF;

    -- Extract Scores safely
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

    -- E. Weakness Processing (Occurrences, Confidence & Status Transitions)
    IF jsonb_typeof(p_weakness_candidates) = 'array' THEN
        FOR v_weakness_elem IN SELECT * FROM jsonb_array_elements(p_weakness_candidates)
        LOOP
            v_w_type := v_weakness_elem->>'type';
            v_w_skill := COALESCE(v_weakness_elem->>'skill', 'Fluency');
            v_w_evidence := COALESCE(v_weakness_elem->>'evidence', '');
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
                        WHEN public.user_weaknesses.occurrence_count >= 2 AND v_overall_score >= 80 THEN 'IMPROVING'
                        ELSE 'ACTIVE'
                    END;
            END IF;
        END LOOP;
    END IF;

    -- F. Update user_skills (Never overwriting baseline_score)
    PERFORM public.update_user_skill_atomic(v_user_id, 'Fluency', v_fluency);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Clarity', v_clarity);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Vocabulary', v_vocabulary);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Grammar', v_grammar);
    PERFORM public.update_user_skill_atomic(v_user_id, 'Confidence', v_confidence);

    -- G. Authoritative Streak Update
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
            -- Same day: Keep streak unchanged
            NULL;
        ELSIF v_last_activity = v_yesterday THEN
            -- Next day: Increment streak
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

    -- H. Idempotent XP Awards
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

    -- Calculate total cumulative XP
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
