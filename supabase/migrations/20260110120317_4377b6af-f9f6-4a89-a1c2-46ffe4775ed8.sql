-- Create speaking_sessions table to store practice session data
CREATE TABLE public.speaking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    transcript TEXT,
    grammar_score INTEGER CHECK (grammar_score >= 0 AND grammar_score <= 100),
    fluency_score INTEGER CHECK (fluency_score >= 0 AND fluency_score <= 100),
    vocabulary_score INTEGER CHECK (vocabulary_score >= 0 AND vocabulary_score <= 100),
    confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
    feedback JSONB,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_progress table to track long-term progress
CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    avg_grammar_score NUMERIC(5,2) DEFAULT 0,
    avg_fluency_score NUMERIC(5,2) DEFAULT 0,
    avg_vocabulary_score NUMERIC(5,2) DEFAULT 0,
    avg_confidence_score NUMERIC(5,2) DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    last_practice_date DATE,
    best_grammar_score INTEGER DEFAULT 0,
    best_fluency_score INTEGER DEFAULT 0,
    best_vocabulary_score INTEGER DEFAULT 0,
    best_confidence_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.speaking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for speaking_sessions
CREATE POLICY "Users can view their own sessions"
ON public.speaking_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.speaking_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.speaking_sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON public.speaking_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress"
ON public.user_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.user_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at on user_progress
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON public.user_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update user progress after a new session
CREATE OR REPLACE FUNCTION public.update_user_progress_on_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    today DATE := CURRENT_DATE;
    last_date DATE;
    new_streak INTEGER;
BEGIN
    -- Get or create user progress record
    INSERT INTO public.user_progress (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get last practice date
    SELECT last_practice_date INTO last_date
    FROM public.user_progress
    WHERE user_id = NEW.user_id;

    -- Calculate streak
    IF last_date IS NULL OR last_date < today - 1 THEN
        new_streak := 1;
    ELSIF last_date = today - 1 THEN
        SELECT current_streak + 1 INTO new_streak
        FROM public.user_progress
        WHERE user_id = NEW.user_id;
    ELSE
        SELECT current_streak INTO new_streak
        FROM public.user_progress
        WHERE user_id = NEW.user_id;
    END IF;

    -- Update progress with new session data
    UPDATE public.user_progress
    SET 
        total_sessions = total_sessions + 1,
        avg_grammar_score = (
            SELECT AVG(grammar_score)::NUMERIC(5,2)
            FROM public.speaking_sessions
            WHERE user_id = NEW.user_id AND grammar_score IS NOT NULL
        ),
        avg_fluency_score = (
            SELECT AVG(fluency_score)::NUMERIC(5,2)
            FROM public.speaking_sessions
            WHERE user_id = NEW.user_id AND fluency_score IS NOT NULL
        ),
        avg_vocabulary_score = (
            SELECT AVG(vocabulary_score)::NUMERIC(5,2)
            FROM public.speaking_sessions
            WHERE user_id = NEW.user_id AND vocabulary_score IS NOT NULL
        ),
        avg_confidence_score = (
            SELECT AVG(confidence_score)::NUMERIC(5,2)
            FROM public.speaking_sessions
            WHERE user_id = NEW.user_id AND confidence_score IS NOT NULL
        ),
        best_grammar_score = GREATEST(best_grammar_score, COALESCE(NEW.grammar_score, 0)),
        best_fluency_score = GREATEST(best_fluency_score, COALESCE(NEW.fluency_score, 0)),
        best_vocabulary_score = GREATEST(best_vocabulary_score, COALESCE(NEW.vocabulary_score, 0)),
        best_confidence_score = GREATEST(best_confidence_score, COALESCE(NEW.confidence_score, 0)),
        current_streak = new_streak,
        last_practice_date = today
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$;

-- Create trigger to update progress after session insert
CREATE TRIGGER update_progress_after_session
AFTER INSERT ON public.speaking_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_progress_on_session();