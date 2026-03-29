import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { STEP_NAMES, TOTAL_STEPS } from '../../types';
import { formatDate } from '../../lib/utils';

export function ApplicantDetailPage() {
  const { id } = useParams();
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const applicant = {
    id: id || '1',
    name: 'Maria Johnson',
    email: 'maria@example.com',
    phone: '(555) 123-4567',
    position: 'Personal Care Aide (PCA)',
    status: 'submitted' as const,
    progress: 100,
    created_at: '2026-03-20',
    submitted_at: '2026-03-29',
    address: '123 Main Street, Richmond, VA 23220',
  };

  const steps = Array.from({ length: TOTAL_STEPS }, (_, i) => ({
    number: i + 1,
    name: STEP_NAMES[i + 1],
    status: i < 22 ? 'completed' : 'not_started',
    completed_at: i < 22 ? '2026-03-29' : undefined,
  }));

  const documents = [
    { id: '1', name: 'Work Authorization', status: 'pending', uploaded_at: '2026-03-28' },
    { id: '2', name: 'Photo ID (Front)', status: 'approved', uploaded_at: '2026-03-28' },
    { id: '3', name: 'Photo ID (Back)', status: 'approved', uploaded_at: '2026-03-28' },
    { id: '4', name: 'Social Security Card', status: 'pending', uploaded_at: '2026-03-28' },
    { id: '5', name: 'CPR Certification', status: 'pending', uploaded_at: '2026-03-29' },
  ];

  const docBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    approved: 'success',
    pending: 'warning',
    rejected: 'error',
    missing: 'neutral',
  };

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
            <h1 className="font-display text-2xl font-bold text-navy">{applicant.name}</h1>
            <p className="mt-1 text-sm text-gray">{applicant.position}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)}>
            Reject
          </Button>
          <Button size="sm" onClick={() => setShowApproveModal(true)}>
            Approve
          </Button>
          <Link to={`/admin/hire/${applicant.id}`}>
            <Button variant="secondary" size="sm">
              Hire
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card header="Personal Information">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-gray">Full Name</p>
                <p className="mt-1 text-sm text-slate">{applicant.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">Email</p>
                <p className="mt-1 text-sm text-slate">{applicant.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">Phone</p>
                <p className="mt-1 text-sm text-slate">{applicant.phone}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">Address</p>
                <p className="mt-1 text-sm text-slate">{applicant.address}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">Applied</p>
                <p className="mt-1 text-sm text-slate">{formatDate(applicant.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-gray">Submitted</p>
                <p className="mt-1 text-sm text-slate">{applicant.submitted_at ? formatDate(applicant.submitted_at) : '--'}</p>
              </div>
            </div>
          </Card>

          <Card header="Documents">
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-slate">{doc.name}</p>
                      <p className="text-xs text-gray">Uploaded {formatDate(doc.uploaded_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={docBadgeVariant[doc.status]}>{doc.status}</Badge>
                    <Button variant="ghost" size="sm">View</Button>
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
                <Badge variant="warning">{applicant.status.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray">Progress</span>
                <span className="text-sm font-medium text-navy">{applicant.progress}%</span>
              </div>
            </div>
          </Card>

          <Card header="Application Steps">
            <div className="max-h-96 space-y-1 overflow-y-auto scrollbar-thin">
              {steps.map((step) => (
                <div key={step.number} className="flex items-center gap-2 rounded px-2 py-1.5">
                  <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs ${
                    step.status === 'completed' ? 'bg-success text-white' : 'bg-gray-100 text-gray'
                  }`}>
                    {step.status === 'completed' ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <span className={`text-xs ${step.status === 'completed' ? 'text-slate' : 'text-gray'}`}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Application"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowApproveModal(false)}>Cancel</Button>
            <Button onClick={() => setShowApproveModal(false)}>Approve</Button>
          </>
        }
      >
        <p className="text-sm text-slate">
          Are you sure you want to approve <strong>{applicant.name}</strong>'s application?
          This will move them to the approved pipeline stage.
        </p>
      </Modal>

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Application"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => setShowRejectModal(false)}>Reject</Button>
          </>
        }
      >
        <p className="text-sm text-slate">
          Are you sure you want to reject <strong>{applicant.name}</strong>'s application?
          This action can be reversed later.
        </p>
      </Modal>
    </div>
  );
}
