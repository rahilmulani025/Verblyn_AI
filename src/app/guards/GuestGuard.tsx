import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useProfileState } from './useProfileState';

/**
 * Redirects already authenticated users away from /auth into appropriate step:
 * /onboarding (if not onboarded), /assessment (if not assessed), or /home.
 */
export const GuestGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useProfileState();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (profile) {
    if (!profile.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    if (!profile.baselineCompleted) {
      return <Navigate to="/assessment" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
