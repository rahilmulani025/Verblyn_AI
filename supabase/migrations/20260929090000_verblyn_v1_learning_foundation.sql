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
