import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { Card } from '../../components/ui/Card';
import { api } from '../../lib/api';

interface Location {
  id: string;
  name: string;
  slug: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string | null;
  is_hiring: boolean;
}

interface Agency {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  locations: Location[];
}

export function ApplyPage() {
  const { agencySlug } = useParams<{ agencySlug?: string }>();
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Agency data
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loadingAgency, setLoadingAgency] = useState(true);
  const [agencyError, setAgencyError] = useState<string | null>(null);
  
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

  // Fetch agency data
  useEffect(() => {
    const fetchAgency = async () => {
      // Use slug from URL params, or default to 'eveready-homecare'
      const slug = agencySlug || 'eveready-homecare';
      
      try {
        setLoadingAgency(true);
        const data = await api.get<Agency>(`/agencies/by-slug/${slug}`);
        setAgency(data);
      } catch (err) {
        setAgencyError('Agency not found. Please check the URL and try again.');
      } finally {
        setLoadingAgency(false);
      }
    };
    
    fetchAgency();
  }, [agencySlug]);

  // Pre-select location from URL if provided
  useEffect(() => {
    const loc = searchParams.get('location');
    if (loc && agency?.locations.find(l => l.slug === loc || l.id === loc)) {
      const location = agency.locations.find(l => l.slug === loc || l.id === loc);
      if (location) {
        setSelectedLocation(location.id);
      }
    }
  }, [searchParams, agency]);

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
      // Pass agency_id and location_id with signup
      await signUp(email, password, firstName, lastName, {
        agency_id: agency?.id,
        location_id: selectedLocation,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loadingAgency) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-teal" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-gray">Loading...</p>
        </div>
      </div>
    );
  }

  // Agency not found
  if (agencyError || !agency) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mb-2 font-display text-2xl font-bold text-navy">Agency Not Found</h2>
          <p className="mb-6 text-gray">{agencyError}</p>
          <Link to="/">
            <Button variant="secondary">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
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
          
          {/* Return to Login Button */}
          <Link to="/auth/login">
            <Button variant="secondary" className="w-full mb-4">
              Return to Login
            </Button>
          </Link>
          
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

  const selectedLocationData = agency.locations.find(l => l.id === selectedLocation);

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-teal px-4 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {agency.logo_url ? (
            <img src={agency.logo_url} alt={agency.name} className="h-12 w-auto max-w-[180px] object-contain bg-white rounded-lg p-1" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{agency.name[0]}</span>
            </div>
          )}
          <div>
            <h1 className="text-white font-display font-bold">{agency.name}</h1>
            {agency.tagline && (
              <p className="text-white/70 text-xs">{agency.tagline}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-12">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center py-12">
            <h2 className="text-4xl font-display font-bold text-navy mb-4">
              Join Our Team
            </h2>
            <p className="text-xl text-gray mb-8 max-w-2xl mx-auto">
              We're looking for compassionate caregivers to help families across Virginia. 
              Start your application today and make a difference in people's lives.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white border border-border rounded-xl p-6 text-left shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-teal flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-navy font-semibold mb-2">Flexible Hours</h3>
                <p className="text-gray text-sm">Choose shifts that work with your schedule</p>
              </div>
              
              <div className="bg-white border border-border rounded-xl p-6 text-left shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-teal flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-navy font-semibold mb-2">Competitive Pay</h3>
                <p className="text-gray text-sm">Earn great wages with weekly pay</p>
              </div>
              
              <div className="bg-white border border-border rounded-xl p-6 text-left shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-teal flex items-center justify-center mb-4">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-navy font-semibold mb-2">Make an Impact</h3>
                <p className="text-gray text-sm">Help families and seniors in your community</p>
              </div>
            </div>

            <Button 
              size="lg" 
              className="px-12"
              onClick={() => setStep('location')}
            >
              Start Your Application
            </Button>
            
            <p className="mt-6 text-gray text-sm">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-teal font-medium hover:underline">
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
              className="text-gray hover:text-navy mb-6 flex items-center gap-2 text-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            
            <h2 className="text-3xl font-display font-bold text-navy mb-2">
              Select Your Location
            </h2>
            <p className="text-gray mb-8">
              Choose the office location closest to you. You can work with clients throughout the area.
            </p>
            
            {agency.locations.length === 0 ? (
              <div className="bg-white border border-border rounded-xl p-8 text-center">
                <p className="text-gray">No locations are currently hiring. Please check back later.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {agency.locations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => setSelectedLocation(location.id)}
                      className={`p-6 rounded-xl text-left transition-all border ${
                        selectedLocation === location.id
                          ? 'bg-white border-teal ring-2 ring-teal shadow-sm'
                          : 'bg-white border-border hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selectedLocation === location.id
                            ? 'border-teal bg-teal'
                            : 'border-gray-300'
                        }`}>
                          {selectedLocation === location.id && (
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-navy">
                            {location.name}
                          </h3>
                          <p className="text-sm text-gray">
                            {location.address_line1 
                              ? `${location.address_line1}, ${location.city}, ${location.state}`
                              : `${location.city}, ${location.state}`
                            }
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
              </>
            )}
          </div>
        )}

        {/* Account Creation Step */}
        {step === 'account' && (
          <div className="py-12 max-w-md mx-auto">
            <button 
              onClick={() => setStep('location')}
              className="text-gray hover:text-navy mb-6 flex items-center gap-2 text-sm"
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
                  Applying to: <strong className="text-maroon">{selectedLocationData?.name}</strong>
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
