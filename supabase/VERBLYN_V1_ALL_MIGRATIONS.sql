-- ============================================================================
-- VERBLYN V1 LEARNING FOUNDATION MIGRATION
-- Additive migration introducing V1 learning engine data model.
-- Legacy tables (profiles, speaking_sessions, user_progress) are preserved.
-- ============================================================================

-- 1. SKILLS CATALOGUE
CREATE TABLE IF NOT EXISTS public.skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Core',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed core skills idempotently
INSERT INTO public.skills (id, name, description, category)
VALUES 
    ('fluency', 'Fluency', 'Pacing cadence, continuous speech flow, and rhythm.', 'Delivery'),
    ('clarity', 'Clarity', 'Information structure, concise sentence framing, and simplicity.', 'Structure'),
    ('vocabulary', 'Vocabulary', 'Lexical richness, power action verbs, and word precision.', 'Content'),
    ('grammar', 'Grammar', 'Filler word reduction, repetition control, and verbal discipline.', 'Discipline'),
    ('confidence', 'Confidence', 'Assertive framing, steady delivery, and conviction.', 'Delivery')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. USER SKILLS
CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    baseline_score INTEGER DEFAULT 70 CHECK (baseline_score >= 0 AND baseline_score <= 100),
    current_score INTEGER DEFAULT 70 CHECK (current_score >= 0 AND current_score <= 100),
    best_score INTEGER DEFAULT 70 CHECK (best_score >= 0 AND best_score <= 100),
    trend TEXT DEFAULT 'steady' CHECK (trend IN ('improving', 'steady', 'declining')),
    last_assessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT unique_user_skill UNIQUE (user_id, skill_name)
);

-- 3. USER GOALS & WEAKNESSES
CREATE TABLE IF NOT EXISTS public.user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id TEXT NOT NULL,
    target_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_weaknesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    weakness_label TEXT NOT NULL,
    confidence_level INTEGER DEFAULT 80,
    resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. CHALLENGES CATALOGUE
CREATE TABLE IF NOT EXISTS public.challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    short_description TEXT NOT NULL,
    why_it_matters TEXT NOT NULL,
    target_skill TEXT NOT NULL,
    challenge_type TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL DEFAULT 1,
    difficulty_label TEXT NOT NULL DEFAULT 'Beginner',
    duration_seconds INTEGER NOT NULL DEFAULT 60,
    prompt TEXT NOT NULL,
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_behavior TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 30,
    goal_tags TEXT[] DEFAULT '{}',
    target_weakness TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed curated challenge library idempotently
