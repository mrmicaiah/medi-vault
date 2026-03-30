import React, { createContext, useEffect, useState, useRef } from 'react';
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

  // Track if we already have a valid profile to avoid overwriting with null on timeout
  const hasValidProfile = useRef(false);
  const fetchInProgress = useRef(false);

  // Fetch profile with timeout - but don't overwrite valid profile with null
  const fetchProfile = async (userId: string, isRetry = false): Promise<Profile | null> => {
    // Don't fetch if another fetch is in progress
    if (fetchInProgress.current && !isRetry) {
      console.log('[Auth] Fetch already in progress, skipping');
      return null;
    }
    
    fetchInProgress.current = true;
    console.log('[Auth] Fetching profile for:', userId);
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.error('[Auth] Profile fetch timed out after 8s');
        resolve(null);
      }, 8000);
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
      console.log('[Auth] Profile fetched:', data?.role);
      return data;
    })();

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    fetchInProgress.current = false;
    
    // If we got a valid profile, mark it
    if (result) {
      hasValidProfile.current = true;
    }
    
    return result;
  };

  // Initialize auth on mount
  useEffect(() => {
    console.log('[Auth] Initializing...');
    let mounted = true;
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[Auth] Got session:', session ? 'yes' : 'no');
        
        if (!mounted) return;
        
        if (session?.user) {
          console.log('[Auth] User ID:', session.user.id);
          const profile = await fetchProfile(session.user.id);
          
          if (!mounted) return;
          
          setState({
            user: session.user,
            session,
            profile,
            role: (profile?.role as UserRole) || null,
            loading: false,
            initialized: true,
          });
        } else {
          setState(prev => ({ ...prev, loading: false, initialized: true }));
        }
      } catch (err) {
        console.error('[Auth] Init error:', err);
        if (mounted) {
          setState(prev => ({ ...prev, loading: false, initialized: true }));
        }
      }
    };

    initAuth();

    // Listen for auth changes - but be careful not to clobber valid state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state change:', event);
        
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Only fetch if we don't already have a valid profile for this user
          if (!hasValidProfile.current || state.user?.id !== session.user.id) {
            const profile = await fetchProfile(session.user.id);
            if (mounted && profile) {
              setState({
                user: session.user,
                session,
                profile,
                role: (profile?.role as UserRole) || null,
                loading: false,
                initialized: true,
              });
            }
          }
        } else if (event === 'SIGNED_OUT') {
          hasValidProfile.current = false;
          setState({
            user: null,
            session: null,
            profile: null,
            role: null,
            loading: false,
            initialized: true,
          });
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Just update the session, don't refetch profile
          setState(prev => ({
            ...prev,
            session,
            user: session.user,
          }));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
    hasValidProfile.current = false;
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
      const profile = await fetchProfile(state.user.id, true);
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
