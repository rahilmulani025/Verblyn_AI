import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useProfileState } from './useProfileState';

/**
 * Ensures user is authenticated before reaching onboarding.
 * If already completed onboarding, redirects to assessment or home.
 */
export const OnboardingGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useProfileState();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  if (profile.onboardingCompleted) {
    if (!profile.baselineCompleted) {
      return <Navigate to="/assessment" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
