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

// Fetch profile outside component to avoid dependency issues
async function fetchProfileFromDb(userId: string): Promise<Profile | null> {
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
    return data as Profile | null;
  } catch (err) {
    console.error('[Auth] Profile fetch exception:', err);
    return null;
  }
}

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
  const profileCacheRef = useRef<{ userId: string; profile: Profile } | null>(null);
  const initRef = useRef(false);

  const refetchProfile = useCallback(async () => {
    if (state.user) {
      profileCacheRef.current = null;
      const profile = await fetchProfileFromDb(state.user.id);
      if (profile) {
        profileCacheRef.current = { userId: state.user.id, profile };
        setState(prev => ({
          ...prev,
          profile,
          role: (profile?.role as UserRole) || null,
        }));
      }
    }
  }, [state.user]);

  useEffect(() => {
    // Prevent double-init in React strict mode
    if (initRef.current) return;
    initRef.current = true;
    
    let mounted = true;
    
    const handleAuthChange = async (event: string, session: Session | null) => {
      console.log('[Auth] Auth state change:', event);
      
      if (!mounted) return;
      
      if (session?.user) {
        // Check cache first
        let profile: Profile | null = null;
        if (profileCacheRef.current?.userId === session.user.id) {
          console.log('[Auth] Using cached profile');
          profile = profileCacheRef.current.profile;
        } else {
          profile = await fetchProfileFromDb(session.user.id);
          if (profile) {
            profileCacheRef.current = { userId: session.user.id, profile };
          }
        }
        
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
        profileCacheRef.current = null;
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

    // Get initial session - this triggers onAuthStateChange
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        console.error('[Auth] getSession error:', error);
        if (mounted) {
          setState(prev => ({ ...prev, loading: false, initialized: true }));
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - runs once

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
