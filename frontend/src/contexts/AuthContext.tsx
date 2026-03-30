import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
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

interface SignUpOptions {
  agency_id?: string;
  location_id?: string;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    options?: SignUpOptions
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refetchProfile: () => Promise<void>;
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
  
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchProfile = useCallback(async (userId: string, retryOnFail = true): Promise<Profile | null> => {
    console.log('[Auth] Fetching profile for:', userId);
    
    try {
      // Longer timeout - 10 seconds
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('[Auth] Profile fetch timed out');
          resolve(null);
        }, 10000);
      });

      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('[Auth] Profile fetch error:', error);
            return null;
          }
          console.log('[Auth] Profile fetched:', data);
          retryCountRef.current = 0; // Reset retry count on success
          return data as Profile | null;
        });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      // If failed and should retry, try again after a delay
      if (!result && retryOnFail && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`[Auth] Retrying profile fetch (attempt ${retryCountRef.current}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, 1000)); // Wait 1 second
        return fetchProfile(userId, retryCountRef.current < maxRetries);
      }
      
      return result;
    } catch (err) {
      console.error('[Auth] Profile fetch exception:', err);
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
        role: (profile?.role as UserRole) || null,
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

  const refetchProfile = useCallback(async () => {
    if (state.user) {
      retryCountRef.current = 0;
      const profile = await fetchProfile(state.user.id, true);
      if (profile) {
        setState(prev => ({
          ...prev,
          profile,
          role: (profile?.role as UserRole) || null,
        }));
      }
    }
  }, [state.user, fetchProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state change:', event);
        await setAuthState(session);
      }
    );

    // Then get the initial session
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        console.error('[Auth] getSession error:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          initialized: true,
        }));
      }
      // Let onAuthStateChange handle the state update
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
    lastName: string,
    options?: SignUpOptions
  ): Promise<{ needsEmailConfirmation: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          agency_id: options?.agency_id,
          location_id: options?.location_id,
        },
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
      value={{ ...state, signIn, signUp, signOut, resetPassword, refetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
