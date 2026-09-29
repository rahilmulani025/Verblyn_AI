-- Add new columns to profiles table for extended user details
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profession TEXT,
ADD COLUMN IF NOT EXISTS institution TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Create a function to calculate user rank score (streak * 10 + avg scores)
CREATE OR REPLACE FUNCTION public.calculate_rank_score(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
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

-- Create a view for leaderboard (public, no RLS needed for views)
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.avatar_url,
  up.current_streak,
  up.total_sessions,
  COALESCE(up.avg_grammar_score, 0) as avg_grammar_score,
  COALESCE(up.avg_fluency_score, 0) as avg_fluency_score,
  COALESCE(up.avg_vocabulary_score, 0) as avg_vocabulary_score,
  COALESCE(up.avg_confidence_score, 0) as avg_confidence_score,
  (COALESCE(up.current_streak, 0) * 10 + 
   COALESCE(up.avg_grammar_score, 0) + 
   COALESCE(up.avg_fluency_score, 0) + 
   COALESCE(up.avg_vocabulary_score, 0) + 
   COALESCE(up.avg_confidence_score, 0)) as rank_score
FROM public.profiles p
LEFT JOIN public.user_progress up ON p.user_id = up.user_id
WHERE p.full_name IS NOT NULL
ORDER BY rank_score DESC;