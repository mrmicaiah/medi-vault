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
  
  // Track in-flight profile fetch to prevent duplicates
  const fetchingRef = useRef<string | null>(null);
  const profileCacheRef = useRef<Map<string, Profile>>(new Map());

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Check cache first
    const cached = profileCacheRef.current.get(userId);
    if (cached) {
      console.log('[Auth] Using cached profile for:', userId);
      return cached;
    }
    
    // If already fetching this user, wait for result
    if (fetchingRef.current === userId) {
      console.log('[Auth] Already fetching profile for:', userId);
      // Wait a bit and check cache
      await new Promise(r => setTimeout(r, 500));
      return profileCacheRef.current.get(userId) || null;
    }
    
    fetchingRef.current = userId;
    console.log('[Auth] Fetching profile for:', userId);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        fetchingRef.current = null;
        return null;
      }
      
      console.log('[Auth] Profile fetched:', data);
      
      if (data) {
        profileCacheRef.current.set(userId, data as Profile);
      }
      
      fetchingRef.current = null;
      return data as Profile | null;
    } catch (err) {
      console.error('[Auth] Profile fetch exception:', err);
      fetchingRef.current = null;
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
      // Clear cache on logout
      profileCacheRef.current.clear();
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
      // Clear cache to force refetch
      profileCacheRef.current.delete(state.user.id);
      fetchingRef.current = null;
      
      const profile = await fetchProfile(state.user.id);
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
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state change:', event);
        if (mounted) {
          await setAuthState(session);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        console.error('[Auth] getSession error:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            initialized: true,
          }));
        }
      }
    });

    return () => {
      mounted = false;
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
    profileCacheRef.current.clear();
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
