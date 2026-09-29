-- Add database constraints for profile validation (server-side defense)
ALTER TABLE public.profiles
  ADD CONSTRAINT profile_full_name_length CHECK (full_name IS NULL OR (length(full_name) >= 1 AND length(full_name) <= 100)),
  ADD CONSTRAINT profile_institution_length CHECK (institution IS NULL OR length(institution) <= 200),
  ADD CONSTRAINT profile_contact_phone_format CHECK (
    contact_phone IS NULL OR 
    contact_phone ~ '^[\d\s\-\+\(\)]+$'
  ),
  ADD CONSTRAINT profile_profession_values CHECK (
    profession IS NULL OR 
    profession IN ('student', 'professional', 'educator', 'entrepreneur', 'freelancer', 'other')
  );

-- Change calculate_rank_score to SECURITY INVOKER since it's read-only
CREATE OR REPLACE FUNCTION public.calculate_rank_score(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (current_streak * 10) + 
    COALESCE(avg_grammar_score, 0) + 
    COALESCE(avg_fluency_score, 0) + 
    COALESCE(avg_vocabulary_score, 0) + 
    COALESCE(avg_confidence_score, 0),
    0
  )
  FROM public.user_progress
  WHERE user_id = p_user_id
$$;

-- Add explicit authorization check to update_user_progress_on_session
-- Note: This trigger runs after insert on speaking_sessions which has RLS,
-- but we add defense in depth by checking the trigger context
CREATE OR REPLACE FUNCTION public.update_user_progress_on_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    today DATE := CURRENT_DATE;
    last_date DATE;
    new_streak INTEGER;
    current_auth_user UUID;
BEGIN
    -- Defense in depth: Verify the session's user_id matches auth context when available
    -- Note: auth.uid() may be null in trigger context, so we primarily rely on RLS
    current_auth_user := auth.uid();
    IF current_auth_user IS NOT NULL AND NEW.user_id != current_auth_user THEN
        RAISE EXCEPTION 'Unauthorized: Cannot update progress for another user';
    END IF;

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