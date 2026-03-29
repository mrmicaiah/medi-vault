import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Alert } from '../../components/ui/Alert';
import { DocumentUploadModal } from '../../components/applicant/DocumentUploadModal';
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
  step_type: string;
  status: string;
  data: Record<string, unknown> | null;
}

const DOCUMENT_STEPS: Record<number, { name: string; category: string; required: boolean }> = {
  11: { name: 'Work Authorization', category: 'identification', required: true },
  12: { name: 'Photo ID (Front)', category: 'identification', required: true },
  13: { name: 'Photo ID (Back)', category: 'identification', required: true },
  14: { name: 'Social Security Card', category: 'identification', required: true },
  15: { name: 'Professional Credentials', category: 'certification', required: false },
  16: { name: 'CPR Certification', category: 'certification', required: false },
  17: { name: 'TB Test Results', category: 'health', required: false },
};

type DocStatus = 'uploaded' | 'skipped' | 'missing' | 'expired';

interface DocItem {
  stepNumber: number;
  name: string;
  category: string;
  required: boolean;
  status: DocStatus;
  expirationDate?: string;
  data?: Record<string, unknown>;
}

const statusVariant: Record<DocStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  uploaded: 'success',
  skipped: 'warning',
  missing: 'neutral',
  expired: 'error',
};

const statusLabel: Record<DocStatus, string> = {
  uploaded: 'Uploaded',
  skipped: 'Needed',
  missing: 'Not Started',
  expired: 'Expired',
};

