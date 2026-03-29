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
  const [completedSteps] = useState(0);
  const [documents] = useState<DocItem[]>([
    { id: '1', name: 'Work Authorization', category: 'identification', status: 'missing' },
    { id: '2', name: 'Photo ID (Front)', category: 'identification', status: 'missing' },
    { id: '3', name: 'Photo ID (Back)', category: 'identification', status: 'missing' },
    { id: '4', name: 'Social Security Card', category: 'identification', status: 'missing' },
    { id: '5', name: 'Professional Credentials', category: 'certification', status: 'missing' },
    { id: '6', name: 'CPR Certification', category: 'certification', status: 'missing' },
    { id: '7', name: 'TB Test Results', category: 'health', status: 'missing' },
  ]);

  const expiringDocs = documents.filter(
    (d) => d.expires_at && daysUntil(d.expires_at) <= 30 && daysUntil(d.expires_at) > 0
  );

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
                <p className="text-sm text-gray">
                  {completedSteps} of {TOTAL_STEPS} steps completed
                </p>
                <Link to="/applicant/application">
                  <Button size="sm">
                    {completedSteps === 0 ? 'Start Application' : 'Continue Application'}
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <Card header="Quick Stats">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray">Status</span>
              <Badge variant={completedSteps === TOTAL_STEPS ? 'success' : 'warning'}>
                {completedSteps === 0 ? 'Not Started' : completedSteps === TOTAL_STEPS ? 'Complete' : 'In Progress'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray">Documents Uploaded</span>
              <span className="text-sm font-medium text-navy">
                {documents.filter((d) => d.status !== 'missing').length} / {documents.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray">Agreements Signed</span>
              <span className="text-sm font-medium text-navy">0 / 6</span>
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
