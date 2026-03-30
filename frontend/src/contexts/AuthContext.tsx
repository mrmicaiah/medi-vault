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
  
  // Simple cache
  const profileCacheRef = useRef<Profile | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Return cache if same user
    if (lastUserIdRef.current === userId && profileCacheRef.current) {
      console.log('[Auth] Using cached profile');
      return profileCacheRef.current;
    }
    
    console.log('[Auth] Fetching profile for:', userId);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        return null;
      }
      
      console.log('[Auth] Profile fetched:', data);
      
      // Cache it
      if (data) {
        profileCacheRef.current = data as Profile;
        lastUserIdRef.current = userId;
      }
      
      return data as Profile | null;
    } catch (err) {
      console.error('[Auth] Profile fetch exception:', err);
      return null;
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (state.user) {
      // Clear cache
      profileCacheRef.current = null;
      
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
    let initialLoad = true;
    
    const handleAuthChange = async (event: string, session: Session | null) => {
      console.log('[Auth] Auth state change:', event);
      
      if (!mounted) return;
      
      if (session?.user) {
        // Only fetch profile on initial load or if user changed
        const needsFetch = initialLoad || lastUserIdRef.current !== session.user.id;
        initialLoad = false;
        
        const profile = needsFetch 
          ? await fetchProfile(session.user.id)
          : profileCacheRef.current;
        
        if (mounted) {
          setState({
            user: session.user,
            session,
            profile,
            role: (profile?.role as UserRole) || null,
            loading: false,
            initialized: true,
          });
        }
      } else {
        // Logged out
        profileCacheRef.current = null;
        lastUserIdRef.current = null;
        
        if (mounted) {
          setState({
            user: null,
            session: null,
            profile: null,
            role: null,
            loading: false,
            initialized: true,
          });
        }
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Get initial session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[Auth] getSession error:', error);
        if (mounted) {
          setState(prev => ({ ...prev, loading: false, initialized: true }));
        }
      }
      // onAuthStateChange will fire with the session
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

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
    profileCacheRef.current = null;
    lastUserIdRef.current = null;
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