export function ApplicantDashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  
  // Modal state
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    stepNumber: number;
    stepName: string;
    existingData?: Record<string, unknown>;
  }>({ isOpen: false, stepNumber: 0, stepName: '' });

  const loadApplication = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await api.get<{
        application: Application;
        steps: ApplicationStep[];
      }>('/applications/me');
      
      setApplication(res.application);
      setSteps(res.steps);
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setApplication(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load application');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, []);

  const isSubmitted = ['submitted', 'under_review', 'approved'].includes(application?.status || '');
  const isApproved = application?.status === 'approved';
  const isRejected = application?.status === 'rejected';

  // Build documents list from steps
  const documents: DocItem[] = Object.entries(DOCUMENT_STEPS).map(([stepNum, doc]) => {
    const step = steps.find(s => s.step_number === parseInt(stepNum));
    const data = step?.data || {};
    
    let status: DocStatus = 'missing';
    let expirationDate: string | undefined;

    if (step?.status === 'completed') {
      if (data.skip) {
        status = 'skipped';
      } else if (data.file_name) {
        status = 'uploaded';
        const expDate = data.expiration_date as string | undefined;
        if (expDate) {
          expirationDate = expDate;
          if (new Date(expDate) < new Date()) {
            status = 'expired';
          }
        }
      }
    }

    return {
      stepNumber: parseInt(stepNum),
      name: doc.name,
      category: doc.category,
      required: doc.required,
      status,
      expirationDate,
      data: data as Record<string, unknown>,
    };
  });

  const completedSteps = application?.completed_steps || 
    steps.filter(s => s.status === 'completed').length;
  
  const currentStep = application?.current_step || 1;
  const hasApplication = application !== null;

  const requiredMissing = documents.filter(d => d.required && (d.status === 'skipped' || d.status === 'missing'));
  const expiredDocs = documents.filter(d => d.status === 'expired');
  const expiringDocs = documents.filter(d => 
    d.expirationDate && d.status === 'uploaded' && 
    daysUntil(d.expirationDate) <= 30 && daysUntil(d.expirationDate) > 0
  );

  const uploadedDocs = documents.filter(d => d.status === 'uploaded').length;
  const agreementSteps = steps.filter(s =>
    (s.step_number === 9 || s.step_number === 10 || s.step_number >= 18) && 
    s.status === 'completed'
  );

  const handleUploadClick = (doc: DocItem) => {
    setUploadModal({
      isOpen: true,
      stepNumber: doc.stepNumber,
      stepName: doc.name,
      existingData: doc.data,
    });
  };

  const handleUploadSuccess = () => {
    loadApplication(); // Reload to show updated data
  };

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

      {isSubmitted && !isApproved && (
        <Alert variant="success" title="Application Submitted">
          Your application has been submitted and is under review. 
          {requiredMissing.length > 0 && (
            <span> You can still upload any missing documents below.</span>
          )}
        </Alert>
      )}

      {isApproved && (
        <Alert variant="success" title="Application Approved">
          Congratulations! Your application has been approved. Please check your email for next steps.
        </Alert>
      )}

      {isRejected && (
        <Alert variant="error" title="Application Not Approved">
          Unfortunately, your application was not approved at this time. Please contact us for more information.
        </Alert>
      )}

      {requiredMissing.length > 0 && isSubmitted && (
        <Alert variant="warning" title="Documents Still Needed">
          You have {requiredMissing.length} required document(s) that need to be uploaded before you can be hired.
          Please upload them below.
        </Alert>
      )}

      {expiredDocs.length > 0 && (
        <Alert variant="error" title="Expired Documents">
          You have {expiredDocs.length} expired document(s) that need to be updated.
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
                  {hasApplication && !isSubmitted && completedSteps > 0 && completedSteps < TOTAL_STEPS && (
                    <p className="text-xs text-gray mt-1">
                      Currently on step {currentStep}
                    </p>
                  )}
                </div>
                {!isSubmitted && !isRejected && (
                  <Link to="/applicant/application">
                    <Button size="sm">
                      {!hasApplication || completedSteps === 0 ? 'Start Application' : 'Continue Application'}
                    </Button>
                  </Link>
                )}
                {isSubmitted && !isApproved && (
                  <Badge variant="warning">Under Review</Badge>
                )}
                {isApproved && (
                  <Badge variant="success">Approved</Badge>
                )}
                {isRejected && (
                  <Badge variant="error">Not Approved</Badge>
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
                isRejected ? 'error' :
                isSubmitted ? 'warning' : 
                completedSteps === TOTAL_STEPS ? 'success' : 
                completedSteps > 0 ? 'warning' : 'neutral'
              }>
                {isApproved ? 'Approved' :
                 isRejected ? 'Not Approved' :
                 isSubmitted ? 'Under Review' :
                 completedSteps === 0 ? 'Not Started' : 
                 completedSteps === TOTAL_STEPS ? 'Ready to Submit' : 'In Progress'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray">Documents Uploaded</span>
              <span className="text-sm font-medium text-navy">
                {uploadedDocs} / {Object.keys(DOCUMENT_STEPS).length}
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
          <div className="grid grid-cols-12 gap-4 border-b border-border pb-2 text-xs font-medium uppercase text-gray">
            <span className="col-span-4">Document</span>
            <span className="col-span-2">Category</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2">Expires</span>
            <span className="col-span-2">Action</span>
          </div>
          {documents.map((doc) => {
            const isSkippedRequired = doc.required && doc.status === 'skipped';
            const needsAttention = isSkippedRequired || doc.status === 'expired';
            const canUpload = isSubmitted || !isRejected;
            
            return (
              <div
                key={doc.stepNumber}
                className={`grid grid-cols-12 gap-4 border-b border-border py-3 last:border-0 ${
                  needsAttention ? 'bg-warning-bg -mx-4 px-4 rounded-lg' : ''
                }`}
              >
                <div className="col-span-4 flex items-center gap-2">
                  <span className="text-sm font-medium text-slate">{doc.name}</span>
                  {doc.required && (
                    <span className="text-xs text-maroon">*</span>
                  )}
                </div>
                <span className="col-span-2 text-sm capitalize text-gray">{doc.category}</span>
                <div className="col-span-2">
                  <Badge variant={statusVariant[doc.status]}>
                    {statusLabel[doc.status]}
                  </Badge>
                </div>
                <span className="col-span-2 text-sm text-gray">
                  {doc.expirationDate ? formatDate(doc.expirationDate) : '--'}
                </span>
                <div className="col-span-2">
                  {canUpload && (doc.status === 'skipped' || doc.status === 'missing' || doc.status === 'expired') && (
                    isSubmitted ? (
                      // Use modal for submitted applications
                      <Button 
                        size="sm" 
                        variant={needsAttention ? 'primary' : 'secondary'}
                        onClick={() => handleUploadClick(doc)}
                      >
                        Upload
                      </Button>
                    ) : (
                      // Use wizard for in-progress applications
                      <Link to={`/applicant/application?step=${doc.stepNumber}`}>
                        <Button size="sm" variant={needsAttention ? 'primary' : 'secondary'}>
                          Upload
                        </Button>
                      </Link>
                    )
                  )}
                  {doc.status === 'uploaded' && canUpload && (
                    isSubmitted ? (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleUploadClick(doc)}
                      >
                        Update
                      </Button>
                    ) : (
                      <Link to={`/applicant/application?step=${doc.stepNumber}`}>
                        <Button size="sm" variant="ghost">
                          Update
                        </Button>
                      </Link>
                    )
                  )}
                </div>
              </div>
            );
          })}n        </div>
        <p className="mt-4 text-xs text-gray">
          <span className="text-maroon">*</span> Required documents must be uploaded before you can be hired.
        </p>
      </Card>

      {/* Document Upload Modal */}
      {application && (
        <DocumentUploadModal
          isOpen={uploadModal.isOpen}
          onClose={() => setUploadModal({ isOpen: false, stepNumber: 0, stepName: '' })}
          onSuccess={handleUploadSuccess}
          applicationId={application.id}
          stepNumber={uploadModal.stepNumber}
          stepName={uploadModal.stepName}
          existingData={uploadModal.existingData}
        />
      )}
    </div>
  );
}
