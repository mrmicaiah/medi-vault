import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';

interface DashboardStats {
  total_applicants: number;
  pending_review: number;
  approved_this_month: number;
  expiring_documents: number;
  recent_applications: Array<{
    id: string;
    status: string;
    created_at: string;
    applicant_name: string;
    email: string;
  }>;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<DashboardStats>('/admin/dashboard');
        setStats(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-gray">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible>
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link to="/admin/pipeline" className="group">
          <Card padding="md" className="transition-shadow group-hover:shadow-md">
            <p className="text-sm text-gray">New Applicants</p>
            <p className="mt-2 font-display text-4xl font-bold text-navy">{stats?.total_applicants || 0}</p>
          </Card>
        </Link>

        <Link to="/admin/pipeline?filter=pending" className="group">
          <Card padding="md" className="transition-shadow group-hover:shadow-md">
            <p className="text-sm text-gray">Awaiting Review</p>
            <p className="mt-2 font-display text-4xl font-bold text-warning">{stats?.pending_review || 0}</p>
          </Card>
        </Link>

        <Link to="/admin/training-leads" className="group">
          <Card padding="md" className="transition-shadow group-hover:shadow-md">
            <p className="text-sm text-gray">Training Leads</p>
            <p className="mt-2 font-display text-4xl font-bold text-maroon">—</p>
          </Card>
        </Link>

        <Link to="/admin/compliance" className="group">
          <Card padding="md" className="transition-shadow group-hover:shadow-md">
            <p className="text-sm text-gray">Doc Alerts</p>
            <p className="mt-2 font-display text-4xl font-bold text-error">{stats?.expiring_documents || 0}</p>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link 
          to="/admin/pipeline" 
          className="flex items-center gap-4 rounded-xl border border-border bg-white p-5 transition-all hover:border-maroon hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-maroon-subtle text-maroon">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-navy">Pipeline</p>
            <p className="text-sm text-gray">Review applicants</p>
          </div>
        </Link>

        <Link 
          to="/admin/employees" 
          className="flex items-center gap-4 rounded-xl border border-border bg-white p-5 transition-all hover:border-maroon hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success-bg text-success">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-navy">Employees</p>
            <p className="text-sm text-gray">Manage staff</p>
          </div>
        </Link>

        <Link 
          to="/admin/compliance" 
          className="flex items-center gap-4 rounded-xl border border-border bg-white p-5 transition-all hover:border-maroon hover:shadow-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning-bg text-warning">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-navy">Compliance</p>
            <p className="text-sm text-gray">Document tracking</p>
          </div>
        </Link>
      </div>

      {/* Recent Applicants */}
      {stats?.recent_applications && stats.recent_applications.length > 0 && (
        <Card
          header={
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-navy">Recent Applicants</h3>
              <Link to="/admin/pipeline" className="text-sm text-maroon hover:underline">
                View all →
              </Link>
            </div>
          }
        >
          <div className="divide-y divide-border">
            {stats.recent_applications.slice(0, 5).map((app) => (
              <Link 
                key={app.id} 
                to={`/admin/applicant/${app.id}`}
                className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-4 px-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon-subtle text-sm font-medium text-maroon">
                    {app.applicant_name?.split(' ').map(n => n[0]).join('') || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate">{app.applicant_name || 'Unknown'}</p>
                    <p className="text-xs text-gray">{app.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  app.status === 'submitted' ? 'bg-warning-bg text-warning' :
                  app.status === 'approved' ? 'bg-success-bg text-success' :
                  'bg-gray-100 text-gray'
                }`}>
                  {app.status.replace(/_/g, ' ')}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
