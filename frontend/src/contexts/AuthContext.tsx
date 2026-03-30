import React, { createContext, useEffect, useState } from 'react';
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

  // Fetch profile with timeout
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    console.log('[Auth] Fetching profile for:', userId);
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.error('[Auth] Profile fetch timed out after 5s');
        resolve(null);
      }, 5000);
    });

    const fetchPromise = (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        return null;
      }
      console.log('[Auth] Profile fetched:', data);
      return data;
    })();

    return Promise.race([fetchPromise, timeoutPromise]);
  };

  // Initialize auth on mount
  useEffect(() => {
    console.log('[Auth] Initializing...');
    
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] Got session:', session ? 'yes' : 'no');
      
      if (session?.user) {
        console.log('[Auth] User ID:', session.user.id);
        const profile = await fetchProfile(session.user.id);
        console.log('[Auth] Setting state with profile:', profile?.role);
        setState({
          user: session.user,
          session,
          profile,
          role: (profile?.role as UserRole) || null,
          loading: false,
          initialized: true,
        });
      } else {
        console.log('[Auth] No session, setting initialized');
        setState(prev => ({ ...prev, loading: false, initialized: true }));
      }
    }).catch(err => {
      console.error('[Auth] getSession error:', err);
      setState(prev => ({ ...prev, loading: false, initialized: true }));
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: session.user,
            session,
            profile,
            role: (profile?.role as UserRole) || null,
            loading: false,
            initialized: true,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            profile: null,
            role: null,
            loading: false,
            initialized: true,
          });
        }
        // Ignore TOKEN_REFRESHED and other events - don't refetch
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
    return { needsEmailConfirmation: !!data.user && !data.session };
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

  const refetchProfile = async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      if (profile) {
        setState(prev => ({ ...prev, profile, role: (profile.role as UserRole) || null }));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signOut, resetPassword, refetchProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
