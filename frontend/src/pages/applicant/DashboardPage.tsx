import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Alert } from '../../components/ui/Alert';
import { DocumentUploadModal } from '../../components/applicant/DocumentUploadModal';
import { DocumentViewModal } from '../../components/applicant/DocumentViewModal';
import { PhotoIDUploadModal } from '../../components/applicant/PhotoIDUploadModal';
import { PhotoIDViewModal } from '../../components/applicant/PhotoIDViewModal';
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
  11: { name: 'Work Authorization', category: 'Identification', required: true },
  12: { name: 'Photo ID (Front)', category: 'Identification', required: true },
  13: { name: 'Photo ID (Back)', category: 'Identification', required: true },
  14: { name: 'Social Security Card', category: 'Identification', required: true },
  15: { name: 'Professional Credentials', category: 'Certification', required: true },
  16: { name: 'CPR Certification', category: 'Certification', required: true },
  17: { name: 'TB Test Results', category: 'Health', required: true },
};

interface DocumentGroup {
  id: string;
  name: string;
  description: string;
  hasExpiration: boolean;
  steps: number[];
}

const DOCUMENT_GROUPS: DocumentGroup[] = [
  {
    id: 'photo_id',
    name: 'Photo ID',
    description: 'Government-issued photo identification (front and back)',
    hasExpiration: true,
    steps: [12, 13],
  },
  {
    id: 'ssn',
    name: 'Social Security Card',
    description: 'Your Social Security card',
    hasExpiration: false,
    steps: [14],
  },
  {
    id: 'work_auth',
    name: 'Work Authorization',
    description: 'Proof of eligibility to work in the US',
    hasExpiration: true,
    steps: [11],
  },
  {
    id: 'credentials',
    name: 'Professional Credentials',
    description: 'HHA, CNA, or other certifications',
    hasExpiration: true,
    steps: [15],
  },
  {
    id: 'cpr',
    name: 'CPR Certification',
    description: 'Current CPR/BLS certification',
    hasExpiration: true,
    steps: [16],
  },
  {
    id: 'tb_test',
    name: 'TB Test Results',
    description: 'Tuberculosis screening results (valid for 12 months)',
    hasExpiration: true,
    steps: [17],
  },
];

const AGREEMENT_STEP_NUMBERS = [9, 10, 18, 19, 20, 21, 22];

type DocStatus = 'uploaded' | 'needed' | 'expired';

interface DocItem {
  stepNumber: number;
  name: string;
  category: string;
  required: boolean;
  status: DocStatus;
  expirationDate?: string;
  data?: Record<string, unknown>;
}

const statusVariant: Record<DocStatus, 'success' | 'warning' | 'error'> = {
  uploaded: 'success',
  needed: 'warning',
  expired: 'error',
};

const statusLabel: Record<DocStatus, string> = {
  uploaded: 'Uploaded',
  needed: 'Needed',
  expired: 'Expired',
};

