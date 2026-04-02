import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

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

interface CertificationLead {
  application_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  interested_in_hha: string | null;
  interested_in_cpr: string | null;
  application_status: string;
}

interface LeadsResponse {
  hha_leads: CertificationLead[];
  cpr_leads: CertificationLead[];
  total_hha: number;
  total_cpr: number;
}

interface MissingDocReport {
  employee_id: string;
  user_id: string;
  employee_name: string;
  email: string;
  missing_documents: string[];
  missing_count: number;
}

interface Applicant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<LeadsResponse | null>(null);
  const [nonCompliant, setNonCompliant] = useState<MissingDocReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Applicant[]>([]);
  const [allApplicants, setAllApplicants] = useState<Applicant[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter applicants when search query changes
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const filtered = allApplicants.filter(app =>
        app.first_name?.toLowerCase().includes(query) ||
        app.last_name?.toLowerCase().includes(query) ||
        app.email?.toLowerCase().includes(query) ||
        `${app.first_name} ${app.last_name}`.toLowerCase().includes(query)
      );
      setSearchResults(filtered.slice(0, 8));
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery, allApplicants]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [dashboardRes, leadsRes, pipelineRes] = await Promise.all([
        api.get<DashboardStats>('/admin/dashboard').catch(() => null),
        api.get<LeadsResponse>('/admin/training-leads').catch(() => null),
        api.get<{ applications: Applicant[] }>('/admin/pipeline').catch(() => null),
      ]);

      // Fetch non-compliant employees
      const { data: { session } } = await supabase.auth.getSession();
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const missingRes = await fetch(`${API_BASE}/api/compliance/missing`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      }).catch(() => null);

      if (dashboardRes) setStats(dashboardRes);
      if (leadsRes) setLeads(leadsRes);
      if (pipelineRes) setAllApplicants(pipelineRes.applications || []);
      if (missingRes?.ok) {
        const missingData = await missingRes.json();
        setNonCompliant(missingData || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
    switch (status) {
      case 'approved':
      case 'hired':
        return 'success';
      case 'submitted':
      case 'under_review':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const handleApplicantClick = (id: string) => {
    setShowResults(false);
    setSearchQuery('');
    navigate(`/admin/applicant/${id}`);
  };

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

  // Combine HHA and CPR leads, remove duplicates, limit to 5
  const combinedLeads = [...(leads?.hha_leads || []), ...(leads?.cpr_leads || [])]
    .filter((lead, index, self) => 
      index === self.findIndex(l => l.application_id === lead.application_id)
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Dashboard</h1>
          <p className="mt-1 text-sm text-gray">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Input
            placeholder="Search applicants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            className="pr-10"
          />
          <svg 
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {searchResults.map((applicant) => (
                <button
                  key={applicant.id}
                  onClick={() => handleApplicantClick(applicant.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-border last:border-0 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate">
                      {applicant.first_name} {applicant.last_name}
                    </p>
                    <p className="text-xs text-gray">{applicant.email}</p>
                  </div>
                  <Badge variant={getStatusVariant(applicant.status)} className="text-xs">
                    {applicant.status.replace('_', ' ')}
                  </Badge>
                </button>
              ))}
            </div>
          )}
          
          {showResults && searchQuery.trim() && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-gray">
              No applicants found
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" dismissible>
          {error}
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        
        {/* Recent Applicants */}
        <Card
          padding="none"
          header={
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-maroon-subtle text-maroon">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-navy">Recent Applicants</h3>
              </div>
              <Link to="/admin/pipeline" className="text-xs text-maroon hover:underline">
                View all →
              </Link>
            </div>
          }
        >
          {stats?.recent_applications && stats.recent_applications.length > 0 ? (
            <div className="divide-y divide-border">
              {stats.recent_applications.slice(0, 10).map((app) => (
                <Link 
                  key={app.id} 
                  to={`/admin/applicant/${app.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon-subtle text-sm font-medium text-maroon">
                      {app.applicant_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate">{app.applicant_name || 'Unknown'}</p>
                      <p className="text-xs text-gray">{app.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusVariant(app.status)} className="text-xs">
                      {app.status.replace(/_/g, ' ')}
                    </Badge>
                    <p className="text-xs text-gray mt-1">{formatDate(app.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-gray">
              No recent applicants
            </div>
          )}
        </Card>

        {/* Training Leads */}
        <Card
          padding="none"
          header={
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-navy">Training Leads</h3>
                  <p className="text-xs text-gray">
                    {leads?.total_hha || 0} HHA • {leads?.total_cpr || 0} CPR
                  </p>
                </div>
              </div>
              <Link to="/admin/training-leads" className="text-xs text-maroon hover:underline">
                View all →
              </Link>
            </div>
          }
        >
          {combinedLeads.length > 0 ? (
            <div className="divide-y divide-border">
              {combinedLeads.map((lead) => (
                <Link 
                  key={lead.application_id}
                  to={`/admin/applicant/${lead.application_id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
                      {`${lead.first_name?.[0] || ''}${lead.last_name?.[0] || ''}`.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate">{lead.first_name} {lead.last_name}</p>
                      <p className="text-xs text-gray">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.interested_in_hha === 'yes' && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-maroon-subtle text-maroon">HHA</span>
                    )}
                    {lead.interested_in_cpr === 'yes' && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">CPR</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-gray">
              No training leads yet
            </div>
          )}
        </Card>

        {/* Non-Compliant Employees */}
        <Card
          padding="none"
          className="lg:col-span-2"
          header={
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-bg text-error">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-navy">Compliance Alerts</h3>
                  <p className="text-xs text-gray">
                    {nonCompliant.length} employee{nonCompliant.length !== 1 ? 's' : ''} with missing documents
                  </p>
                </div>
              </div>
              <Link to="/admin/compliance" className="text-xs text-maroon hover:underline">
                View all →
              </Link>
            </div>
          }
        >
          {nonCompliant.length > 0 ? (
            <div className="divide-y divide-border">
              {nonCompliant.slice(0, 5).map((employee) => (
                <Link 
                  key={employee.employee_id}
                  to={`/admin/employee/${employee.employee_id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-error-bg text-sm font-medium text-error">
                      {employee.employee_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate">{employee.employee_name}</p>
                      <p className="text-xs text-gray">{employee.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="error" className="text-xs">
                      {employee.missing_count} missing
                    </Badge>
                    <p className="text-xs text-gray mt-1 max-w-[200px] truncate">
                      {employee.missing_documents.slice(0, 2).join(', ')}
                      {employee.missing_documents.length > 2 && '...'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success mx-auto mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate">All employees compliant</p>
              <p className="text-xs text-gray mt-1">No missing documents detected</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
