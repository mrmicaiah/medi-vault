import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export function SignupPage() {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      await signUp(email, password, firstName, lastName);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-2 font-display text-xl font-semibold text-navy">Check Your Email</h2>
        <p className="mb-6 text-sm text-gray">
          We've sent a confirmation link to <strong>{email}</strong>. 
          Please check your inbox and click the link to activate your account.
        </p>
        <p className="text-xs text-gray">
          Didn't receive the email? Check your spam folder or{' '}
          <button 
            onClick={() => setSuccess(false)} 
            className="font-medium text-maroon hover:text-maroon-light"
          >
            try again
          </button>
        </p>
        <div className="mt-6">
          <Link to="/auth/login" className="text-sm font-medium text-maroon hover:text-maroon-light">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold text-navy">Create Account</h2>
      <p className="mb-6 text-sm text-gray">Start your application with MediVault</p>

      {error && (
        <Alert variant="error" className="mb-4" dismissible>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          helperText="Must be at least 8 characters"
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

      <p className="mt-6 text-center text-sm text-gray">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-medium text-maroon hover:text-maroon-light">
          Sign In
        </Link>
      </p>
    </div>
  );
}
