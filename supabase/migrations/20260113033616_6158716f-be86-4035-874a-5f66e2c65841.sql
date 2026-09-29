-- Fix: Remove overly permissive RLS policy that exposes sensitive PII
-- The leaderboard view already provides the necessary public data (full_name, avatar_url)
-- so direct access to all profile fields is not needed for authenticated users

DROP POLICY IF EXISTS "Anyone can view public profile info for leaderboard" ON public.profiles;