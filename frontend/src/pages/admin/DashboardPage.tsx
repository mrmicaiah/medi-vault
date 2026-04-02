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

interface UnassignedEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  hire_date: string;
  location_name: string;
}

interface UnassignedResponse {
  unassigned_employees: UnassignedEmployee[];
  total: number;
}

interface TrainingLead {
  application_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  interested_in_hha: string;
  interested_in_cpr: string;
  has_cpr: string;
  application_status: string;
}

interface TrainingLeadsResponse {
  hha_leads: TrainingLead[];
  cpr_leads: TrainingLead[];
  total_hha: number;
  total_cpr: number;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unassigned, setUnassigned] = useState<UnassignedEmployee[]>([]);
  const [unassignedTotal, setUnassignedTotal] = useState(0);
  const [trainingLeads, setTrainingLeads] = useState<TrainingLeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load all data in parallel
        const [statsRes, unassignedRes, leadsRes] = await Promise.all([
          api.get<DashboardStats>('/admin/dashboard'),
          api.get<UnassignedResponse>('/admin/unassigned-employees'),
          api.get<TrainingLeadsResponse>('/admin/training-leads'),
        ]);
        
        setStats(statsRes);
        setUnassigned(unassignedRes.unassigned_employees || []);
        setUnassignedTotal(unassignedRes.total || 0);
        setTrainingLeads(leadsRes);
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

  // Combine training leads (deduplicated)
  const allTrainingLeads = trainingLeads ? [
    ...trainingLeads.hha_leads.map(l => ({ ...l, type: 'HHA' as const })),
    ...trainingLeads.cpr_leads
      .filter(c => !trainingLeads.hha_leads.some(h => h.application_id === c.application_id))
      .map(l => ({ ...l, type: 'CPR' as const })),
  ] : [];

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

      {/* Recent Applicants */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-navy">Recent Applicants</h3>
              {stats?.recent_applications && stats.recent_applications.length > 0 && (
                <span className="bg-maroon/10 text-maroon text-xs font-semibold px-2 py-0.5 rounded-full">
                  {stats.recent_applications.length}
                </span>
              )}
            </div>
            <Link to="/admin/applicants" className="text-sm text-maroon hover:underline">
              View all →
            </Link>
          </div>
        }
      >
        {!stats?.recent_applications || stats.recent_applications.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray">No recent applicants</p>
          </div>
        ) : (
          <div className="divide-y divide-border -mx-4">
            {stats.recent_applications.map((app) => (
              <Link 
                key={app.id} 
                to={`/admin/applicants?selected=${app.id}`}
                className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
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
                  app.status === 'hired' ? 'bg-info-bg text-info' :
                  'bg-gray-100 text-gray'
                }`}>
                  {app.status.replace(/_/g, ' ')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Employees Needing Clients */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-navy">Employees Needing Clients</h3>
              {unassignedTotal > 0 && (
                <span className="bg-info/10 text-info text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unassignedTotal}
                </span>
              )}
            </div>
            <Link to="/admin/employees?filter=unassigned" className="text-sm text-maroon hover:underline">
              View all →
            </Link>
          </div>
        }
      >
        {unassigned.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-success/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray">All employees are assigned to clients</p>
          </div>
        ) : (
          <div className="divide-y divide-border -mx-4">
            {unassigned.slice(0, 5).map((emp) => (
              <Link 
                key={emp.id} 
                to={`/admin/employees?selected=${emp.id}`}
                className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-info/10 text-sm font-medium text-info">
                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-gray">{emp.position || 'No position'}</p>
                  </div>
                </div>
                <span className="text-xs text-info font-medium bg-info/10 px-2 py-1 rounded-full">
                  Assign →
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Training Leads */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-navy">Training Leads</h3>
              {allTrainingLeads.length > 0 && (
                <span className="bg-warning/10 text-warning text-xs font-semibold px-2 py-0.5 rounded-full">
                  {allTrainingLeads.length}
                </span>
              )}
            </div>
            <Link to="/admin/training-leads" className="text-sm text-maroon hover:underline">
              View all →
            </Link>
          </div>
        }
      >
        {allTrainingLeads.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <p className="mt-2 text-sm text-gray">No training leads at the moment</p>
          </div>
        ) : (
          <div className="divide-y divide-border -mx-4">
            {allTrainingLeads.slice(0, 5).map((lead) => {
              // Determine what trainings they're interested in
              const interests: string[] = [];
              if (lead.interested_in_hha === 'yes' || lead.interested_in_hha === 'maybe') {
                interests.push('HHA');
              }
              if (lead.interested_in_cpr === 'yes' || lead.interested_in_cpr === 'maybe' || lead.has_cpr === 'no') {
                interests.push('CPR');
              }
              
              return (
                <Link 
                  key={lead.application_id} 
                  to={`/admin/applicants?selected=${lead.application_id}`}
                  className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/10 text-sm font-medium text-warning">
                      {lead.first_name?.[0]}{lead.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate">{lead.first_name} {lead.last_name}</p>
                      <p className="text-xs text-gray">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {interests.map((interest) => (
                      <span 
                        key={interest}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          interest === 'HHA' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
