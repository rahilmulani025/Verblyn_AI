import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { profileApi } from '@/features/profile/profile.api';
import { UserProfile } from '@/features/profile/profile.types';

let cachedProfile: UserProfile | null = null;
let cachedProfileUserId: string | null = null;
const listeners = new Set<() => void>();

export function invalidateProfileCache() {
  cachedProfile = null;
  cachedProfileUserId = null;
  listeners.forEach((l) => l());
}

export function useProfileState() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (user && cachedProfileUserId === user.id) {
      return cachedProfile;
    }
    return null;
  });
  const [isFetchingProfile, setIsFetchingProfile] = useState<boolean>(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(() => {
    if (user && cachedProfileUserId === user.id) {
      return user.id;
    }
    return null;
  });

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (activeUserId: string) => {
    setIsFetchingProfile(true);
    try {
      const data = await profileApi.getProfile();
      if (isMounted.current) {
        cachedProfile = data;
        cachedProfileUserId = activeUserId;
        setProfile(data);
        setResolvedUserId(activeUserId);
      }
    } catch (err) {
      console.error('Failed to load profile state:', err);
      if (isMounted.current) {
        setProfile(null);
        setResolvedUserId(activeUserId);
      }
    } finally {
      if (isMounted.current) {
        setIsFetchingProfile(false);
      }
    }
  }, []);

  useEffect(() => {
    // If Supabase auth session is still initializing, wait
    if (authLoading) return;

    // If user is unauthenticated, resolve immediately to null
    if (!user) {
      setProfile(null);
      setResolvedUserId(null);
      cachedProfile = null;
      cachedProfileUserId = null;
      return;
    }

    // If user changed or not yet resolved, fetch profile
    if (resolvedUserId !== user.id) {
      fetchProfile(user.id);
    }

    const listener = () => {
      if (user) {
        fetchProfile(user.id);
      }
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [authLoading, user, resolvedUserId, fetchProfile]);

  // Loading is true if:
  // 1. Auth session is still initializing (authLoading)
  // 2. We have an authenticated user whose profile has not yet completed loading
  const isProfilePending = Boolean(user && (resolvedUserId !== user.id || isFetchingProfile));
  const combinedLoading = authLoading || isProfilePending;

  return {
    profile,
    loading: combinedLoading,
    refetchProfile: () => {
      if (user) fetchProfile(user.id);
    },
  };
}
