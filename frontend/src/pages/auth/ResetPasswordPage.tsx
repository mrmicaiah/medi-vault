import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <svg className="mx-auto h-12 w-12 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 className="mt-4 font-display text-xl font-semibold text-navy">Check Your Email</h2>
        <p className="mt-2 text-sm text-gray">
          We sent a password reset link to <strong className="text-slate">{email}</strong>. Please check your inbox.
        </p>
        <Link
          to="/auth/login"
          className="mt-6 inline-block text-sm font-medium text-maroon hover:text-maroon-light"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold text-navy">Reset Password</h2>
      <p className="mb-6 text-sm text-gray">
        Enter your email and we'll send you a reset link
      </p>

      {error && (
        <Alert variant="error" className="mb-4" dismissible>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Button type="submit" className="w-full" loading={loading}>
          Send Reset Link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray">
        Remember your password?{' '}
        <Link to="/auth/login" className="font-medium text-maroon hover:text-maroon-light">
          Sign In
        </Link>
      </p>
    </div>
  );
}
