import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';

// TODO: Fetch from API when multi-agency is implemented
const AGENCY = {
  name: 'Eveready HomeCare',
  tagline: 'Always Ready to Meet Your Needs',
  logo: '/logo.png',
};

const LOCATIONS = [
  { id: 'dumfries', name: 'Dumfries', address: 'Dumfries, VA' },
  { id: 'arlington', name: 'Arlington', address: '2700 S. Quincy Street Suite #220, Arlington, VA 22206' },
  { id: 'sterling', name: 'Sterling', address: 'Sterling, VA' },
  { id: 'hampton', name: 'Hampton', address: 'Hampton, VA' },
];

export function ApplyPage() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState<'welcome' | 'location' | 'account'>('welcome');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pre-select location from URL if provided
  useEffect(() => {
    const loc = searchParams.get('location');
    if (loc && LOCATIONS.find(l => l.id === loc)) {
      setSelectedLocation(loc);
    }
  }, [searchParams]);

  // If user is already logged in, redirect to application
  useEffect(() => {
    if (user) {
      navigate('/applicant/application');
    }
  }, [user, navigate]);

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
      // TODO: Pass selectedLocation to signUp when multi-location is implemented
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
      <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-maroon flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold text-navy">You're Almost There!</h2>
          <p className="mb-6 text-gray">
            We've sent a confirmation link to <strong className="text-slate">{email}</strong>. 
            Please check your inbox and click the link to start your application.
          </p>
          <div className="bg-maroon-subtle rounded-lg p-4 mb-6">
            <p className="text-sm text-maroon">
              <strong>Next Steps:</strong> After confirming your email, you'll be able to complete your employment application, upload required documents, and submit for review.
            </p>
          </div>
          <p className="text-xs text-gray">
            Didn't receive the email? Check your spam folder or{' '}
            <button 
              onClick={() => setSuccess(false)} 
              className="font-medium text-maroon hover:text-maroon-light"
            >
              try again
            </button>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navy to-maroon">
      {/* Header */}
      <header className="p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <div>
            <h1 className="text-white font-display font-bold">{AGENCY.name}</h1>
            <p className="text-white/60 text-xs">{AGENCY.tagline}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-12">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center py-12">
            <h2 className="text-4xl font-display font-bold text-white mb-4">
              Join Our Team
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              We're looking for compassionate caregivers to help families across Virginia. 
              Start your application today and make a difference in people's lives.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-left">
                <div className="h-10 w-10 rounded-lg bg-maroon flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Flexible Hours</h3>
                <p className="text-white/70 text-sm">Choose shifts that work with your schedule</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-left">
                <div className="h-10 w-10 rounded-lg bg-maroon flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Competitive Pay</h3>
                <p className="text-white/70 text-sm">Earn great wages with weekly pay</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-left">
                <div className="h-10 w-10 rounded-lg bg-maroon flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Make an Impact</h3>
                <p className="text-white/70 text-sm">Help families and seniors in your community</p>
              </div>
            </div>

            <Button 
              size="lg" 
              className="px-12"
              onClick={() => setStep('location')}
            >
              Start Your Application
            </Button>
            
            <p className="mt-6 text-white/60 text-sm">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-white hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        )}

        {/* Location Selection Step */}
        {step === 'location' && (
          <div className="py-12">
            <button 
              onClick={() => setStep('welcome')}
              className="text-white/60 hover:text-white mb-6 flex items-center gap-2 text-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            <h2 className="text-3xl font-display font-bold text-white mb-2">
              Select Your Location
            </h2>
            <p className="text-white/70 mb-8">
              Choose the office location closest to you. You can work with clients throughout the area.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {LOCATIONS.map((location) => (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocation(location.id)}
                  className={`p-6 rounded-xl text-left transition-all ${
                    selectedLocation === location.id
                      ? 'bg-white ring-4 ring-maroon'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedLocation === location.id
                        ? 'border-maroon bg-maroon'
                        : 'border-white/40'
                    }`}>
                      {selectedLocation === location.id && (
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className={`font-semibold text-lg ${
                        selectedLocation === location.id ? 'text-navy' : 'text-white'
                      }`}>
                        {location.name}
                      </h3>
                      <p className={`text-sm ${
                        selectedLocation === location.id ? 'text-gray' : 'text-white/60'
                      }`}>
                        {location.address}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <Button 
              size="lg"
              className="px-12"
              disabled={!selectedLocation}
              onClick={() => setStep('account')}
            >
              Continue
            </Button>
          </div>
        )}

        {/* Account Creation Step */}
        {step === 'account' && (
          <div className="py-12 max-w-md mx-auto">
            <button 
              onClick={() => setStep('location')}
              className="text-white/60 hover:text-white mb-6 flex items-center gap-2 text-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <Card className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-display font-bold text-navy mb-1">
                  Create Your Account
                </h2>
                <p className="text-gray text-sm">
                  Applying to: <strong className="text-maroon">{LOCATIONS.find(l => l.id === selectedLocation)?.name}</strong>
                </p>
              </div>

              {error && (
                <Alert variant="error" className="mb-4" dismissible onDismiss={() => setError('')}>
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
                  Create Account & Start Application
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-gray">
                Already have an account?{' '}
                <Link to="/auth/login" className="font-medium text-maroon hover:text-maroon-light">
                  Sign In
                </Link>
              </p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
