import { supabase } from '@/integrations/supabase/client';
import { UserProfile, UpdateProfileInput, UserProfession } from './profile.types';

interface ProfileDbRow {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  profession: string | null;
  institution: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed?: boolean;
  baseline_completed?: boolean;
  daily_goal_minutes?: number;
  primary_goal?: string;
  communication_focus?: string[];
}

export const profileApi = {
  /**
   * Authoritatively fetches the current user's profile with multi-table fallback checks
   * to guarantee resilient state across onboarding and baseline progression.
   */
  async getProfile(): Promise<UserProfile | null> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return null;

      const userId = authData.user.id;
      const meta = authData.user.user_metadata || {};

      // 1. Fetch public.profiles row
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const row = profileRow as ProfileDbRow | null;

      // 2. Authoritative check for baseline in user_skills or speaking_sessions
      const [skillsCheck, sessionsCheck, goalsCheck] = await Promise.all([
        supabase
          .from('user_skills')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('speaking_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('topic', 'Baseline Assessment'),
        supabase
          .from('user_goals')
          .select('goal_id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
      ]);

      const hasBaselineSkills = (skillsCheck.count ?? 0) > 0;
      const hasBaselineSession = (sessionsCheck.count ?? 0) > 0;
      const hasActiveGoal = Boolean(goalsCheck.data?.goal_id);

      const baselineCompleted = Boolean(
        row?.baseline_completed ||
        meta.baseline_completed ||
        hasBaselineSkills ||
        hasBaselineSession
      );

      const onboardingCompleted = Boolean(
        row?.onboarding_completed ||
        meta.onboarding_completed ||
        hasActiveGoal ||
        row?.profession ||
        baselineCompleted
      );

      const primaryGoal =
        goalsCheck.data?.goal_id ||
        row?.primary_goal ||
        (typeof meta.primary_goal === 'string' ? meta.primary_goal : null);

      if (!row) {
        return {
          id: userId,
          userId: userId,
          fullName: meta.full_name || null,
          avatarUrl: null,
          profession: null,
          institution: null,
          contactPhone: null,
          onboardingCompleted,
          baselineCompleted,
          dailyGoalMinutes: Number(meta.daily_goal_minutes) || 5,
          primaryGoal,
          communicationStyleFocus: Array.isArray(meta.communication_focus) ? meta.communication_focus : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        id: row.id,
        userId: row.user_id,
        fullName: row.full_name || meta.full_name || null,
        avatarUrl: row.avatar_url,
        profession: (row.profession as UserProfession) || null,
        institution: row.institution,
        contactPhone: row.contact_phone,
        onboardingCompleted,
        baselineCompleted,
        dailyGoalMinutes: Number(row.daily_goal_minutes || meta.daily_goal_minutes || 5),
        primaryGoal,
        communicationStyleFocus:
          row.communication_focus ||
          (Array.isArray(meta.communication_focus) ? meta.communication_focus : []),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (err) {
      console.error('Error in getProfile:', err);
      return null;
    }
  },

  /**
   * Updates profile data across public.profiles, user_goals, and auth metadata.
   */
  async updateProfile(input: UpdateProfileInput): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return false;

      const userId = authData.user.id;

      // 1. Update public.profiles supported fields
      const updatePayload: Record<string, string | null | undefined> = {};
      if (input.fullName !== undefined) updatePayload.full_name = input.fullName;
      if (input.avatarUrl !== undefined) updatePayload.avatar_url = input.avatarUrl;
      if (input.profession !== undefined) updatePayload.profession = input.profession;
      if (input.institution !== undefined) updatePayload.institution = input.institution;
      if (input.contactPhone !== undefined) updatePayload.contact_phone = input.contactPhone;

      if (Object.keys(updatePayload).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('user_id', userId);

        if (profileError) {
          console.warn('Error updating public.profiles table (falling back):', profileError.message);
        }
      }

      // 2. Persist goal in user_goals if provided
      if (input.primaryGoal) {
        await supabase.from('user_goals').upsert({
          user_id: userId,
          goal_id: input.primaryGoal,
          is_active: true,
        });
      }

      // 3. Sync extended onboarding/goal flags to auth metadata
      const metaUpdate: Record<string, unknown> = {};
      if (input.fullName !== undefined) metaUpdate.full_name = input.fullName;
      if (input.onboardingCompleted !== undefined) metaUpdate.onboarding_completed = input.onboardingCompleted;
      if (input.baselineCompleted !== undefined) metaUpdate.baseline_completed = input.baselineCompleted;
      if (input.dailyGoalMinutes !== undefined) metaUpdate.daily_goal_minutes = input.dailyGoalMinutes;
      if (input.primaryGoal !== undefined) metaUpdate.primary_goal = input.primaryGoal;
      if (input.communicationStyleFocus !== undefined) metaUpdate.communication_focus = input.communicationStyleFocus;

      if (Object.keys(metaUpdate).length > 0) {
        const { error: authError } = await supabase.auth.updateUser({
          data: metaUpdate,
        });

        if (authError) {
          console.warn('Error updating user metadata:', authError.message);
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to update profile:', err);
      return false;
    }
  },
};
