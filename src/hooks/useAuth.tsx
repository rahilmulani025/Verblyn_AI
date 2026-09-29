import React, { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface SignUpResult {
  user: User | null;
  session: Session | null;
  isEmailConfirmationRequired: boolean;
  error: AuthError | Error | null;
}

export interface SignInResult {
  user: User | null;
  session: Session | null;
  error: AuthError | Error | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<{ error: AuthError | Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false);

  useEffect(() => {
    // 1. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    // 2. Initial authoritative session check
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!isInitialized.current) {
        isInitialized.current = true;
        if (error) {
          console.warn('Initial session check error:', error.message);
        }
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string): Promise<SignUpResult> => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName?.trim(),
          },
        },
      });

      if (error) {
        return {
          user: null,
          session: null,
          isEmailConfirmationRequired: false,
          error,
        };
      }

      // Check if Supabase withheld the session pending email verification
      const isEmailConfirmationRequired = Boolean(
        data.user && !data.session && (data.user.identities?.length ?? 0) > 0
      );

      return {
        user: data.user,
        session: data.session,
        isEmailConfirmationRequired,
        error: null,
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        isEmailConfirmationRequired: false,
        error: err instanceof Error ? err : new Error('An unknown sign-up error occurred.'),
      };
    }
  };

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { user: null, session: null, error };
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch (err) {
      return {
        user: null,
        session: null,
        error: err instanceof Error ? err : new Error('An unknown login error occurred.'),
      };
    }
  };

  const signOut = async (): Promise<{ error: AuthError | Error | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to sign out.') };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
