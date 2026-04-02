import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

/**
 * SetPasswordPage
 * 
 * Shown after a user clicks a password reset link and lands on /auth/reset-callback.
 * At this point they should have a valid session from the reset token.
 * 
 * This page lets them set their new password.
 */
export function SetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Check if user has a valid session (from reset token)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      
      if (!session) {
        console.log('[SetPassword] No session found, redirecting to reset request');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      
      // Redirect to login after a moment
      setTimeout(() => {
        navigate('/auth/login', { replace: true });
      }, 2000);
      
    } catch (err) {
      console.error('[SetPassword] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Still checking session
  if (hasSession === null) {
    return (
      <div className="text-center">
        <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray">Loading...</p>
      </div>
    );
  }

  // No session - invalid or expired link
  if (!hasSession) {
    return (
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="mt-4 font-display text-xl font-semibold text-navy">Session Expired</h2>
        <p className="mt-2 text-sm text-gray">
          Your password reset link has expired or is invalid.
        </p>
        <a
          href="/auth/reset-password"
          className="mt-6 inline-block rounded-lg bg-maroon px-4 py-2 text-sm font-medium text-white hover:bg-maroon-light"
        >
          Request a New Link
        </a>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="mt-4 font-display text-xl font-semibold text-navy">Password Updated!</h2>
        <p className="mt-2 text-sm text-gray">
          Your password has been successfully changed. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold text-navy">Set Your Password</h2>
      <p className="mb-6 text-sm text-gray">
        Create a secure password for your account
      </p>

      {error && (
        <Alert variant="error" className="mb-4" dismissible>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          minLength={8}
        />
        
        <Input
          label="Confirm Password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
        />

        <Button type="submit" className="w-full" loading={loading}>
          Set Password
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-gray">
        Password must be at least 8 characters
      </p>
    </div>
  );
}