INSERT INTO public.challenges (
    id, title, short_description, why_it_matters, target_skill, challenge_type,
    difficulty_level, difficulty_label, duration_seconds, prompt, instructions,
    expected_behavior, xp_reward, goal_tags, target_weakness
) VALUES
(
    'fluency-filler-reduction-45',
    '45-Second Filler Detox',
    'Speak for 45 seconds continuously without relying on verbal fillers (um, uh, like).',
    'Replacing filler sounds with confident silence instantly enhances authority.',
    'Fluency',
    'timed_speaking',
    1,
    'Beginner',
    45,
    'Describe your favorite productivity habit and explain why it works for you.',
    '["Speak at a calm, controlled tempo.", "If you lose your train of thought, pause silently for 1 second instead of saying um or like.", "Keep going until the 45-second timer concludes."]'::jsonb,
    'Zero or minimal filler words with steady, deliberate cadence.',
    30,
    ARRAY['EVERYDAY_COMMUNICATION', 'PUBLIC_SPEAKING', 'WORKPLACE_COMMUNICATION'],
    'Filler Word Elimination'
),
(
    'fluency-rapid-pitch-60',
    '60-Second Momentum Drill',
    'Deliver a continuous 60-second pitch without stalling or second-guessing.',
    'Builds flow state and trains you to think ahead while speaking.',
    'Fluency',
    'rapid_response',
    2,
    'Intermediate',
    60,
    'Tell me about your latest project or coursework in 60 seconds.',
    '["Start with a 1-sentence summary of what it is.", "Highlight 1 core challenge you solved.", "Finish with the real-world value or lesson learned."]'::jsonb,
    'Continuous speech flow maintaining 130-150 WPM.',
    30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'],
    'Pacing & Cadence'
),
(
    'clarity-explain-simply-60',
    'Explain to a 10-Year-Old',
    'Explain a technical or complex concept in simple, accessible language.',
    'True mastery of a subject is proven by making it crystal clear to anyone.',
    'Clarity',
    'explain_simply',
    2,
    'Intermediate',
    60,
    'Explain how Cloud Computing or APIs work to someone with zero technical background.',
    '["Use a physical real-world analogy (e.g. restaurant kitchen or postal service).", "Avoid technical acronyms and jargon.", "Keep sentence structures under 15 words each."]'::jsonb,
    'Jargon-free clarity using short, punchy sentence structures.',
    30,
    ARRAY['CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'],
    'Sentence Framing & Clarity'
),
(
    'clarity-concise-answer-45',
    'The 45-Second Executive Update',
    'Summarize a complex weekly status update in under 45 seconds.',
    'Executives and recruiters value brevity and high information density.',
    'Clarity',
    'concise_answer',
    3,
    'Advanced',
    45,
    'Give a 45-second status update on an initiative where something went wrong and how you fixed it.',
    '["Headline (10s): State current status and the main blocker.", "Action (20s): Outline the immediate fix deployed.", "Next Step (15s): Give the clear timeline to completion."]'::jsonb,
    'High information density with structured transitions.',
    30,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'],
    'Sentence Framing & Clarity'
),
(
    'vocab-professional-precision-60',
    'Power Verb Precision',
    'Describe a past achievement using precise action verbs instead of generic words.',
    'Specific action verbs (orchestrated, streamlined, spearheaded) project high capability.',
    'Vocabulary',
    'explain_simply',
    2,
    'Intermediate',
    60,
    'Describe a significant accomplishment. Replace words like did, made, worked on with precise action verbs.',
    '["Use at least 3 distinct action verbs (e.g. engineered, resolved, accelerated).", "Articulate the measurable impact of your work.", "Maintain lexical variety without repeating common descriptors."]'::jsonb,
    'High lexical diversity (TTR > 0.65) with descriptive precision.',
    30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'],
    'Vocabulary Breadth'
),
(
    'interview-tell-me-about-yourself-60',
    'The "Tell Me About Yourself" Hook',
    'Deliver a crisp 60-second self-introduction tailored for recruiters.',
    'First impressions in interviews set the tone for the entire conversation.',
    'Clarity',
    'interview_answer',
    1,
    'Beginner',
    60,
    'Answer: "Tell me about yourself, your background, and what excites you right now."',
    '["Present (20s): Current role/studies and core expertise.", "Past (20s): 1 standout milestone or formative experience.", "Future (20s): Why you are excited about upcoming opportunities."]'::jsonb,
    'Present-Past-Future narrative structure with confidence.',
    30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS'],
    'Sentence Framing & Clarity'
),
(
    'interview-star-behavioral-90',
    'STAR Conflict Resolution',
    'Structure a behavioral interview response using Situation, Task, Action, and Result.',
    'STAR method prevents rambling and ensures you provide concrete behavioral evidence.',
    'Confidence',
    'interview_answer',
    3,
    'Advanced',
    90,
    'Describe a time you disagreed with a colleague or teammate on an approach and how you resolved it.',
    '["Situation & Task (25s): The context and the point of disagreement.", "Action (40s): How you initiated a constructive conversation.", "Result (25s): The mutual outcome and what was learned."]'::jsonb,
    'Evenly apportioned STAR delivery without rambling.',
    30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'],
    'Pacing & Cadence'
),
(
    'confidence-assertive-opinion-60',
    'Defend a Controversial View',
    'State a clear opinion and back it up with two compelling arguments in 60 seconds.',
    'Eliminates apologetic hedging words like "I guess" or "sort of".',
    'Confidence',
    'concise_answer',
    2,
    'Intermediate',
    60,
    'Pick a trend in technology, work, or education that you disagree with and explain why with two reasons.',
    '["Open with an unambiguous thesis statement in the first 10 seconds.", "Support with Reason 1 (20s) and Reason 2 (20s).", "Close decisively without trailing off."]'::jsonb,
    'Firm vocal assertion free from passive hedging language.',
    30,
    ARRAY['GROUP_DISCUSSIONS', 'WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'],
    'Filler Word Elimination'
),
(
    'storytelling-hero-moment-60',
    'The 3-Act Mini Story',
    'Narrate a memorable personal anecdote with a clear beginning, middle, and climax.',
    'Storytelling makes information memorable and emotionally engaging.',
    'Fluency',
    'storytelling',
    2,
    'Intermediate',
    60,
    'Tell a 60-second story about a time when an unexpected obstacle forced you to adapt quickly.',
    '["Act 1 - Setup (15s): What was supposed to happen.", "Act 2 - Crisis (30s): The sudden obstacle and what you did.", "Act 3 - Resolution (15s): The outcome and takeaway."]'::jsonb,
    'Vivid narrative flow with clear dynamic pacing changes.',
    30,
    ARRAY['PUBLIC_SPEAKING', 'EVERYDAY_COMMUNICATION', 'JOB_INTERVIEWS'],
    'Pacing & Cadence'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    short_description = EXCLUDED.short_description,
    why_it_matters = EXCLUDED.why_it_matters,
    target_skill = EXCLUDED.target_skill,
    challenge_type = EXCLUDED.challenge_type,
    difficulty_level = EXCLUDED.difficulty_level,
    difficulty_label = EXCLUDED.difficulty_label,
    duration_seconds = EXCLUDED.duration_seconds,
    prompt = EXCLUDED.prompt,
    instructions = EXCLUDED.instructions,
    expected_behavior = EXCLUDED.expected_behavior,
    xp_reward = EXCLUDED.xp_reward,
    goal_tags = EXCLUDED.goal_tags,
    target_weakness = EXCLUDED.target_weakness;

-- 5. CHALLENGE ATTEMPTS
CREATE TABLE IF NOT EXISTS public.challenge_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id TEXT NOT NULL REFERENCES public.challenges(id),
    status TEXT NOT NULL DEFAULT 'STARTED' CHECK (status IN ('STARTED', 'IN_PROGRESS', 'SUBMITTED', 'ANALYZING', 'COMPLETED', 'FAILED', 'ABANDONED')),
    duration_seconds INTEGER DEFAULT 0,
    transcript TEXT,
    word_count INTEGER DEFAULT 0,
    words_per_minute NUMERIC(6,2) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. SPEECH METRICS
CREATE TABLE IF NOT EXISTS public.speech_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.challenge_attempts(id) ON DELETE CASCADE UNIQUE,
    duration_seconds INTEGER NOT NULL,
    word_count INTEGER NOT NULL,
    words_per_minute NUMERIC(6,2) NOT NULL,
    pause_count INTEGER,
    average_pause_duration NUMERIC(5,2),
    filler_count INTEGER NOT NULL DEFAULT 0,
    repetition_count INTEGER NOT NULL DEFAULT 0,
    sentence_count INTEGER NOT NULL DEFAULT 0,
    average_sentence_length NUMERIC(5,2) NOT NULL DEFAULT 0,
    vocabulary_diversity NUMERIC(5,3) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. ATTEMPT ANALYSIS
CREATE TABLE IF NOT EXISTS public.attempt_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.challenge_attempts(id) ON DELETE CASCADE UNIQUE,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    fluency_score INTEGER NOT NULL CHECK (fluency_score >= 0 AND fluency_score <= 100),
    clarity_score INTEGER NOT NULL CHECK (clarity_score >= 0 AND clarity_score <= 100),
    vocabulary_score INTEGER NOT NULL CHECK (vocabulary_score >= 0 AND vocabulary_score <= 100),
    grammar_score INTEGER NOT NULL CHECK (grammar_score >= 0 AND grammar_score <= 100),
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
    improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
    analysis_version TEXT NOT NULL DEFAULT 'deterministic-v1',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. DAILY MISSIONS (Authoritative Table)
CREATE TABLE IF NOT EXISTS public.daily_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mission_date DATE NOT NULL,
    challenge_id TEXT NOT NULL REFERENCES public.challenges(id),
    focus_skill TEXT NOT NULL DEFAULT 'Fluency',
    reward_xp INTEGER NOT NULL DEFAULT 50,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_mission_date UNIQUE (user_id, mission_date)
);

-- 9. XP LEDGER (Authoritative Source of Truth)
CREATE TABLE IF NOT EXISTS public.xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('challenge_completed', 'daily_mission_completed', 'weakness_bonus', 'personal_best', 'level_up', 'baseline_completed')),
    xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
    attempt_id UUID REFERENCES public.challenge_attempts(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_attempt_event_type UNIQUE (attempt_id, event_type)
);

-- 10. USER STREAKS (Authoritative Source of Truth)
CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. LEVELS & ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.levels (
    level INTEGER PRIMARY KEY,
    min_xp INTEGER NOT NULL,
    max_xp INTEGER NOT NULL,
    title TEXT NOT NULL
);

INSERT INTO public.levels (level, min_xp, max_xp, title)
VALUES
    (1, 0, 100, 'Apprentice Speaker'),
    (2, 100, 250, 'Practiced Articulator'),
    (3, 250, 450, 'Confident Communicator'),
    (4, 450, 700, 'Persuasive Orator'),
    (5, 700, 1000, 'Executive Voice'),
    (6, 1000, 1400, 'Master Storyteller'),
    (7, 1400, 1900, 'Vocal Strategist'),
    (8, 1900, 2500, 'Elite Presenter')
