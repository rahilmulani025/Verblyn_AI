import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { profileApi } from '@/features/profile/profile.api';
import { UserProfile } from '@/features/profile/profile.types';

let cachedProfile: UserProfile | null = null;
const listeners = new Set<() => void>();

export function invalidateProfileCache() {
  cachedProfile = null;
  listeners.forEach((l) => l());
}

export function useProfileState() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [loading, setLoading] = useState<boolean>(!cachedProfile && !!user);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      cachedProfile = null;
      setLoading(false);
      return;
    }

    try {
      const data = await profileApi.getProfile();
      cachedProfile = data;
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile state:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchProfile();

    const listener = () => fetchProfile();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [authLoading, fetchProfile]);

  return {
    profile,
    loading: authLoading || loading,
    refetchProfile: fetchProfile,
  };
}
