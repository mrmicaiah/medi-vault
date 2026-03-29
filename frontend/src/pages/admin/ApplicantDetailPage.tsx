import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { STEP_NAMES, TOTAL_STEPS } from '../../types';
import { formatDate } from '../../lib/utils';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

interface ApplicantDetail {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  application_id: string;
  status: string;
  current_step: number;
  completed_steps: number;
  total_steps: number;
  submitted_at: string | null;
  steps: Array<{
    step_number: number;
    step_name: string;
    status: string;
    data: Record<string, unknown> | null;
    completed_at: string | null;
  }>;
  documents: Array<{
    id: string;
    document_type: string;
    file_name: string;
    created_at: string;
    expires_at: string | null;
    is_current: boolean;
  }>;
  agreements: Array<{
    id: string;
    agreement_type: string;
    signed_at: string;
    pdf_path: string | null;
  }>;
}

const DOCUMENT_STEP_NAMES: Record<number, string> = {
  11: 'Work Authorization',
  12: 'Photo ID (Front)',
  13: 'Photo ID (Back)',
  14: 'Social Security Card',
  15: 'Professional Credentials',
  16: 'CPR Certification',
  17: 'TB Test Results',
};

export function ApplicantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [notes, setNotes] = useState('');

  // Only admins/superadmins can approve/reject, managers can only view
  const isAdmin = role === 'admin' || role === 'superadmin';

  useEffect(() => {
    const loadApplicant = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ApplicantDetail>(`/admin/applicants/${id}`);
        setApplicant(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load applicant');
      } finally {
        setLoading(false);
      }
    };
    
    loadApplicant();
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    
    try {
      setActionLoading(true);
      await api.post(`/admin/applicants/${id}/approve`, { notes });
      setShowApproveModal(false);
      // Reload applicant data
      const res = await api.get<ApplicantDetail>(`/admin/applicants/${id}`);
      setApplicant(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    
    try {
      setActionLoading(true);
      await api.post(`/admin/applicants/${id}/reject`, { notes });
      setShowRejectModal(false);
      // Reload applicant data
      const res = await api.get<ApplicantDetail>(`/admin/applicants/${id}`);
      setApplicant(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  // Get document info from application steps
  const getDocuments = () => {
    if (!applicant) return [];
    
    return [11, 12, 13, 14, 15, 16, 17].map(stepNum => {
      const step = applicant.steps.find(s => s.step_number === stepNum);
      const data = step?.data || {};
      
      const hasFile = Boolean(data.file_name) && !data.skip;
      const skipped = Boolean(data.skip);
      
      return {
        stepNumber: stepNum,
        name: DOCUMENT_STEP_NAMES[stepNum],
        status: hasFile ? 'uploaded' : skipped ? 'skipped' : 'missing',
        fileName: data.file_name as string || null,
        storageUrl: data.storage_url as string || null,
        uploadedAt: data.uploaded_at as string || step?.completed_at || null,
      };
    });
  };

  const documents = getDocuments();

  const docBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    uploaded: 'success',
    skipped: 'warning',
    missing: 'error',
  };

  const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    in_progress: 'info',
    submitted: 'warning',
    under_review: 'info',
    approved: 'success',
    rejected: 'error',
    hired: 'success',
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading applicant...</p>
        </div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray">Applicant not found</p>
        <Link to="/admin/pipeline" className="text-maroon hover:underline mt-2 inline-block">
          Back to Pipeline
        </Link>
      </div>
    );
  }

  const canReview = ['submitted', 'under_review'].includes(applicant.status) && isAdmin;
  const canHire = applicant.status === 'approved' && isAdmin;
  const progress = Math.round((applicant.completed_steps / applicant.total_steps) * 100);

  // Get personal info from step 2
  const personalInfo = applicant.steps.find(s => s.step_number === 2)?.data || {};
  const address = [
    personalInfo.address_line1,
    personalInfo.address_line2,
    personalInfo.city,
    personalInfo.state,
    personalInfo.zip
  ].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/pipeline" className="rounded-lg p-1 hover:bg-gray-100">
            <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">
              {applicant.first_name} {applicant.last_name}
            </h1>
            <p className="mt-1 text-sm text-gray">{applicant.email}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {canReview && (
            <>
              <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)}>
                Reject
              </Button>
              <Button size="sm" onClick={() => setShowApproveModal(true)}>
                Approve
              </Button>
            </>
          )}
          {canHire && (
            <Link to={`/admin/hire/${applicant.application_id}`}>
              <Button size="sm">
                Hire
              </Button>
            </Link>
          )}
          {!isAdmin && ['submitted', 'under_review'].includes(applicant.status) && (
            <Badge variant="info">Admin approval required</Badge>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card header="Personal Information">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-gray">Full Name</p>
                <p className="mt-1 text-sm text-slate">
                  {applicant.first_name} {applicant.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">Email</p>
                <p className="mt-1 text-sm text-slate">{applicant.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">Phone</p>
                <p className="mt-1 text-sm text-slate">
                  {applicant.phone || personalInfo.phone as string || '--'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">Address</p>
                <p className="mt-1 text-sm text-slate">{address || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">Submitted</p>
                <p className="mt-1 text-sm text-slate">
                  {applicant.submitted_at ? formatDate(applicant.submitted_at) : '--'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">SSN (Last 4)</p>
                <p className="mt-1 text-sm text-slate">
                  {personalInfo.ssn_last_four ? `***-**-${personalInfo.ssn_last_four}` : '--'}
                </p>
              </div>
            </div>
          </Card>

          <Card header="Documents">
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.stepNumber} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate">{doc.name}</p>
                      {doc.uploadedAt && (
                        <p className="text-xs text-gray">
                          {doc.status === 'uploaded' ? 'Uploaded' : 'Updated'} {formatDate(doc.uploadedAt)}
                        </p>
                      )}
                      {doc.fileName && (
                        <p className="text-xs text-gray-light">{doc.fileName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={docBadgeVariant[doc.status]}>{doc.status}</Badge>
                    {doc.storageUrl && (
                      <a href={doc.storageUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">View</Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card header="Status">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray">Application Status</span>
                <Badge variant={statusBadgeVariant[applicant.status]}>
                  {applicant.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray">Progress</span>
                <span className="text-sm font-medium text-navy">
                  {applicant.completed_steps}/{applicant.total_steps} ({progress}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-maroon"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </Card>

          <Card header="Application Steps">
            <div className="max-h-96 space-y-1 overflow-y-auto scrollbar-thin">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const stepNum = i + 1;
                const step = applicant.steps.find(s => s.step_number === stepNum);
                const isCompleted = step?.status === 'completed';
                const isSkipped = step?.data?.skip === true;
                
                return (
                  <div key={stepNum} className="flex items-center gap-2 rounded px-2 py-1.5">
                    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs ${
                      isCompleted 
                        ? isSkipped ? 'bg-warning text-white' : 'bg-success text-white'
                        : 'bg-gray-100 text-gray'
                    }`}>
                      {isCompleted ? (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span className={`text-xs ${isCompleted ? 'text-slate' : 'text-gray'}`}>
                      {STEP_NAMES[stepNum]}
                      {isSkipped && <span className="text-warning ml-1">(skipped)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card header="Quick Actions">
            <div className="space-y-2">
              <Button variant="secondary" size="sm" className="w-full" onClick={() => {
                window.open(`/api/documents/download/application?user_id=${applicant.user_id}`, '_blank');
              }}>
                Download Application PDF
              </Button>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => {
                window.open(`/api/documents/download/i9?user_id=${applicant.user_id}`, '_blank');
              }}>
                Download I-9 Form
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Application"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} loading={actionLoading}>
              Approve
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate">
            Are you sure you want to approve <strong>{applicant.first_name} {applicant.last_name}</strong>'s application?
            This will move them to the approved pipeline stage.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              rows={3}
              placeholder="Add any notes about this approval..."
            />
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Application"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} loading={actionLoading}>
              Reject
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate">
            Are you sure you want to reject <strong>{applicant.first_name} {applicant.last_name}</strong>'s application?
          </p>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">
              Reason for rejection
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              rows={3}
              placeholder="Explain why this application is being rejected..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
