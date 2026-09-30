import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Guards
import { AuthGuard, GuestGuard, OnboardingGuard, AssessmentGuard } from '@/app/guards';

// Pages
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import OnboardingPage from '@/pages/OnboardingPage';
import AssessmentPage from '@/pages/AssessmentPage';
import AssessmentResultPage from '@/pages/AssessmentResultPage';
import HomePage from '@/pages/HomePage';
import Practice from '@/pages/Practice';
import ChallengeDetailPage from '@/pages/ChallengeDetailPage';
import ChallengeResultPage from '@/pages/ChallengeResultPage';
import ProgressPage from '@/pages/ProgressPage';
import AchievementsPage from '@/pages/AchievementsPage';
import ProfilePage from '@/pages/ProfilePage';
import NotFound from '@/pages/NotFound';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<Index />} />

      {/* Guest / Auth Routes */}
      <Route element={<GuestGuard />}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/signup" element={<Navigate to="/auth" replace />} />
      </Route>

      {/* Dedicated Password Recovery Flow */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/forgot-password" element={<Navigate to="/auth?mode=reset" replace />} />

      {/* Onboarding Flow */}
      <Route element={<OnboardingGuard />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      {/* Baseline Assessment Flow */}
      <Route element={<AssessmentGuard />}>
        <Route path="/assessment" element={<AssessmentPage />} />
      </Route>

      {/* Baseline Result */}
      <Route path="/assessment/result" element={<AssessmentResultPage />} />

      {/* Protected App Shell Routes */}
      <Route element={<AuthGuard />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/challenge/:id" element={<ChallengeDetailPage />} />
        <Route path="/challenge/:id/result" element={<ChallengeResultPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/progress/achievements" element={<AchievementsPage />} />
        <Route path="/achievements" element={<Navigate to="/progress/achievements" replace />} />
        <Route path="/me" element={<ProfilePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
      </Route>

      {/* Catch-all 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
