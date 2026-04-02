import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

/**
 * ResetCallbackPage
 * 
 * This page handles the redirect from Supabase password reset emails.
 * When a user clicks the reset link in their email, Supabase redirects
 * them here with a token in the URL hash.
 * 
 * Flow:
 * 1. User clicks link in email → lands here with #access_token=...
 * 2. Supabase auto-exchanges the token for a session
 * 3. We detect the session and redirect to /auth/set-password
 * 4. User sets their new password
 */
export function ResetCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in URL params (Supabase puts errors here)
    const params = new URLSearchParams(window.location.search);
    const errorDescription = params.get('error_description');
    
    if (errorDescription) {
      setError(errorDescription);
      return;
    }

    // Supabase will auto-detect the hash fragment and establish a session
    // We just need to listen for the auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[ResetCallback] Auth event:', event);
        
        if (event === 'PASSWORD_RECOVERY') {
          // User came from password reset link - redirect to set password page
          navigate('/auth/set-password', { replace: true });
        } else if (event === 'SIGNED_IN' && session) {
          // Also handle SIGNED_IN as backup (some Supabase versions use this)
          navigate('/auth/set-password', { replace: true });
        }
      }
    );

    // Also check if we already have a session (in case event already fired)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/auth/set-password', { replace: true });
      }
    };
    
    // Small delay to let Supabase process the hash
    setTimeout(checkSession, 500);

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (error) {
    return (
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="mt-4 font-display text-xl font-semibold text-navy">Reset Link Expired</h2>
        <p className="mt-2 text-sm text-gray">
          {error}
        </p>
        <a
          href="/auth/reset-password"
          className="mt-6 inline-block text-sm font-medium text-maroon hover:text-maroon-light"
        >
          Request a New Link
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
      <p className="mt-4 text-sm text-gray">Verifying your reset link...</p>
    </div>
  );
}
