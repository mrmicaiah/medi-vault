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
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
  });

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log('[Auth] Fetching profile for:', userId);
    
    // Add timeout to prevent hanging forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        return null;
      }
      console.log('[Auth] Profile fetched:', data);
      return data as Profile | null;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[Auth] Profile fetch timed out');
      } else {
        console.error('[Auth] Profile fetch exception:', err);
      }
      return null;
    }
  }, []);

  const setAuthState = useCallback(async (session: Session | null) => {
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      setState({
        user: session.user,
        session,
        profile,
        role: profile?.role || null,
        loading: false,
        initialized: true,
      });
    } else {
      setState({
        user: null,
        session: null,
        profile: null,
        role: null,
        loading: false,
        initialized: true,
      });
    }
  }, [fetchProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state change:', event);
        await setAuthState(session);
      }
    );

    // Then get the initial session
    // The onAuthStateChange will fire with INITIAL_SESSION
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth] getSession error:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          initialized: true,
        }));
      }
      // Don't set state here - let onAuthStateChange handle it
      // This avoids race conditions
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAuthState]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ needsEmailConfirmation: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    
    if (error) throw error;
    
    const needsEmailConfirmation = !!data.user && !data.session;
    return { needsEmailConfirmation };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-callback`,
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}