ON CONFLICT (level) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Milestone',
    icon TEXT NOT NULL DEFAULT 'Sparkles',
    target_value INTEGER NOT NULL DEFAULT 1,
    xp_reward INTEGER NOT NULL DEFAULT 50
);

INSERT INTO public.achievements (id, title, description, category, icon, target_value, xp_reward)
VALUES
    ('first_drill', 'First Words', 'Complete your first speaking challenge drill.', 'Milestone', 'Sparkles', 1, 50),
    ('streak_3', 'Consistency Starter', 'Reach a 3-day continuous practice streak.', 'Streak', 'Flame', 3, 50),
    ('streak_7', 'Unstoppable Voice', 'Maintain a 7-day continuous practice streak.', 'Streak', 'Zap', 7, 100),
    ('sessions_10', 'Committed Orator', 'Complete 10 speaking challenge drills.', 'Milestone', 'Trophy', 10, 150)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES public.achievements(id),
    unlocked BOOLEAN NOT NULL DEFAULT false,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    progress INTEGER NOT NULL DEFAULT 0,
    current_value INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- ============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_weaknesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Catalogue Tables: Read-only for authenticated & anon
CREATE POLICY "Anyone can read skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Anyone can read challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Anyone can read levels" ON public.levels FOR SELECT USING (true);
CREATE POLICY "Anyone can read achievements" ON public.achievements FOR SELECT USING (true);

-- User-Owned Tables Policies
CREATE POLICY "Users can manage own skills" ON public.user_skills
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own goals" ON public.user_goals
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own weaknesses" ON public.user_weaknesses
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own attempts" ON public.challenge_attempts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own speech metrics" ON public.speech_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.challenge_attempts
            WHERE public.challenge_attempts.id = public.speech_metrics.attempt_id
            AND public.challenge_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view own attempt analysis" ON public.attempt_analysis
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.challenge_attempts
            WHERE public.challenge_attempts.id = public.attempt_analysis.attempt_id
            AND public.challenge_attempts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own daily missions" ON public.daily_missions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own xp events" ON public.xp_events
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own streaks" ON public.user_streaks
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own user achievements" ON public.user_achievements
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 13. SERVER-SIDE RPC FUNCTIONS (ATOMIC COMPLETION & IDEMPOTENCY)
-- ============================================================================

