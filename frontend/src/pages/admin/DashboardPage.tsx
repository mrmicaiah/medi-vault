import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface DashboardStats {
  total_applicants: number;
  in_progress: number;
  submitted: number;
  under_review: number;
  approved: number;
  rejected: number;
  hired: number;
  total_employees: number;
  active_employees: number;
  expiring_documents: number;
  expired_documents: number;
}

interface RecentApplicant {
  application_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_step: number;
  completed_steps: number;
  submitted_at: string | null;
  updated_at: string;
}

interface PipelineStage {
  status: string;
  count: number;
  applicants: RecentApplicant[];
}

interface PipelineResponse {
  stages: PipelineStage[];
  total: number;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [statsRes, pipelineRes] = await Promise.all([
          api.get<DashboardStats>('/admin/dashboard'),
          api.get<PipelineResponse>('/admin/pipeline'),
        ]);
        
        setStats(statsRes);
        setPipeline(pipelineRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Get recent activity from pipeline (last 5 updated applicants)
  const recentActivity = pipeline?.stages
    .flatMap(s => s.applicants.map(a => ({ ...a, status: s.status })))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5) || [];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-gray">Overview of your agency's applicant and employee pipeline.</p>
      </div>

      {error && (
        <Alert variant="error" dismissible>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray">Total Applicants</p>
              <p className="mt-1 font-display text-3xl font-bold text-navy">{stats?.total_applicants || 0}</p>
              <p className="mt-1 text-xs text-gray">
                {stats?.submitted || 0} pending review
              </p>
            </div>
            <div className="rounded-lg p-2 bg-info-bg text-info">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray">Pending Review</p>
              <p className="mt-1 font-display text-3xl font-bold text-navy">
                {(stats?.submitted || 0) + (stats?.under_review || 0)}
              </p>
              <p className="mt-1 text-xs text-gray">
                {stats?.under_review || 0} under review
              </p>
            </div>
            <div className="rounded-lg p-2 bg-warning-bg text-warning">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray">Active Employees</p>
              <p className="mt-1 font-display text-3xl font-bold text-navy">{stats?.active_employees || 0}</p>
              <p className="mt-1 text-xs text-gray">
                {stats?.total_employees || 0} total
              </p>
            </div>
            <div className="rounded-lg p-2 bg-success-bg text-success">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray">Document Alerts</p>
              <p className="mt-1 font-display text-3xl font-bold text-navy">
                {(stats?.expiring_documents || 0) + (stats?.expired_documents || 0)}
              </p>
              <p className="mt-1 text-xs text-gray">
                {stats?.expired_documents || 0} expired
              </p>
            </div>
            <div className="rounded-lg p-2 bg-error-bg text-error">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          header={
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-navy">Recent Activity</h3>
              <Link to="/admin/pipeline" className="text-sm text-maroon hover:text-maroon-light">
                View all
              </Link>
            </div>
          }
        >
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <Link 
                  key={item.application_id} 
                  to={`/admin/applicant/${item.application_id}`}
                  className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-maroon-subtle text-xs font-medium text-maroon">
                    {item.first_name?.[0] || ''}{item.last_name?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate">
                      {item.first_name} {item.last_name}
                    </p>
                    <p className="text-xs text-gray capitalize">
                      {item.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span className="text-xs text-gray-light">{formatDate(item.updated_at)}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray text-center py-4">No recent activity</p>
            )}
          </div>
        </Card>

        <Card
          header={
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-navy">Pipeline Summary</h3>
              <Link to="/admin/pipeline" className="text-sm text-maroon hover:text-maroon-light">
                Manage
              </Link>
            </div>
          }
        >
          <div className="space-y-3">
            {[
              { key: 'in_progress', label: 'In Progress', color: 'bg-info-bg' },
              { key: 'submitted', label: 'Submitted', color: 'bg-warning-bg' },
              { key: 'under_review', label: 'Under Review', color: 'bg-maroon-subtle' },
              { key: 'approved', label: 'Approved', color: 'bg-success-bg' },
              { key: 'rejected', label: 'Rejected', color: 'bg-error-bg' },
              { key: 'hired', label: 'Hired', color: 'bg-success' },
            ].map((stage) => {
              const count = pipeline?.stages.find(s => s.status === stage.key)?.count || 0;
              return (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${stage.color} border border-border`} />
                  <span className="flex-1 text-sm text-slate">{stage.label}</span>
                  <span className="text-sm font-semibold text-navy">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