export function ApplicantDashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  
  // Single-document upload modal state
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    stepNumber: number;
    stepName: string;
    existingData?: Record<string, unknown>;
  }>({ isOpen: false, stepNumber: 0, stepName: '' });

  // Single-document view modal state
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    stepNumber: number;
    stepName: string;
    data?: Record<string, unknown>;
  }>({ isOpen: false, stepNumber: 0, stepName: '' });

  // Photo ID upload modal (blank form)
  const [photoIdUploadModal, setPhotoIdUploadModal] = useState<{
    isOpen: boolean;
    existingFrontData?: Record<string, unknown>;
    existingBackData?: Record<string, unknown>;
  }>({ isOpen: false });

  // Photo ID view modal (read-only)
  const [photoIdViewModal, setPhotoIdViewModal] = useState<{
    isOpen: boolean;
    frontData?: Record<string, unknown>;
    backData?: Record<string, unknown>;
  }>({ isOpen: false });

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
  const isInProgress = application?.status === 'in_progress';

  const getStepData = (stepNum: number): Record<string, unknown> => {
    const step = steps.find(s => s.step_number === stepNum);
    return (step?.data || {}) as Record<string, unknown>;
  };

  const documents: DocItem[] = Object.entries(DOCUMENT_STEPS).map(([stepNum, doc]) => {
    const stepNumber = parseInt(stepNum);
    const data = getStepData(stepNumber);
    
    let status: DocStatus;
    let expirationDate: string | undefined;

    if (data.file_name) {
      status = 'uploaded';
      
      if (stepNumber === 13) {
        const frontData = getStepData(12);
        expirationDate = frontData.expiration_date as string | undefined;
      } else {
        expirationDate = data.expiration_date as string | undefined;
      }
      
      if (expirationDate && new Date(expirationDate) < new Date()) {
        status = 'expired';
      }
    } else {
      status = 'needed';
    }

    return {
      stepNumber,
      name: doc.name,
      category: doc.category,
      required: doc.required,
      status,
      expirationDate,
      data,
    };
  });

  interface GroupedDoc {
    group: DocumentGroup;
    status: DocStatus;
    expirationDate?: string;
    uploadedCount: number;
    totalCount: number;
    items: DocItem[];
  }

  const groupedDocuments: GroupedDoc[] = DOCUMENT_GROUPS.map(group => {
    const items = group.steps.map(stepNum => 
      documents.find(d => d.stepNumber === stepNum)!
    ).filter(Boolean);

    const uploadedCount = items.filter(d => d.status === 'uploaded' || d.status === 'expired').length;
    const totalCount = items.length;
    
    let status: DocStatus = 'uploaded';
    if (items.some(d => d.status === 'expired')) {
      status = 'expired';
    } else if (items.some(d => d.status === 'needed')) {
      status = 'needed';
    }

    let expirationDate: string | undefined;
    if (group.hasExpiration) {
      if (group.id === 'photo_id') {
        expirationDate = items[0]?.expirationDate;
      } else {
        expirationDate = items.find(d => d.expirationDate)?.expirationDate;
      }
    }

    return {
      group,
      status,
      expirationDate,
      uploadedCount,
      totalCount,
      items,
    };
  });

  const completedSteps = application?.completed_steps || 
    steps.filter(s => s.status === 'completed').length;
  
  const currentStep = application?.current_step || 1;
  const hasApplication = application !== null;

  const getFirstIncompleteStep = (): number => {
    for (let i = 1; i <= 22; i++) {
      const step = steps.find(s => s.step_number === i);
      if (!step || step.status !== 'completed') {
        return i;
      }
    }
    return 22;
  };

  const requiredMissing = documents.filter(d => d.required && d.status === 'needed');
  const expiredDocs = documents.filter(d => d.status === 'expired');
  const expiringDocs = documents.filter(d => 
    d.expirationDate && d.status === 'uploaded' && 
    daysUntil(d.expirationDate) <= 30 && daysUntil(d.expirationDate) > 0
  );

  const uploadedDocs = documents.filter(d => d.status === 'uploaded').length;
  
  const completedAgreements = steps.filter(s =>
    AGREEMENT_STEP_NUMBERS.includes(s.step_number) && s.status === 'completed'
  ).length;

  // Handlers for single documents
  const handleUploadClick = (doc: DocItem) => {
    setUploadModal({
      isOpen: true,
      stepNumber: doc.stepNumber,
      stepName: doc.name,
      existingData: doc.data,
    });
  };

  const handleViewClick = (doc: DocItem) => {
    setViewModal({
      isOpen: true,
      stepNumber: doc.stepNumber,
      stepName: doc.name,
      data: doc.data,
    });
  };

  // Handlers for Photo ID
  const handlePhotoIdUploadClick = () => {
    setPhotoIdUploadModal({
      isOpen: true,
      existingFrontData: getStepData(12),
      existingBackData: getStepData(13),
    });
  };

  const handlePhotoIdViewClick = () => {
    setPhotoIdViewModal({
      isOpen: true,
      frontData: getStepData(12),
      backData: getStepData(13),
    });
  };

  const handleUploadSuccess = () => {
    loadApplication();
  };

  const getApplicationButton = () => {
    if (!hasApplication || completedSteps === 0) {
      return (
        <Link to="/applicant/application">
          <Button>Start Application</Button>
        </Link>
      );
    }
    
    if (isSubmitted || completedSteps === TOTAL_STEPS) {
      return (
        <Badge variant="success">Submitted</Badge>
      );
    }
    
    if (isInProgress) {
      const firstIncomplete = getFirstIncompleteStep();
      return (
        <Link to={`/applicant/application?step=${firstIncomplete}`}>
          <Button>Continue Application</Button>
        </Link>
      );
    }
    
    return null;
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
                  {hasApplication && isInProgress && completedSteps > 0 && completedSteps < TOTAL_STEPS && (
                    <p className="text-xs text-gray mt-1">
                      Currently on step {currentStep}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {isApproved && (
                    <Badge variant="success">Approved</Badge>
                  )}
                  {isRejected && (
                    <Badge variant="error">Not Approved</Badge>
                  )}
                  {!isRejected && !isApproved && getApplicationButton()}
                </div>
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
                isSubmitted ? 'success' : 
                completedSteps === TOTAL_STEPS ? 'success' : 
                completedSteps > 0 ? 'warning' : 'neutral'
              }>
                {isApproved ? 'Approved' :
                 isRejected ? 'Not Approved' :
                 isSubmitted ? 'Submitted' :
                 completedSteps === TOTAL_STEPS ? 'Submitted' :
                 completedSteps === 0 ? 'Not Started' : 'In Progress'}
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
                {completedAgreements} / {AGREEMENT_STEP_NUMBERS.length}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card header="Documents">
        <div className="space-y-4">
          {groupedDocuments.map((groupDoc) => {
            const needsAttention = groupDoc.status === 'needed' || groupDoc.status === 'expired';
            const canUpload = !isRejected;
            const hasUploads = groupDoc.uploadedCount > 0;
            
            return (
              <div
                key={groupDoc.group.id}
                className={`rounded-lg border p-4 ${
                  needsAttention 
                    ? 'border-warning bg-warning-bg' 
                    : 'border-border bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate">{groupDoc.group.name}</h4>
                      <Badge variant={statusVariant[groupDoc.status]}>
                        {groupDoc.totalCount > 1 
                          ? `${groupDoc.uploadedCount}/${groupDoc.totalCount} ${statusLabel[groupDoc.status]}`
                          : statusLabel[groupDoc.status]
                        }
                      </Badge>
                    </div>
                    <p className="text-xs text-gray mt-1">{groupDoc.group.description}</p>
                    
                    {groupDoc.group.hasExpiration && groupDoc.expirationDate && (
                      <p className={`text-xs mt-1 ${
                        groupDoc.status === 'expired' ? 'text-error font-medium' :
                        daysUntil(groupDoc.expirationDate) <= 30 ? 'text-warning font-medium' :
                        'text-gray'
                      }`}>
                        {groupDoc.status === 'expired' 
                          ? `Expired ${formatDate(groupDoc.expirationDate)}`
                          : `Expires ${formatDate(groupDoc.expirationDate)}`
                        }
                        {daysUntil(groupDoc.expirationDate) <= 30 && daysUntil(groupDoc.expirationDate) > 0 && (
                          <span> ({daysUntil(groupDoc.expirationDate)} days)</span>
                        )}
                      </p>
                    )}
                    {groupDoc.group.hasExpiration && !groupDoc.expirationDate && groupDoc.status === 'uploaded' && (
                      <p className="text-xs text-gray mt-1">No expiration</p>
                    )}
                    {!groupDoc.group.hasExpiration && (
                      <p className="text-xs text-gray mt-1">Does not expire</p>
                    )}
                    
                    {groupDoc.totalCount > 1 && (
                      <div className="mt-2 flex gap-4">
                        {groupDoc.items.map(item => (
                          <div key={item.stepNumber} className="flex items-center gap-1 text-xs">
                            {item.status === 'uploaded' ? (
                              <svg className="h-3 w-3 text-success" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : item.status === 'expired' ? (
                              <svg className="h-3 w-3 text-error" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3 text-warning" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className={item.status === 'needed' ? 'text-warning' : item.status === 'expired' ? 'text-error' : 'text-gray'}>
                              {item.name.replace('Photo ID ', '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    {/* Photo ID group: special handling with combined modal */}
                    {groupDoc.group.id === 'photo_id' && canUpload && isSubmitted && (
                      <>
                        {hasUploads && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={handlePhotoIdViewClick}
                          >
                            View
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant={needsAttention ? 'primary' : 'secondary'}
                          onClick={handlePhotoIdUploadClick}
                        >
                          {needsAttention ? 'Upload' : 'Update'}
                        </Button>
                      </>
                    )}
                    {groupDoc.group.id === 'photo_id' && canUpload && !isSubmitted && (
                      <Link to="/applicant/application?step=12">
                        <Button 
                          size="sm" 
                          variant={needsAttention ? 'primary' : 'ghost'}
                        >
                          {needsAttention ? 'Upload' : 'Update'}
                        </Button>
                      </Link>
                    )}
                    
                    {/* Other document groups: View + Update buttons */}
                    {groupDoc.group.id !== 'photo_id' && canUpload && groupDoc.items.map(item => {
                      const showUpload = item.status === 'needed' || item.status === 'expired';
                      const hasFile = item.data?.file_name;
                      
                      return (
                        <div key={item.stepNumber} className="flex gap-2">
                          {isSubmitted ? (
                            <>
                              {hasFile && (
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleViewClick(item)}
                                >
                                  View
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant={showUpload ? 'primary' : 'secondary'}
                                onClick={() => handleUploadClick(item)}
                              >
                                {showUpload ? 'Upload' : 'Update'}
                              </Button>
                            </>
                          ) : (
                            <Link to={`/applicant/application?step=${item.stepNumber}`}>
                              <Button size="sm" variant={showUpload ? 'primary' : 'ghost'}>
                                {showUpload ? 'Upload' : 'Update'}
                              </Button>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-gray">
          All documents are required and must be uploaded before you can be hired.
        </p>
      </Card>

      {/* Single document upload modal */}
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

      {/* Single document view modal */}
      <DocumentViewModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, stepNumber: 0, stepName: '' })}
        stepNumber={viewModal.stepNumber}
        stepName={viewModal.stepName}
        data={viewModal.data}
      />

      {/* Photo ID upload modal (blank form) */}
      {application && (
        <PhotoIDUploadModal
          isOpen={photoIdUploadModal.isOpen}
          onClose={() => setPhotoIdUploadModal({ isOpen: false })}
          onSuccess={handleUploadSuccess}
          applicationId={application.id}
          existingFrontData={photoIdUploadModal.existingFrontData}
          existingBackData={photoIdUploadModal.existingBackData}
        />
      )}

      {/* Photo ID view modal (read-only) */}
      <PhotoIDViewModal
        isOpen={photoIdViewModal.isOpen}
        onClose={() => setPhotoIdViewModal({ isOpen: false })}
        frontData={photoIdViewModal.frontData}
        backData={photoIdViewModal.backData}
      />
    </div>
  );
}
