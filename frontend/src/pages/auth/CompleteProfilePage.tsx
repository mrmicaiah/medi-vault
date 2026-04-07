import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

/**
 * CompleteProfilePage
 * 
 * This page is shown after a user clicks an invite link from Supabase.
 * They already have an auth session, but need to:
 * 1. Enter their first/last name
 * 2. Set their password
 * 
 * After completing this, their profile is updated and they're redirected
 * to the appropriate dashboard based on their role.
 */
export function CompleteProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ role: string; agency_id: string } | null>(null);
  
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // Check for error in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashError = hashParams.get('error_description');
    const hashErrorCode = hashParams.get('error_code');
    
    if (hashError) {
      if (hashErrorCode === 'otp_expired') {
        setError('This invitation link has expired. Please ask your administrator to send a new invitation.');
      } else {
        setError(hashError.replace(/\+/g, ' '));
      }
      setLoading(false);
      return;
    }

    // Check for session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No session - maybe still processing, wait a moment
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
            setError('No valid session found. Please request a new invitation link.');
            setLoading(false);
          } else {
            await loadUserData(retrySession.user.id, retrySession.user.email);
          }
        }, 1500);
        return;
      }
      
      await loadUserData(session.user.id, session.user.email);
    };

    const loadUserData = async (userId: string, email: string | undefined) => {
      setUserEmail(email || null);
      
      // Get profile to check role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, agency_id, first_name, last_name')
        .eq('id', userId)
        .single();
      
      if (profileData) {
        setProfile({ role: profileData.role, agency_id: profileData.agency_id });
        
        // If they already have a name set, they may have already completed this
        if (profileData.first_name && profileData.last_name) {
          // Already completed, redirect based on role
          const staffRoles = ['admin', 'superadmin', 'manager'];
          if (staffRoles.includes(profileData.role)) {
            navigate('/admin', { replace: true });
          } else {
            navigate('/applicant', { replace: true });
          }
          return;
        }
      }
      
      setLoading(false);
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Please enter your first and last name');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please request a new invitation.');
        return;
      }

      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (passwordError) {
        throw passwordError;
      }

      // Update profile with name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (profileError) {
        throw profileError;
      }

      // Redirect based on role
      const staffRoles = ['admin', 'superadmin', 'manager'];
      if (profile && staffRoles.includes(profile.role)) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/applicant', { replace: true });
      }

    } catch (err) {
      console.error('[CompleteProfile] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center">
        <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-sm text-gray">Verifying your invitation...</p>
      </div>
    );
  }

  if (error && !userEmail) {
    return (
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="mt-4 font-display text-xl font-semibold text-navy">Unable to Complete Setup</h2>
        <p className="mt-2 text-sm text-gray">{error}</p>
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
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold text-navy">Complete Your Account</h2>
      <p className="mb-6 text-sm text-gray">
        Welcome! Please enter your details to finish setting up your account.
      </p>

      {userEmail && (
        <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray">
            Setting up account for: <span className="font-medium text-slate">{userEmail}</span>
          </p>
          {profile && (
            <p className="text-xs text-gray mt-1">
              Role: <span className="font-medium capitalize">{profile.role}</span>
            </p>
          )}
        </div>
      )}

      {error && (
        <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            placeholder="John"
          />
          <Input
            label="Last Name"
            type="text"
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            placeholder="Smith"
          />
        </div>

        <Input
          label="Create Password"
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="At least 8 characters"
          minLength={8}
        />

        <Input
          label="Confirm Password"
          type="password"
          required
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          placeholder="Re-enter your password"
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Complete Setup
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-gray">
        By continuing, you agree to our terms of service.
      </p>
    </div>
  );
}
