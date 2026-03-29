import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="mb-1 font-display text-xl font-semibold text-navy">Welcome Back</h2>
      <p className="mb-6 text-sm text-gray">Sign in to continue your application or manage your account</p>

      {error && (
        <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError('')}>
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

        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-border text-maroon focus:ring-maroon" />
            <span className="text-sm text-gray">Remember me</span>
          </label>
          <Link to="/auth/reset-password" className="text-sm font-medium text-maroon hover:text-maroon-light">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Sign In
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-center text-sm text-gray mb-4">
          Looking to apply for a position?
        </p>
        <Link to="/apply">
          <Button variant="secondary" className="w-full">
            Start Your Application
          </Button>
        </Link>
      </div>
    </div>
  );
}
