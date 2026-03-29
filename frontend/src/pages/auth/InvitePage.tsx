import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { api } from '../../lib/api';

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'manager';
  agency_name: string;
  location_name?: string;
  expires_at: string;
  used: boolean;
}

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate invitation token
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setInviteError('Invalid invitation link');
        setLoadingInvite(false);
        return;
      }

      try {
        // TODO: Implement this endpoint
        const res = await api.get<Invitation>(`/invitations/${token}`);
        
        if (res.used) {
          setInviteError('This invitation has already been used');
        } else if (new Date(res.expires_at) < new Date()) {
          setInviteError('This invitation has expired');
        } else {
          setInvitation(res);
        }
      } catch (err) {
        setInviteError('Invalid or expired invitation link');
      } finally {
        setLoadingInvite(false);
      }
    };

    validateToken();
  }, [token]);

  // If user is already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!invitation) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement invitation acceptance endpoint
      // This should create the user with the correct role and mark invitation as used
      await api.post(`/invitations/${token}/accept`, {
        first_name: firstName,
        last_name: lastName,
        password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-maroon flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-white/60">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-maroon flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold text-navy">Invalid Invitation</h2>
          <p className="mb-6 text-gray">{inviteError}</p>
          <p className="text-sm text-gray">
            If you believe this is an error, please contact your administrator to request a new invitation.
          </p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-maroon flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold text-navy">Account Created!</h2>
          <p className="mb-6 text-gray">
            Your {invitation?.role} account has been created successfully.
          </p>
          <Link to="/auth/login">
            <Button className="w-full">Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-maroon flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-maroon-subtle">
            <svg className="h-6 w-6 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-display font-bold text-navy mb-1">
            You're Invited!
          </h2>
          <p className="text-gray text-sm">
            Join <strong className="text-navy">{invitation?.agency_name}</strong> as a{' '}
            <span className="capitalize text-maroon font-medium">{invitation?.role}</span>
          </p>
          {invitation?.location_name && (
            <p className="text-gray text-xs mt-1">
              Location: {invitation.location_name}
            </p>
          )}
        </div>

        {error && (
          <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={invitation?.email || ''}
            disabled
            helperText="This is the email your invitation was sent to"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
            />
            <Input
              label="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
            />
          </div>

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />

          <Input
            label="Confirm Password"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
          />

          <Button type="submit" className="w-full" loading={loading}>
            Create Account
          </Button>
        </form>
      </Card>
    </div>
  );
}
