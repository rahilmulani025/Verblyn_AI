-- Drop and recreate the view with SECURITY INVOKER (default, safer)
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard 
WITH (security_invoker = true)
AS
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

-- Add RLS policy on profiles to allow public read of name/avatar for leaderboard
CREATE POLICY "Anyone can view public profile info for leaderboard"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the old restrictive policy and replace with the new one
DROP POLICY IF EXISTS "Users can view their own profile " ON public.profiles;