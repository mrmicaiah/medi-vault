import React, { createContext, useEffect, useState, useCallback } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types';

interface AuthState {
  user: SupabaseUser | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    role: null,
    loading: true,
    initialized: false,
    error: null,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Retry logic - profile might not exist immediately after signup
    for (let i = 0; i < 3; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (data) return data as Profile;
        if (error && error.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is expected if trigger hasn't run yet
          console.error('Error fetching profile:', error);
        }
      } catch (err) {
        console.error('Exception fetching profile:', err);
      }
      // Wait 500ms before retry
      if (i < 2) await new Promise(r => setTimeout(r, 500));
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({
      ...prev,
      profile,
      role: profile?.role || null,
    }));
  }, [state.user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Session error:', error);
          // Clear any stale session data
          await supabase.auth.signOut();
          setState({
            user: null,
            session: null,
            profile: null,
            role: null,
            loading: false,
            initialized: true,
            error: null,
          });
          return;
        }

        let profile: Profile | null = null;
        if (session?.user) {
          profile = await fetchProfile(session.user.id);
          
          // If we have a session but no profile, the session might be invalid
          if (!profile) {
            console.warn('Session exists but no profile found, signing out');
            await supabase.auth.signOut();
            setState({
              user: null,
              session: null,
              profile: null,
              role: null,
              loading: false,
              initialized: true,
              error: null,
            });
            return;
          }
        }

        if (mounted) {
          setState({
            user: session?.user || null,
            session,
            profile,
            role: profile?.role || null,
            loading: false,
            initialized: true,
            error: null,
          });
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          // On any error, clear state and let user log in fresh
          await supabase.auth.signOut();
          setState({
            user: null,
            session: null,
            profile: null,
            role: null,
            loading: false,
            initialized: true,
            error: 'Session expired. Please log in again.',
          });
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Handle sign out event
      if (event === 'SIGNED_OUT' || !session) {
        setState({
          user: null,
          session: null,
          profile: null,
          role: null,
          loading: false,
          initialized: true,
          error: null,
        });
        return;
      }

      // Handle sign in / token refresh
      let profile: Profile | null = null;
      if (session?.user) {
        profile = await fetchProfile(session.user.id);
      }

      if (mounted) {
        setState({
          user: session?.user || null,
          session,
          profile,
          role: profile?.role || null,
          loading: false,
          initialized: true,
          error: null,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
    setState((prev) => ({ ...prev, loading: false }));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      profile: null,
      role: null,
      loading: false,
      initialized: true,
      error: null,
    });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-callback`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signOut, resetPassword, refreshProfile, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}
