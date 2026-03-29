import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Alert } from '../../components/ui/Alert';
import { TOTAL_STEPS } from '../../types';
import { formatDate, daysUntil } from '../../lib/utils';
import { api } from '../../lib/api';

interface Application {
  id: string;
  status: string;
  current_step: number;
  completed_steps: number;
  total_steps: number;
}

interface ApplicationStep {
  step_number: number;
  step_name: string;
  status: string;
}

interface DocItem {
  id: string;
  name: string;
  category: string;
  status: 'approved' | 'pending' | 'expired' | 'missing';
  expires_at?: string;
}

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  approved: 'success',
  pending: 'warning',
  expired: 'error',
  missing: 'neutral',
};

export function ApplicantDashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [documents] = useState<DocItem[]>([
    { id: '1', name: 'Work Authorization', category: 'identification', status: 'missing' },
    { id: '2', name: 'Photo ID (Front)', category: 'identification', status: 'missing' },
    { id: '3', name: 'Photo ID (Back)', category: 'identification', status: 'missing' },
    { id: '4', name: 'Social Security Card', category: 'identification', status: 'missing' },
    { id: '5', name: 'Professional Credentials', category: 'certification', status: 'missing' },
    { id: '6', name: 'CPR Certification', category: 'certification', status: 'missing' },
    { id: '7', name: 'TB Test Results', category: 'health', status: 'missing' },
  ]);

  useEffect(() => {
    const loadApplication = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get existing application
        const res = await api.get<{
          application: Application;
          steps: ApplicationStep[];
        }>('/applications/me');
        
        setApplication(res.application);
        setSteps(res.steps);
      } catch (err) {
        // 404 means no application yet — that's fine
        if (err instanceof Error && err.message.includes('404')) {
          setApplication(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load application');
        }
      } finally {
        setLoading(false);
      }
    };

    loadApplication();
  }, []);

  const completedSteps = application?.completed_steps || 
    steps.filter(s => s.status === 'completed').length;
  
  const currentStep = application?.current_step || 1;
  const hasApplication = application !== null;
  const isSubmitted = application?.status === 'submitted';
  const isApproved = application?.status === 'approved';

  const expiringDocs = documents.filter(
    (d) => d.expires_at && daysUntil(d.expires_at) <= 30 && daysUntil(d.expires_at) > 0
  );

  // Count documents and agreements from steps
  const uploadSteps = steps.filter(s => 
    s.step_number >= 11 && s.step_number <= 17 && s.status === 'completed'
  );
  const agreementSteps = steps.filter(s =>
    (s.step_number === 9 || s.step_number === 10 || s.step_number >= 19) && s.status === 'completed'
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">
          Welcome, {profile?.first_name || 'Applicant'}
        </h1>
        <p className="mt-1 text-sm text-gray">
          Track your application progress and manage your documents.
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible>
          {error}
        </Alert>
      )}

      {isSubmitted && (
        <Alert variant="success" title="Application Submitted">
          Your application has been submitted and is under review. We'll notify you when there's an update.
        </Alert>
      )}

      {isApproved && (
        <Alert variant="success" title="Application Approved">
          Congratulations! Your application has been approved. Please check your email for next steps.
        </Alert>
      )}

      {expiringDocs.length > 0 && (
        <Alert variant="warning" title="Expiring Documents">
          You have {expiringDocs.length} document(s) expiring soon. Please update them to stay compliant.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card header="Application Progress">
            <div className="space-y-4">
              <ProgressBar value={completedSteps} max={TOTAL_STEPS} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray">
                    {completedSteps} of {TOTAL_STEPS} steps completed
                  </p>
                  {hasApplication && completedSteps > 0 && completedSteps < TOTAL_STEPS && (
                    <p className="text-xs text-gray mt-1">
                      Currently on step {currentStep}
                    </p>
                  )}
                </div>
                {!isSubmitted && !isApproved && (
                  <Link to="/applicant/application">
                    <Button size="sm">
                      {!hasApplication || completedSteps === 0 ? 'Start Application' : 'Continue Application'}
                    </Button>
                  </Link>
                )}
                {isSubmitted && (
                  <Badge variant="warning">Under Review</Badge>
                )}
                {isApproved && (
                  <Badge variant="success">Approved</Badge>
                )}
              </div>
            </div>
          </Card>
        </div>

        <Card header="Quick Stats">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray">Status</span>
              <Badge variant={
                isApproved ? 'success' : 
                isSubmitted ? 'warning' : 
                completedSteps === TOTAL_STEPS ? 'success' : 
                completedSteps > 0 ? 'warning' : 'neutral'
              }>
                {isApproved ? 'Approved' :
                 isSubmitted ? 'Under Review' :
                 completedSteps === 0 ? 'Not Started' : 
                 completedSteps === TOTAL_STEPS ? 'Ready to Submit' : 'In Progress'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray">Documents Uploaded</span>
              <span className="text-sm font-medium text-navy">
                {uploadSteps.length} / 7
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray">Agreements Signed</span>
              <span className="text-sm font-medium text-navy">
                {agreementSteps.length} / 6
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card header="Documents">
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-4 border-b border-border pb-2 text-xs font-medium uppercase text-gray">
            <span>Document</span>
            <span>Category</span>
            <span>Status</span>
            <span>Expires</span>
          </div>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="grid grid-cols-4 gap-4 border-b border-border py-3 last:border-0"
            >
              <span className="text-sm font-medium text-slate">{doc.name}</span>
              <span className="text-sm capitalize text-gray">{doc.category}</span>
              <Badge variant={statusVariant[doc.status]}>{doc.status}</Badge>
              <span className="text-sm text-gray">
                {doc.expires_at ? formatDate(doc.expires_at) : '--'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
