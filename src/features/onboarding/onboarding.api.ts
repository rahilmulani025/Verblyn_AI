import { profileApi } from '@/features/profile/profile.api';
import { OnboardingSubmission, UserProfessionOption } from './onboarding.types';
import { UserProfession } from '@/features/profile/profile.types';

function mapProfessionToDb(profession: UserProfessionOption): UserProfession {
  switch (profession) {
    case 'Student':
    case 'Recent Graduate':
      return 'student';
    case 'Working Professional':
      return 'professional';
    case 'Other':
    default:
      return 'other';
  }
}

export const onboardingApi = {
  /**
   * Completes user onboarding and sets profile flags.
   */
  async submitOnboarding(data: OnboardingSubmission): Promise<{ success: boolean; error?: string }> {
    try {
      const dbProfession = mapProfessionToDb(data.profession);

      const success = await profileApi.updateProfile({
        fullName: data.fullName.trim(),
        institution: data.institution?.trim() || undefined,
        profession: dbProfession,
        primaryGoal: data.goal,
        dailyGoalMinutes: data.dailyCommitmentMinutes,
        targetRole: data.targetRole,
        customTargetRole: data.customTargetRole,
        experienceLevel: data.experienceLevel,
        targetDomain: data.targetDomain,
        onboardingCompleted: true,
      });

      if (!success) {
        return { success: false, error: 'Could not save onboarding profile data. Please try again.' };
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to submit onboarding:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred while saving onboarding.',
      };
    }
  },
};
