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

  const clearStaleSession = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore errors when clearing
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
        if (error.code === 'PGRST116') {
          console.warn('Profile not found for user:', userId);
          return null;
        }
        if (error.message?.includes('JWT')) {
          console.warn('Session invalid, clearing');
          await clearStaleSession();
          return null;
        }
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return null;
    }
  }, [clearStaleSession]);

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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (sessionError) {
          console.error('Session error:', sessionError);
          await clearStaleSession();
          setState({
            ...emptyState,
            loading: false,
            initialized: true,
          });
          return;
        }

        if (!session) {
          setState({
            ...emptyState,
            loading: false,
            initialized: true,
          });
          return;
        }

        const profile = await fetchProfile(session.user.id);
        
        if (!mounted) return;

        if (!profile) {
          console.warn('Session exists but no profile found, clearing session');
          await clearStaleSession();
          setState({
            ...emptyState,
            loading: false,
            initialized: true,
          });
          return;
        }

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
          await clearStaleSession();
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

      console.log('Auth event:', event);

      if (event === 'SIGNED_OUT') {
        setState({
          ...emptyState,
          loading: false,
          initialized: true,
        });
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (session) {
          setState(prev => ({
            ...prev,
            session,
            user: session.user,
          }));
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (!session) {
          setState({
            ...emptyState,
            loading: false,
            initialized: true,
          });
          return;
        }

        const profile = await fetchProfile(session.user.id);
        
        if (mounted) {
          setState({
            user: session.user,
            session,
            profile,
            role: profile?.role || null,
            loading: false,
            initialized: true,
            error: null,
          });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, clearStaleSession]);

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
    await supabase.auth.signOut();
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
