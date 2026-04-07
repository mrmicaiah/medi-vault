import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * AuthCallbackPage
 * 
 * This page handles Supabase auth callbacks including:
 * - Invite link clicks (type=invite)
 * - Magic link logins
 * - OAuth callbacks
 * 
 * Supabase redirects users here after email verification/invite acceptance.
 * The page processes the auth token and redirects to the appropriate place.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    // Check for error in URL hash (Supabase puts errors here for invite/magic links)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashError = hashParams.get('error_description');
    const hashErrorCode = hashParams.get('error_code');
    
    // Also check query params
    const queryParams = new URLSearchParams(window.location.search);
    const queryError = queryParams.get('error_description');
    
    const errorDescription = hashError || queryError;
    
    if (errorDescription) {
      // Handle specific error codes
      if (hashErrorCode === 'otp_expired') {
        setError('This invitation link has expired. Please ask your administrator to send a new invitation.');
      } else {
        setError(errorDescription.replace(/\+/g, ' '));
      }
      return;
    }

    setStatus('Verifying your account...');

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthCallback] Auth event:', event, 'session:', !!session);
        
        if (event === 'SIGNED_IN' && session) {
          // User is now signed in
          const user = session.user;
          
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('first_name, role')
              .eq('id', user.id)
              .single();
            
            if (profile) {
              // Profile exists, redirect based on role
              const staffRoles = ['admin', 'superadmin', 'manager'];
              if (staffRoles.includes(profile.role)) {
                navigate('/admin', { replace: true });
              } else {
                navigate('/applicant', { replace: true });
              }
            } else {
              // No profile yet - this is a new invited user
              // They need to set their password first
              navigate('/auth/set-password', { replace: true });
            }
          } catch (err) {
            console.error('[AuthCallback] Error checking profile:', err);
            navigate('/', { replace: true });
          }
        } else if (event === 'PASSWORD_RECOVERY') {
          navigate('/auth/set-password', { replace: true });
        } else if (event === 'USER_UPDATED') {
          navigate('/', { replace: true });
        }
      }
    );

    // Check for existing session
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[AuthCallback] Found existing session, redirecting...');
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            const staffRoles = ['admin', 'superadmin', 'manager'];
            if (staffRoles.includes(profile.role)) {
              navigate('/admin', { replace: true });
            } else {
              navigate('/applicant', { replace: true });
            }
          } else {
            navigate('/', { replace: true });
          }
        } catch {
          navigate('/', { replace: true });
        }
      }
    };
    
    // Give Supabase a moment to process the hash/token
    setTimeout(checkExistingSession, 1000);

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (error) {
    return (
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="mt-4 font-display text-xl font-semibold text-navy">Link Expired or Invalid</h2>
        <p className="mt-2 text-sm text-gray">
          {error}
        </p>
        <a
          href="/auth/login"
          className="mt-6 inline-block rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-white hover:bg-maroon-light"
        >
          Go to Login
        </a>
      </div>
    );
  }

  return (
    <div className="text-center">
      <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <p className="mt-4 text-sm text-gray">{status}</p>
    </div>
  );
}
