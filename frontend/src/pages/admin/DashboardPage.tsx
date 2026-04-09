import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { ExclusionCheckModal } from '../../components/admin/ExclusionCheckModal';

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

interface ComplianceStatus {
  total_active: number;
  oig_due: number;
  sam_due: number;
  oig_clear: number;
  sam_clear: number;
  matches_found: number;
  month: string;
  employees_due: Array<{
    id: string;
    name: string;
    needs_oig: boolean;
    needs_sam: boolean;
  }>;
  total_due: number;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unassigned, setUnassigned] = useState<UnassignedEmployee[]>([]);
  const [unassignedTotal, setUnassignedTotal] = useState(0);
  const [trainingLeads, setTrainingLeads] = useState<TrainingLeadsResponse | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Exclusion check modal
  const [showExclusionModal, setShowExclusionModal] = useState(false);
  const [exclusionCheckType, setExclusionCheckType] = useState<'oig' | 'sam'>('oig');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      // Load all data in parallel
      const [statsRes, unassignedRes, leadsRes, complianceRes] = await Promise.all([
        api.get<DashboardStats>('/admin/dashboard'),
        api.get<UnassignedResponse>('/admin/unassigned-employees'),
        api.get<TrainingLeadsResponse>('/admin/training-leads'),
        api.get<ComplianceStatus>('/admin/exclusion-checks/status').catch(() => null),
      ]);
      
      setStats(statsRes);
      setUnassigned(unassignedRes.unassigned_employees || []);
      setUnassignedTotal(unassignedRes.total || 0);
      setTrainingLeads(leadsRes);
      setComplianceStatus(complianceRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenExclusionModal(type: 'oig' | 'sam') {
    setExclusionCheckType(type);
    setShowExclusionModal(true);
  }

  function handleExclusionSuccess() {
    // Refresh compliance status after logging checks
    api.get<ComplianceStatus>('/admin/exclusion-checks/status')
      .then(res => setComplianceStatus(res))
      .catch(() => {});
  }

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

  // Calculate compliance percentages
  const oigPercent = complianceStatus && complianceStatus.total_active > 0
    ? Math.round((complianceStatus.oig_clear / complianceStatus.total_active) * 100)
    : 0;
  const samPercent = complianceStatus && complianceStatus.total_active > 0
    ? Math.round((complianceStatus.sam_clear / complianceStatus.total_active) * 100)
    : 0;

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

      {/* Monthly Compliance Checks Card */}
      {complianceStatus && (complianceStatus.oig_due > 0 || complianceStatus.sam_due > 0 || complianceStatus.matches_found > 0) && (
        <Card
          header={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-navy">Monthly Exclusion Checks</h3>
                <span className="text-xs text-gray bg-gray-100 px-2 py-0.5 rounded">
                  {complianceStatus.month}
                </span>
              </div>
            </div>
          }
        >
          {complianceStatus.matches_found > 0 && (
            <div className="mb-4 -mx-4 -mt-4 px-4 py-3 bg-error/10 border-b border-error/20">
              <div className="flex items-center gap-2 text-error">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold">{complianceStatus.matches_found} Exclusion Match{complianceStatus.matches_found !== 1 ? 'es' : ''} Found</span>
              </div>
              <p className="text-xs text-error/80 mt-1">Immediate action required for excluded individuals</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {/* OIG Status */}
            <div 
              className={`rounded-lg p-4 border-2 transition-colors ${
                complianceStatus.oig_due > 0 
                  ? 'border-warning/30 bg-warning/5 cursor-pointer hover:border-warning/50' 
                  : 'border-success/30 bg-success/5'
              }`}
              onClick={() => complianceStatus.oig_due > 0 && handleOpenExclusionModal('oig')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-navy">OIG LEIE</span>
                {complianceStatus.oig_due > 0 ? (
                  <span className="text-xs font-bold text-warning bg-warning/20 px-2 py-0.5 rounded-full">
                    {complianceStatus.oig_due} due
                  </span>
                ) : (
                  <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-navy">{oigPercent}%</span>
                <span className="text-xs text-gray mb-1">complete</span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${oigPercent === 100 ? 'bg-success' : 'bg-warning'}`}
                  style={{ width: `${oigPercent}%` }}
                />
              </div>
              {complianceStatus.oig_due > 0 && (
                <p className="text-xs text-warning mt-2 font-medium">Click to run checks →</p>
              )}
            </div>

            {/* SAM Status */}
            <div 
              className={`rounded-lg p-4 border-2 transition-colors ${
                complianceStatus.sam_due > 0 
                  ? 'border-warning/30 bg-warning/5 cursor-pointer hover:border-warning/50' 
                  : 'border-success/30 bg-success/5'
              }`}
              onClick={() => complianceStatus.sam_due > 0 && handleOpenExclusionModal('sam')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-navy">SAM.gov</span>
                {complianceStatus.sam_due > 0 ? (
                  <span className="text-xs font-bold text-warning bg-warning/20 px-2 py-0.5 rounded-full">
                    {complianceStatus.sam_due} due
                  </span>
                ) : (
                  <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-navy">{samPercent}%</span>
                <span className="text-xs text-gray mb-1">complete</span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${samPercent === 100 ? 'bg-success' : 'bg-warning'}`}
                  style={{ width: `${samPercent}%` }}
                />
              </div>
              {complianceStatus.sam_due > 0 && (
                <p className="text-xs text-warning mt-2 font-medium">Click to run checks →</p>
              )}
            </div>
          </div>

          {/* Quick list of employees due */}
          {complianceStatus.employees_due.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-gray uppercase mb-2">Employees needing checks</p>
              <div className="flex flex-wrap gap-2">
                {complianceStatus.employees_due.slice(0, 8).map(emp => (
                  <Link
                    key={emp.id}
                    to={`/admin/employees?selected=${emp.id}`}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                  >
                    {emp.name}
                    <span className="ml-1 text-gray">
                      ({emp.needs_oig && emp.needs_sam ? 'both' : emp.needs_oig ? 'OIG' : 'SAM'})
                    </span>
                  </Link>
                ))}
                {complianceStatus.total_due > 8 && (
                  <span className="text-xs text-gray px-2 py-1">
                    +{complianceStatus.total_due - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
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

      {/* Exclusion Check Modal */}
      <ExclusionCheckModal
        isOpen={showExclusionModal}
        onClose={() => setShowExclusionModal(false)}
        onSuccess={handleExclusionSuccess}
        preselectedCheckType={exclusionCheckType}
      />
    </div>
  );
}
