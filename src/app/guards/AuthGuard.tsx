import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useProfileState } from './useProfileState';

/**
 * Ensures user is authenticated, has completed onboarding, and baseline assessment
 * before accessing protected home / practice / challenge / progress / profile routes.
 */
export const AuthGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useProfileState();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!profile.baselineCompleted) {
    return <Navigate to="/assessment" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
