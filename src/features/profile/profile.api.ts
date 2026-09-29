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
   * Fetches the current user's profile with safe column fallback and metadata merging.
   */
  async getProfile(): Promise<UserProfile | null> {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;

    const userId = authData.user.id;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    const row = data as ProfileDbRow | null;
    const meta = authData.user.user_metadata || {};
    const onboardingCompleted = Boolean(
      row?.onboarding_completed ?? meta.onboarding_completed ?? false
    );
    const baselineCompleted = Boolean(
      row?.baseline_completed ?? meta.baseline_completed ?? false
    );

    if (!row) {
      return {
        id: userId,
        userId: userId,
        fullName: authData.user.user_metadata?.full_name || null,
        avatarUrl: null,
        profession: null,
        institution: null,
        contactPhone: null,
        onboardingCompleted,
        baselineCompleted,
        dailyGoalMinutes: Number(meta.daily_goal_minutes) || 5,
        primaryGoal: typeof meta.primary_goal === 'string' ? meta.primary_goal : null,
        communicationStyleFocus: Array.isArray(meta.communication_focus) ? meta.communication_focus : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      profession: (row.profession as UserProfession) || null,
      institution: row.institution,
      contactPhone: row.contact_phone,
      onboardingCompleted,
      baselineCompleted,
      dailyGoalMinutes: Number(row.daily_goal_minutes || meta.daily_goal_minutes || 5),
      primaryGoal: row.primary_goal || (typeof meta.primary_goal === 'string' ? meta.primary_goal : null),
      communicationStyleFocus: row.communication_focus || (Array.isArray(meta.communication_focus) ? meta.communication_focus : []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Updates profile data in both profiles table and user_metadata for reliable sync.
   */
  async updateProfile(input: UpdateProfileInput): Promise<boolean> {
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
        console.error('Error updating profiles table:', profileError);
      }
    }

    // 2. Sync extended onboarding/goal flags to auth metadata
    const metaUpdate: Record<string, unknown> = {};
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
        console.error('Error updating user metadata:', authError);
      }
    }

    return true;
  },
};
