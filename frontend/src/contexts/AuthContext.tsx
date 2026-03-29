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

const emptyState: Omit<AuthState, 'loading' | 'initialized'> = {
  user: null,
  session: null,
  profile: null,
  role: null,
  error: null,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ...emptyState,
    loading: true,
    initialized: false,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearSession = useCallback(async () => {
    try {
      // Clear local storage directly as backup
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('Error clearing session:', e);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profile fetch error:', error.code, error.message);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return null;
    }
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
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      // Set a timeout to prevent infinite spinning
      timeoutId = setTimeout(() => {
        if (mounted && state.loading) {
          console.warn('Auth init timed out, clearing session');
          clearSession();
          setState({
            ...emptyState,
            loading: false,
            initialized: true,
          });
        }
      }, 5000); // 5 second timeout

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (sessionError) {
          console.error('Session error:', sessionError);
          await clearSession();
          setState({
            ...emptyState,
            loading: false,
            initialized: true,
          });
          return;
        }

        // No session = not logged in
        if (!session) {
          setState({
            ...emptyState,
            loading: false,
            initialized: true,
          });
          return;
        }

        // Try to fetch profile
        const profile = await fetchProfile(session.user.id);
        
        if (!mounted) return;

        // If no profile, clear session and let user log in fresh
        if (!profile) {
          console.warn('No profile found for session, clearing');
          await clearSession();
          setState({
            ...emptyState,
            loading: false,
            initialized: true,
          });
          return;
        }

        // Success!
        setState({
          user: session.user,
          session,
          profile,
          role: profile.role || null,
          loading: false,
          initialized: true,
          error: null,
        });

      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          await clearSession();
          setState({
            ...emptyState,
            loading: false,
            initialized: true,
          });
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setState({
          ...emptyState,
          loading: false,
          initialized: true,
        });
        return;
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        setState(prev => ({
          ...prev,
          session,
          user: session.user,
        }));
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        const profile = await fetchProfile(session.user.id);
        
        if (mounted) {
          if (profile) {
            setState({
              user: session.user,
              session,
              profile,
              role: profile.role || null,
              loading: false,
              initialized: true,
              error: null,
            });
          } else {
            // No profile, clear and show login
            await clearSession();
            setState({
              ...emptyState,
              loading: false,
              initialized: true,
            });
          }
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfile, clearSession]);

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
    setState((prev) => ({ ...prev, loading: true }));
    await clearSession();
    setState({
      ...emptyState,
      loading: false,
      initialized: true,
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