-- Function 1: Get or Create Daily Mission Atomically
CREATE OR REPLACE FUNCTION public.get_or_create_daily_mission(
    p_mission_date DATE,
    p_preferred_challenge_id TEXT DEFAULT 'fluency-filler-reduction-45',
    p_focus_skill TEXT DEFAULT 'Fluency'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_mission public.daily_missions%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User session required';
    END IF;

    -- 1. Try to find existing mission for today
    SELECT * INTO v_mission
    FROM public.daily_missions
    WHERE user_id = v_user_id AND mission_date = p_mission_date;

    -- 2. If not found, create it idempotently
    IF v_mission.id IS NULL THEN
        INSERT INTO public.daily_missions (user_id, mission_date, challenge_id, focus_skill, reward_xp)
        VALUES (v_user_id, p_mission_date, p_preferred_challenge_id, p_focus_skill, 50)
        ON CONFLICT (user_id, mission_date) DO NOTHING;

        SELECT * INTO v_mission
        FROM public.daily_missions
        WHERE user_id = v_user_id AND mission_date = p_mission_date;
    END IF;

    RETURN to_jsonb(v_mission);
END;
$$;

-- Function 2: Complete Challenge Attempt Atomically (Server Authoritative)
CREATE OR REPLACE FUNCTION public.complete_challenge_attempt(
    p_attempt_id UUID,
    p_scores JSONB,
    p_metrics JSONB,
    p_strengths JSONB DEFAULT '[]'::jsonb,
    p_improvements JSONB DEFAULT '[]'::jsonb,
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
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User session required';
    END IF;

    -- 1. Verify Attempt Ownership
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

    -- Extract Scores
    v_overall_score := COALESCE((p_scores->>'overallScore')::INTEGER, (p_scores->>'overall')::INTEGER, 75);
    v_fluency := COALESCE((p_scores->>'fluency')::INTEGER, 75);
    v_clarity := COALESCE((p_scores->>'clarity')::INTEGER, 75);
    v_vocabulary := COALESCE((p_scores->>'vocabulary')::INTEGER, 75);
    v_grammar := COALESCE((p_scores->>'grammar')::INTEGER, 75);
    v_confidence := COALESCE((p_scores->>'confidence')::INTEGER, 75);

    -- 2. Transition Attempt to COMPLETED
    UPDATE public.challenge_attempts
    SET 
        status = 'COMPLETED',
        duration_seconds = COALESCE((p_metrics->>'durationSeconds')::INTEGER, v_attempt.duration_seconds),
        word_count = COALESCE((p_metrics->>'wordCount')::INTEGER, v_attempt.word_count),
        words_per_minute = COALESCE((p_metrics->>'wpm')::NUMERIC, v_attempt.words_per_minute),
        completed_at = now()
    WHERE id = p_attempt_id;

    -- 3. Persist Speech Metrics (Idempotent upsert)
    INSERT INTO public.speech_metrics (
        attempt_id, duration_seconds, word_count, words_per_minute,
        filler_count, repetition_count, sentence_count,
        average_sentence_length, vocabulary_diversity
    ) VALUES (
        p_attempt_id,
        COALESCE((p_metrics->>'durationSeconds')::INTEGER, 0),
        COALESCE((p_metrics->>'wordCount')::INTEGER, 0),
        COALESCE((p_metrics->>'wpm')::NUMERIC, 0),
        COALESCE((p_metrics->'fillerStats'->>'total')::INTEGER, 0),
        COALESCE((p_metrics->'repetitionStats'->>'total')::INTEGER, 0),
        COALESCE((p_metrics->>'sentenceCount')::INTEGER, 0),
        COALESCE((p_metrics->>'averageSentenceLength')::NUMERIC, 0),
        COALESCE((p_metrics->>'vocabularyDiversity')::NUMERIC, 0)
    )
    ON CONFLICT (attempt_id) DO NOTHING;

    -- 4. Persist Attempt Analysis (Idempotent upsert)
    INSERT INTO public.attempt_analysis (
        attempt_id, overall_score, fluency_score, clarity_score,
        vocabulary_score, grammar_score, confidence_score,
        strengths, improvements, analysis_version
    ) VALUES (
        p_attempt_id,
        v_overall_score, v_fluency, v_clarity,
        v_vocabulary, v_grammar, v_confidence,
        p_strengths, p_improvements, 'deterministic-v1'
    )
    ON CONFLICT (attempt_id) DO NOTHING;

    -- 5. XP Ledger Creation (Strictly Idempotent)
    -- Base XP Event
    INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
    VALUES (v_user_id, 'challenge_completed', v_base_xp, p_attempt_id, jsonb_build_object('challenge_id', v_attempt.challenge_id))
    ON CONFLICT (attempt_id, event_type) DO NOTHING;
    v_total_earned_xp := v_total_earned_xp + v_base_xp;

    -- Daily Mission Bonus
    IF p_is_daily_mission THEN
        v_daily_bonus := 20;
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
        VALUES (v_user_id, 'daily_mission_completed', v_daily_bonus, p_attempt_id, jsonb_build_object('mission_date', v_today))
        ON CONFLICT (attempt_id, event_type) DO NOTHING;
        v_total_earned_xp := v_total_earned_xp + v_daily_bonus;

        -- Update daily_missions status
        UPDATE public.daily_missions
        SET completed = true, completed_at = now()
        WHERE user_id = v_user_id AND mission_date = v_today;
    END IF;

    -- Weakness Bonus
    IF p_is_weakness THEN
        v_weakness_bonus := 10;
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
        VALUES (v_user_id, 'weakness_bonus', v_weakness_bonus, p_attempt_id, jsonb_build_object('weakness', v_challenge.target_weakness))
        ON CONFLICT (attempt_id, event_type) DO NOTHING;
        v_total_earned_xp := v_total_earned_xp + v_weakness_bonus;
    END IF;

    -- Personal Best Bonus
    IF p_is_personal_best THEN
        v_best_bonus := 25;
        INSERT INTO public.xp_events (user_id, event_type, xp_amount, attempt_id, metadata)
        VALUES (v_user_id, 'personal_best', v_best_bonus, p_attempt_id, jsonb_build_object('score', v_overall_score))
        ON CONFLICT (attempt_id, event_type) DO NOTHING;
        v_total_earned_xp := v_total_earned_xp + v_best_bonus;
    END IF;

    -- 6. Update User Skills (Upsert without overwriting baseline)
    INSERT INTO public.user_skills (user_id, skill_name, baseline_score, current_score, best_score, last_assessed_at)
    VALUES
        (v_user_id, 'Fluency', v_fluency, v_fluency, v_fluency, now()),
        (v_user_id, 'Clarity', v_clarity, v_clarity, v_clarity, now()),
        (v_user_id, 'Vocabulary', v_vocabulary, v_vocabulary, v_vocabulary, now()),
        (v_user_id, 'Grammar', v_grammar, v_grammar, v_grammar, now()),
        (v_user_id, 'Confidence', v_confidence, v_confidence, v_confidence, now())
    ON CONFLICT (user_id, skill_name) DO UPDATE SET
        current_score = EXCLUDED.current_score,
        best_score = GREATEST(public.user_skills.best_score, EXCLUDED.current_score),
        trend = CASE 
            WHEN EXCLUDED.current_score > public.user_skills.current_score THEN 'improving'
            WHEN EXCLUDED.current_score < public.user_skills.current_score THEN 'declining'
            ELSE 'steady'
        END,
        last_assessed_at = now(),
        updated_at = now();

    -- 7. Update User Streaks (Authoritative user_streaks)
    SELECT current_streak, longest_streak, last_activity_date
    INTO v_current_streak, v_longest_streak, v_last_activity
    FROM public.user_streaks
    WHERE user_id = v_user_id;

    IF v_last_activity IS NULL OR v_last_activity < v_yesterday THEN
        v_current_streak := 1;
        v_longest_streak := GREATEST(COALESCE(v_longest_streak, 0), 1);
    ELSIF v_last_activity = v_yesterday THEN
        v_current_streak := v_current_streak + 1;
        v_longest_streak := GREATEST(v_longest_streak, v_current_streak);
    END IF;

    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (v_user_id, v_current_streak, v_longest_streak, v_today, now())
    ON CONFLICT (user_id) DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_activity_date = v_today,
        updated_at = now();

    -- 8. Secondary Legacy Compatibility Sync (user_progress & speaking_sessions)
    INSERT INTO public.user_progress (user_id, total_sessions, current_streak, last_practice_date)
    VALUES (v_user_id, 1, v_current_streak, v_today)
    ON CONFLICT (user_id) DO UPDATE SET
        total_sessions = public.user_progress.total_sessions + 1,
        current_streak = v_current_streak,
        last_practice_date = v_today,
        best_fluency_score = GREATEST(public.user_progress.best_fluency_score, v_fluency),
        best_grammar_score = GREATEST(public.user_progress.best_grammar_score, v_grammar),
        best_vocabulary_score = GREATEST(public.user_progress.best_vocabulary_score, v_vocabulary),
        best_confidence_score = GREATEST(public.user_progress.best_confidence_score, v_confidence);

    -- 9. Compute Total XP Sum
    SELECT COALESCE(SUM(xp_amount), 0) INTO v_total_xp_sum
    FROM public.xp_events
    WHERE user_id = v_user_id;

    -- Return full server progression payload
    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', p_attempt_id,
        'total_xp', v_total_xp_sum,
        'earned_xp', jsonb_build_object(
            'base', v_base_xp,
            'dailyBonus', v_daily_bonus,
            'weaknessBonus', v_weakness_bonus,
            'personalBestBonus', v_best_bonus,
            'total', v_total_earned_xp
        ),
        'streak', jsonb_build_object(
            'currentStreak', v_current_streak,
            'longestStreak', v_longest_streak,
            'lastActivityDate', v_today
        ),
        'scores', jsonb_build_object(
            'overallScore', v_overall_score,
            'fluency', v_fluency,
            'clarity', v_clarity,
            'vocabulary', v_vocabulary,
            'grammar', v_grammar,
            'confidence', v_confidence
        )
    );
END;
$$;
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
-- ============================================================================
-- VERBLYN V1 BETA READINESS & CATALOG EXPANSION (PHASE 7)
-- Seeds 38 curated challenges and creates the beta feedback table.
-- ============================================================================

-- 1. BETA FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS public.beta_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES public.challenge_attempts(id) ON DELETE SET NULL,
    challenge_id TEXT REFERENCES public.challenges(id) ON DELETE SET NULL,
    rating TEXT NOT NULL CHECK (rating IN ('very_useful', 'useful', 'not_useful')),
    difficulty_perception TEXT CHECK (difficulty_perception IN ('too_easy', 'just_right', 'too_hard')),
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON public.beta_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.beta_feedback
    FOR SELECT USING (auth.uid() = user_id);

-- 2. SEED EXPANDED CHALLENGE LIBRARY (38 Challenges)
INSERT INTO public.challenges (
    id, title, short_description, why_it_matters, target_skill, challenge_type,
    difficulty_level, difficulty_label, duration_seconds, prompt, instructions,
    expected_behavior, xp_reward, goal_tags, target_weakness
) VALUES
-- Fluency & Pacing (7)
(
    'fluency-filler-reduction-45', '45-Second Filler Detox',
    'Speak for 45 seconds continuously while eliminating verbal fillers (um, uh, like).',
    'Replacing filler sounds with confident silence instantly enhances authority.',
    'Fluency', 'timed_speaking', 1, 'Beginner', 45,
    'Describe your favorite productivity habit and explain why it works for you.',
    '["Speak at a calm, controlled tempo.", "If you lose your train of thought, pause silently for 1 second instead of saying um or like.", "Keep going until the 45-second timer concludes."]'::jsonb,
    'Zero or minimal filler words with steady, deliberate cadence.', 30,
    ARRAY['EVERYDAY_COMMUNICATION', 'PUBLIC_SPEAKING', 'WORKPLACE_COMMUNICATION'], 'filler_dependency'
),
(
    'fluency-rapid-pitch-60', '60-Second Momentum Drill',
    'Deliver a continuous 60-second pitch without stalling or second-guessing.',
    'Builds flow state and trains you to think ahead while speaking.',
    'Fluency', 'rapid_response', 2, 'Intermediate', 60,
    'Tell me about your latest project or coursework in 60 seconds.',
    '["Start with a 1-sentence summary of what it is.", "Highlight 1 core challenge you solved.", "Finish with the real-world value or lesson learned."]'::jsonb,
    'Continuous speech flow maintaining 130-150 WPM.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'slow_delivery'
),
(
    'fluency-deliberate-pause-45', 'The Power of the Silent Pause',
    'Deliver an update using deliberate 1-second silent pauses between major ideas.',
    'Strategic pauses allow the listener to absorb key points and prevent rushed delivery.',
    'Fluency', 'timed_speaking', 1, 'Beginner', 45,
    'Explain two important reasons why continuous learning matters in modern careers.',
    '["State Point 1, then pause in complete silence for 1 full second.", "State Point 2, and again pause silently before your conclusion.", "Never fill the silence with vocal hesitation sounds."]'::jsonb,
    'Clean deliberate pauses without filler sounds.', 30,
    ARRAY['PUBLIC_SPEAKING', 'WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'filler_dependency'
),
(
    'fluency-breath-control-60', 'Controlled Cadence Sprint',
    'Maintain a steady, measured pace without rushing through complex thoughts.',
    'Rushed delivery signals nervousness; controlled cadence projects command and calm.',
    'Fluency', 'timed_speaking', 2, 'Intermediate', 60,
    'Walk me through how a team should handle an urgent deadline when requirements change.',
    '["Inhale calmly before starting each major sentence.", "Maintain an even tempo between 125 and 145 WPM.", "Emphasize key operative words with deliberate vocal weight."]'::jsonb,
    'Even cadence without rapid rushed bursts.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'GROUP_DISCUSSIONS'], 'rushed_delivery'
),
(
    'fluency-spontaneous-stream-75', 'Stream of Thought Pivot',
    'Connect two unrelated topics smoothly without breaking speech continuity.',
    'Sharpens mental agility for handling unexpected meeting questions.',
    'Fluency', 'rapid_response', 2, 'Intermediate', 75,
    'Start by describing a book or movie you love, then pivot to what it teaches about modern leadership.',
    '["Spend 35 seconds on the book/movie summary.", "Use a bridging transition (e.g. This directly mirrors how leaders must...)", "Spend the remaining 40 seconds on the leadership takeaway."]'::jsonb,
    'Seamless logical pivot without hesitation pauses.', 35,
    ARRAY['PUBLIC_SPEAKING', 'EVERYDAY_COMMUNICATION'], 'slow_delivery'
),
(
    'fluency-storytelling-arc-60', 'The 3-Act Mini Story',
    'Narrate a memorable personal anecdote with a clear beginning, middle, and climax.',
    'Storytelling makes information memorable and emotionally engaging.',
    'Fluency', 'storytelling', 2, 'Intermediate', 60,
    'Tell a 60-second story about a time when an unexpected obstacle forced you to adapt quickly.',
    '["Act 1 - Setup (15s): What was supposed to happen.", "Act 2 - Crisis (30s): The sudden obstacle and what you did.", "Act 3 - Resolution (15s): The outcome and takeaway."]'::jsonb,
    'Vivid narrative flow with clear dynamic pacing changes.', 30,
    ARRAY['PUBLIC_SPEAKING', 'EVERYDAY_COMMUNICATION', 'JOB_INTERVIEWS'], 'unclear_structure'
),
(
    'fluency-executive-summary-90', 'Executive Multi-Minute Stamina',
    'Deliver a structured 90-second strategic briefing without running out of breath.',
    'Senior presentations require sustained vocal energy and thought management.',
    'Fluency', 'timed_speaking', 3, 'Advanced', 90,
    'Deliver a comprehensive 90-second proposal for adopting a new tool or methodology in your organization.',
    '["Phase 1: The core problem and business cost (30s).", "Phase 2: The proposed solution and implementation path (35s).", "Phase 3: The expected return on investment (25s)."]'::jsonb,
    'Continuous, high-stamina delivery without energy drops.', 40,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'slow_delivery'
),

-- Clarity & Structure (7)
(
    'clarity-explain-simply-60', 'Explain to a 10-Year-Old',
    'Explain a technical or complex concept in simple, accessible language.',
    'True mastery of a subject is proven by making it crystal clear to anyone.',
    'Clarity', 'explain_simply', 2, 'Intermediate', 60,
    'Explain how Cloud Computing or APIs work to someone with zero technical background.',
    '["Use a physical real-world analogy (e.g. restaurant kitchen or postal service).", "Avoid technical acronyms and jargon.", "Keep sentence structures under 15 words each."]'::jsonb,
    'Jargon-free clarity using short, punchy sentence structures.', 30,
    ARRAY['CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'excessive_jargon'
),
(
    'clarity-concise-answer-45', 'The 45-Second Executive Update',
    'Summarize a complex weekly status update in under 45 seconds.',
    'Executives and recruiters value brevity and high information density.',
    'Clarity', 'concise_answer', 3, 'Advanced', 45,
    'Give a 45-second status update on an initiative where something went wrong and how you fixed it.',
    '["Headline (10s): State current status and the main blocker.", "Action (20s): Outline the immediate fix deployed.", "Next Step (15s): Give the clear timeline to completion."]'::jsonb,
    'High information density with structured transitions.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'overlong_answers'
),
(
    'clarity-bottom-line-first-30', 'BLUF: Bottom Line Up Front',
    'State the core decision/recommendation in the very first sentence.',
    'Busy stakeholders need the takeaway before the supporting details.',
    'Clarity', 'concise_answer', 1, 'Beginner', 30,
    'Should remote teams prioritize asynchronous documentation or live meetings? Deliver your verdict.',
    '["Sentence 1: Unambiguous bottom line (My recommendation is...).", "Sentence 2 & 3: The 2 highest-impact supporting facts.", "Stop cleanly before the 30-second mark."]'::jsonb,
    'Immediate clear thesis without throat-clearing.', 25,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'weak_opening'
),
(
    'clarity-rule-of-three-60', 'The Rule of Three Framework',
    'Organize any response into exactly three clear, numbered pillars.',
    'Human memory naturally retains information grouped in triads.',
    'Clarity', 'explain_simply', 1, 'Beginner', 60,
    'What are the 3 essential qualities of an exceptional team member?',
    '["Introduce: There are three core traits: First... Second... Third...", "Give 1 concise example for each trait.", "Synthesize with a 1-sentence wrap-up."]'::jsonb,
    'Structured 3-part delivery with signposting words.', 30,
    ARRAY['CAMPUS_PLACEMENTS', 'JOB_INTERVIEWS', 'GROUP_DISCUSSIONS'], 'unclear_structure'
),
(
    'clarity-complex-system-75', 'Deconstructing Technical Complexity',
    'Break down a multi-component architecture into logical layers.',
    'Technical leaders must bridge high-level architecture with practical execution.',
    'Clarity', 'explain_simply', 3, 'Advanced', 75,
    'Explain how user authentication and security tokens flow through a modern web application.',
    '["Start with the user action (Login trigger).", "Explain the middle tier (Token generation & validation).", "Finish with the database & session state layer."]'::jsonb,
    'Step-by-step sequential clarity without technical hand-waving.', 35,
    ARRAY['CAMPUS_PLACEMENTS', 'JOB_INTERVIEWS'], 'vague_explanation'
),
(
    'clarity-elevator-pitch-45', 'The 45-Second Value Proposition',
    'Pitch an app, service, or concept with immediate value clarity.',
    'Capturing investor or client attention requires instant value differentiation.',
    'Clarity', 'concise_answer', 2, 'Intermediate', 45,
    'Pitch an AI-powered voice coach (like Verblyn) to a busy university student.',
    '["Hook (10s): The burning pain point.", "Solution (20s): How the product solves it in minutes a day.", "Call to action (15s): The immediate next step."]'::jsonb,
    'Punchy value proposition free of generic fluff.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'weak_opening'
),
(
    'clarity-closing-punchline-45', 'The Memorable Closing Call',
    'Deliver an explanation that culminates in a clear, memorable call to action.',
    'Great presentations fall flat if the ending is vague or trails off.',
    'Clarity', 'concise_answer', 2, 'Intermediate', 45,
    'Argue why your organization should invest more time in weekly knowledge-sharing sessions.',
    '["Lay out the core rationale in the first 30 seconds.", "Dedicate the final 15 seconds to a sharp, definitive closing directive.", "Finish with vocal firmness and no trailing hesitations."]'::jsonb,
    'Decisive closing sentence that anchors the entire message.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'weak_conclusion'
),

-- Vocabulary & Precision (6)
(
    'vocab-professional-precision-60', 'Power Verb Precision',
    'Describe an achievement using active, precise verbs instead of generic words.',
    'Action verbs (orchestrated, streamlined, spearheaded) project high capability.',
    'Vocabulary', 'explain_simply', 2, 'Intermediate', 60,
    'Describe a significant accomplishment. Replace words like did, made, worked on with precise action verbs.',
    '["Use at least 3 distinct action verbs (e.g. engineered, resolved, accelerated).", "Articulate the measurable impact of your work.", "Maintain lexical variety without repeating common descriptors."]'::jsonb,
    'High lexical diversity (TTR > 0.65) with descriptive precision.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'weak_vocabulary'
),
(
    'vocab-analogy-mastery-60', 'Concrete Metaphor Builder',
    'Explain an abstract technical concept using vivid physical metaphors.',
    'Metaphors bridge unfamiliar technical concepts into intuitive understanding.',
    'Vocabulary', 'explain_simply', 2, 'Intermediate', 60,
    'Explain what Database Indexing or Caching is by comparing it to a physical library or cookbook.',
    '["Explicitly map technical terms to physical items in your metaphor.", "Show the difference in speed/efficiency using descriptive sensory language.", "Bring it back to the software reality in your final sentence."]'::jsonb,
    'Rich metaphorical descriptors without jargon reliance.', 30,
    ARRAY['CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'excessive_jargon'
),
(
    'vocab-descriptive-impact-45', 'Sensory Language Drill',
    'Describe a high-pressure environment using vivid descriptive language.',
    'Sensory vocabulary makes storytelling immersive and memorable.',
    'Vocabulary', 'timed_speaking', 1, 'Beginner', 45,
    'Describe the intense atmosphere inside a hospital emergency room or a stock trading floor.',
    '["Incorporate auditory and visual descriptive adjectives.", "Avoid overused words like very busy or really fast.", "Paint a distinct mental picture for the listener."]'::jsonb,
    'Descriptive, evocative vocabulary with high lexical variety.', 25,
    ARRAY['PUBLIC_SPEAKING', 'EVERYDAY_COMMUNICATION'], 'weak_vocabulary'
),
(
    'vocab-synonym-expansion-60', 'Eliminate Repetitive Words',
    'Speak for 60 seconds about innovation without repeating key adjectives.',
    'Repetitive vocabulary makes long speeches tedious and reveals narrow lexical depth.',
    'Vocabulary', 'explain_simply', 2, 'Intermediate', 60,
    'Discuss how artificial intelligence is transforming education and work.',
    '["Never use the words good, bad, big, or important.", "Use sophisticated alternatives (e.g. transformative, pivotal, sub-optimal, substantial).", "Keep sentences fluid and natural."]'::jsonb,
    'Zero repeated adjectives; high Type-Token Ratio.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'PUBLIC_SPEAKING'], 'excessive_repetition'
),
(
    'vocab-nuanced-qualifiers-75', 'Nuanced Executive Distinction',
    'Differentiate between two subtly distinct strategies using precise vocabulary.',
    'Senior professionals distinguish between nuance rather than binary black-and-white views.',
    'Vocabulary', 'concise_answer', 3, 'Advanced', 75,
    'Explain the nuanced difference between being efficient vs being effective in project execution.',
    '["Define each concept with surgical lexical precision.", "Provide a scenario where an action is efficient but completely ineffective.", "Synthesize how high-performing teams balance both."]'::jsonb,
    'Precise, nuanced vocabulary and analytical clarity.', 35,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'vague_explanation'
),
(
    'vocab-data-storytelling-60', 'Translating Numbers to Impact',
    'Describe quantitative metrics by connecting data points to human outcomes.',
    'Data without narrative leaves listeners cold; storytelling brings metrics to life.',
    'Vocabulary', 'explain_simply', 2, 'Intermediate', 60,
    'Your software reduced page latency from 3.2s to 0.4s and increased retention by 18%. Explain the impact.',
    '["Translate milliseconds into human patience and conversion value.", "Explain what an 18% retention lift means for team growth and revenue.", "Close with the overarching strategic implication."]'::jsonb,
    'Quantitative precision paired with narrative impact.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'insufficient_detail'
),

-- Grammar & Structural Discipline (5)
(
    'grammar-short-sentence-discipline-45', 'Short Sentence Sprint',
    'Speak in disciplined sentences of 8 to 14 words each.',
    'Run-on sentences cause listener fatigue and make arguments hard to follow.',
    'Grammar', 'timed_speaking', 1, 'Beginner', 45,
    'Explain why regular physical exercise improves cognitive focus at work.',
    '["Keep every sentence under 14 words.", "End each sentence with a clean drop in vocal inflection.", "Never chain clauses together with and then... and also..."]'::jsonb,
    'Average sentence length between 9 and 14 words.', 25,
    ARRAY['EVERYDAY_COMMUNICATION', 'PUBLIC_SPEAKING'], 'grammar_errors'
),
(
    'grammar-prep-framework-60', 'Point-Reason-Example-Point (PREP)',
    'Structure an argumentative answer using the rigorous PREP formula.',
    'PREP guarantees tight logical cohesion without rambling.',
    'Grammar', 'concise_answer', 2, 'Intermediate', 60,
    'Should companies enforce a strict 4-day workweek? State and defend your view.',
    '["P (Point, 10s): Your core stance.", "R (Reason, 15s): The primary underlying driver.", "E (Example, 25s): A concrete real-world example or study.", "P (Point, 10s): Restate your thesis with finality."]'::jsonb,
    'Flawless execution of PREP 4-part structure.', 30,
    ARRAY['GROUP_DISCUSSIONS', 'JOB_INTERVIEWS', 'PUBLIC_SPEAKING'], 'unclear_structure'
),
(
    'grammar-active-voice-focus-60', 'Active Voice Authority',
    'Deliver a retrospective without using passive voice phrasing.',
    'Active voice demonstrates ownership, directness, and executive confidence.',
    'Grammar', 'explain_simply', 2, 'Intermediate', 60,
    'Describe a situation where an error occurred in your team and how it was remediated.',
    '["Do not say mistakes were made or it was decided.", "Name specific actors: I investigated..., Our team restructured..., We deployed...", "Maintain strong subject-verb alignment throughout."]'::jsonb,
    '100% active voice structure with clear agency.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'grammar_errors'
),
(
    'grammar-clause-economy-45', 'Compound Sentence Trimming',
    'Trim wordy explanations into crisp, decisive claims.',
    'Eliminating filler clauses increases audience retention.',
    'Grammar', 'concise_answer', 3, 'Advanced', 45,
    'Why is unit testing critical before deploying code to production?',
    '["Deliver 4 distinct, powerful assertions in 45 seconds.", "Avoid qualifying preambles like I feel that essentially what happens is...", "State raw facts and direct cause-and-effect relationships."]'::jsonb,
    'High information density free from rambling qualifying phrases.', 30,
    ARRAY['CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'overlong_answers'
),
(
    'grammar-transition-flow-60', 'Seamless Signposting Words',
    'Use formal transitional signposts (Furthermore, Consequently, In contrast).',
    'Signposting gives speeches an architectural roadmap that listeners easily track.',
    'Grammar', 'explain_simply', 2, 'Intermediate', 60,
    'Compare working in an early-stage startup versus an established corporate enterprise.',
    '["Use On one hand... for the startup perspective.", "Use Conversely / In contrast... to pivot to enterprise.", "Use Ultimately / Therefore... for your closing synthesis."]'::jsonb,
    'Explicit logical signposting connecting all arguments.', 30,
    ARRAY['GROUP_DISCUSSIONS', 'JOB_INTERVIEWS'], 'unclear_structure'
),

-- Confidence & Vocal Delivery (6)
(
    'confidence-assertive-opinion-60', 'Defend a Controversial View',
    'State a clear opinion and back it up with two compelling arguments in 60 seconds.',
    'Eliminates apologetic hedging words like I guess or sort of.',
    'Confidence', 'concise_answer', 2, 'Intermediate', 60,
    'Pick a trend in technology, work, or education that you disagree with and explain why with two reasons.',
    '["Open with an unambiguous thesis statement in the first 10 seconds.", "Support with Reason 1 (20s) and Reason 2 (20s).", "Close decisively without trailing off."]'::jsonb,
    'Firm vocal assertion free from passive hedging language.', 30,
    ARRAY['GROUP_DISCUSSIONS', 'WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'filler_dependency'
),
(
    'confidence-eliminating-hedges-45', 'Zero-Hedge Direct Stance',
    'Answer a difficult question without using softeners (I think, maybe, sort of).',
    'Hedging language dilutes authority and undermines credibility.',
    'Confidence', 'concise_answer', 1, 'Beginner', 45,
    'Will AI replace software engineers within 5 years? Give a definitive yes or no and defend it.',
    '["Never say I think, I feel, in my humble opinion, or it kind of depends.", "State direct, declarative sentences: AI will accelerate productivity, not replace engineers, because...", "Deliver with calm conviction."]'::jsonb,
    'Zero hedging qualifiers with firm delivery.', 25,
    ARRAY['GROUP_DISCUSSIONS', 'JOB_INTERVIEWS'], 'filler_dependency'
),
(
    'confidence-unpopular-truth-60', 'Delivering Uncomfortable Feedback',
    'Deliver constructive, direct feedback with professional empathy and firmness.',
    'Difficult conversations require balancing clarity with professionalism.',
    'Confidence', 'concise_answer', 3, 'Advanced', 60,
    'Tell a peer that their recent missed deadlines are impacting the whole team project.',
    '["State the observable fact without accusation (15s).", "Explain the team-wide consequence (25s).", "Propose a collaborative path forward (20s)."]'::jsonb,
    'Assertive, non-apologetic tone maintaining professional respect.', 35,
    ARRAY['WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'weak_opening'
),
(
    'confidence-high-stakes-qna-45', 'Spontaneous Objection Handling',
    'Defend your project timeline against a skeptical client or manager.',
    'Composure under fire distinguishes reliable leaders from panicked responders.',
    'Confidence', 'rapid_response', 3, 'Advanced', 45,
    'Stakeholder says: This timeline is twice as long as we expected. Why should we approve this?',
    '["Acknowledge the urgency without becoming defensive (10s).", "Explain the quality and risk mitigation built into the timeline (25s).", "Offer a phased tradeoff option (10s)."]'::jsonb,
    'Composed, steady cadence under simulated adversarial pressure.', 35,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'slow_delivery'
),
(
    'confidence-vocal-conviction-60', 'Decisive Recommendation Delivery',
    'Pitch an expensive strategic pivot with uncompromising conviction.',
    'If the speaker sounds uncertain, the decision-maker will never approve the risk.',
    'Confidence', 'concise_answer', 2, 'Intermediate', 60,
    'Convince leadership to rewrite a legacy software system from scratch.',
    '["Anchor on the hidden cost of technical debt (20s).", "Show the breakthrough velocity of modern architecture (25s).", "Conclude with an unambiguous call to action (15s)."]'::jsonb,
    'High conviction vocal energy with zero hesitation sounds.', 30,
    ARRAY['WORKPLACE_COMMUNICATION', 'JOB_INTERVIEWS'], 'weak_conclusion'
),
(
    'confidence-crisis-handling-90', 'Leadership Under Pressure',
    'Address an anxious team during a severe product outage or company crisis.',
    'In a crisis, tone and vocal stability matter as much as the actual facts.',
    'Confidence', 'timed_speaking', 3, 'Advanced', 90,
    'Your flagship product is down for major enterprise customers. Brief your engineering team on the incident response.',
    '["Calm the room with transparent truth (30s).", "Assign immediate triage swimlanes (35s).", "Establish communication protocols and close with confidence (25s)."]'::jsonb,
    'Authoritative, calm, grounding pacing throughout 90 seconds.', 45,
    ARRAY['WORKPLACE_COMMUNICATION', 'PUBLIC_SPEAKING'], 'rushed_delivery'
),

-- Interview & Career Mastery (7)
(
    'interview-tell-me-about-yourself-60', 'The "Tell Me About Yourself" Hook',
    'Deliver a crisp 60-second self-introduction tailored for recruiters.',
    'First impressions in interviews set the tone for the entire conversation.',
    'Clarity', 'interview_answer', 1, 'Beginner', 60,
    'Answer: Tell me about yourself, your background, and what excites you right now.',
    '["Present (20s): Current role/studies and core expertise.", "Past (20s): 1 standout milestone or formative experience.", "Future (20s): Why you are excited about upcoming opportunities."]'::jsonb,
    'Present-Past-Future narrative structure with confidence.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS'], 'weak_opening'
),
(
    'interview-star-behavioral-90', 'STAR Conflict Resolution',
    'Structure a behavioral interview response using Situation, Task, Action, and Result.',
    'STAR method prevents rambling and ensures you provide concrete behavioral evidence.',
    'Confidence', 'interview_answer', 3, 'Advanced', 90,
    'Describe a time you disagreed with a colleague or teammate on an approach and how you resolved it.',
    '["Situation & Task (25s): The context and the point of disagreement.", "Action (40s): How you initiated a constructive conversation.", "Result (25s): The mutual outcome and what was learned."]'::jsonb,
    'Evenly apportioned STAR delivery without rambling.', 35,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS', 'WORKPLACE_COMMUNICATION'], 'unclear_structure'
),
(
    'interview-why-hire-you-60', 'Why Should We Hire You?',
    'Articulate your unique value proposition without sounding arrogant or generic.',
    'Differentiates you from dozens of candidates with identical resumes.',
    'Clarity', 'interview_answer', 2, 'Intermediate', 60,
    'Answer: With so many qualified candidates, why should we select you for this role?',
    '["Highlight 1 distinct technical/execution superpower (25s).", "Highlight 1 cultural/communication superpower (20s).", "Close with your immediate commitment to day-1 impact (15s)."]'::jsonb,
    'Targeted value alignment tailored to team needs.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS'], 'weak_opening'
),
(
    'interview-greatest-failure-75', 'The Turnaround Failure Story',
    'Discuss a genuine mistake, what you learned, and how you turned it into a strength.',
    'Tests self-awareness, humility, resilience, and growth mindset.',
    'Fluency', 'interview_answer', 3, 'Advanced', 75,
    'Describe a project that failed or did not meet expectations. What was your role and what changed?',
    '["Own the mistake clearly without blaming external teammates (20s).", "Detail the immediate corrective action taken (30s).", "Explain the permanent system or habit you adopted as a result (25s)."]'::jsonb,
    'Authentic accountability and clear growth narrative.', 35,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS'], 'insufficient_detail'
),
(
    'interview-salary-value-defense-60', 'Articulating Your Market Value',
    'State and justify your compensation expectations with professionalism and data.',
    'Negotiation confidence directly impacts career trajectory and earnings.',
    'Confidence', 'interview_answer', 2, 'Intermediate', 60,
    'Answer: What are your salary expectations for this position and how did you arrive at that number?',
    '["Anchor to industry benchmarking and market data (20s).", "Connect the number to the unique multiplier impact you deliver (25s).", "Leave room for holistic package discussion (15s)."]'::jsonb,
    'Polite, firm, data-backed justification without apologetic qualifiers.', 30,
    ARRAY['JOB_INTERVIEWS', 'WORKPLACE_COMMUNICATION'], 'weak_opening'
),
(
    'interview-technical-deepdive-90', 'System Architecture Deep Dive',
    'Explain your most complex technical architecture from high level down to trade-offs.',
    'Senior engineering interviews test depth of technical design and trade-off justification.',
    'Clarity', 'interview_answer', 3, 'Advanced', 90,
    'Describe the technical architecture of the most complex system you have designed or worked on.',
    '["High level overview & business requirements (25s).", "Key architectural choices (databases, caching, queues) (40s).", "The hardest trade-off you had to accept and why (25s)."]'::jsonb,
    'High technical rigor, structured transitions, and clear trade-off rationale.', 45,
    ARRAY['CAMPUS_PLACEMENTS', 'JOB_INTERVIEWS'], 'vague_explanation'
),
(
    'interview-vision-future-60', 'Where Do You See Yourself in 3 Years?',
    'Share realistic, ambitious career goals aligned with role growth.',
    'Recruiters assess ambition, commitment, and alignment with organizational needs.',
    'Fluency', 'interview_answer', 1, 'Beginner', 60,
    'Answer: Where do you see yourself professionally in 3 to 5 years?',
    '["Year 1: Mastery of role and team impact (20s).", "Year 2-3: Taking on broader ownership and mentoring (25s).", "Long term: The domain mastery you aim to achieve (15s)."]'::jsonb,
    'Realistic ambition tied directly to practical skills growth.', 30,
    ARRAY['JOB_INTERVIEWS', 'CAMPUS_PLACEMENTS'], 'weak_conclusion'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    short_description = EXCLUDED.short_description,
    why_it_matters = EXCLUDED.why_it_matters,
    target_skill = EXCLUDED.target_skill,
    challenge_type = EXCLUDED.challenge_type,
    difficulty_level = EXCLUDED.difficulty_level,
    difficulty_label = EXCLUDED.difficulty_label,
    duration_seconds = EXCLUDED.duration_seconds,
    prompt = EXCLUDED.prompt,
    instructions = EXCLUDED.instructions,
    expected_behavior = EXCLUDED.expected_behavior,
    xp_reward = EXCLUDED.xp_reward,
    goal_tags = EXCLUDED.goal_tags,
    target_weakness = EXCLUDED.target_weakness;
