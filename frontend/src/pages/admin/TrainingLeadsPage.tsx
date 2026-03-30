import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface CertificationLead {
  application_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location_name: string | null;
  interested_in_hha: string | null;
  interested_in_cpr: string | null;
  has_cpr: string | null;
  certifications: string[];
  application_status: string;
  submitted_at: string | null;
  updated_at: string;
}

interface LeadsResponse {
  hha_leads: CertificationLead[];
  cpr_leads: CertificationLead[];
  total_hha: number;
  total_cpr: number;
}

export function TrainingLeadsPage() {
  const [leads, setLeads] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hha' | 'cpr'>('hha');

  useEffect(() => {
    const loadLeads = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<LeadsResponse>('/admin/training-leads');
        setLeads(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    };

    loadLeads();
  }, []);

  const getInterestBadge = (interest: string | null) => {
    switch (interest) {
      case 'yes':
        return <Badge variant="success">Interested</Badge>;
      case 'maybe':
        return <Badge variant="warning">Maybe</Badge>;
      case 'no':
        return <Badge variant="neutral">Not Interested</Badge>;
      default:
        return <Badge variant="neutral">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="warning">Submitted</Badge>;
      case 'under_review':
        return <Badge variant="info">Under Review</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'hired':
        return <Badge variant="success">Hired</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading training leads...</p>
        </div>
      </div>
    );
  }

  const currentLeads = activeTab === 'hha' ? leads?.hha_leads : leads?.cpr_leads;
  const totalCount = activeTab === 'hha' ? leads?.total_hha : leads?.total_cpr;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Training Program Leads</h1>
        <p className="mt-1 text-sm text-gray">
          Applicants who expressed interest in certification training through the agency.
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray">HHA Certification Leads</p>
              <p className="mt-1 font-display text-3xl font-bold text-navy">{leads?.total_hha || 0}</p>
              <p className="mt-1 text-xs text-gray">
                {leads?.hha_leads.filter(l => l.interested_in_hha === 'yes').length || 0} interested
              </p>
            </div>
            <div className="rounded-lg p-2 bg-maroon-subtle text-maroon">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray">CPR Certification Leads</p>
              <p className="mt-1 font-display text-3xl font-bold text-navy">{leads?.total_cpr || 0}</p>
              <p className="mt-1 text-xs text-gray">
                {leads?.cpr_leads.filter(l => l.interested_in_cpr === 'yes').length || 0} interested
              </p>
            </div>
            <div className="rounded-lg p-2 bg-error-bg text-error">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('hha')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'hha'
              ? 'border-maroon text-maroon'
              : 'border-transparent text-gray hover:text-slate'
          }`}
        >
          HHA Certification ({leads?.total_hha || 0})
        </button>
        <button
          onClick={() => setActiveTab('cpr')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'cpr'
              ? 'border-maroon text-maroon'
              : 'border-transparent text-gray hover:text-slate'
          }`}
        >
          CPR Certification ({leads?.total_cpr || 0})
        </button>
      </div>

      {/* Leads Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Applicant</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Interest Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">App Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Current Certs</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Contact</th>
              </tr>
            </thead>
            <tbody>
              {currentLeads && currentLeads.length > 0 ? (
                currentLeads.map((lead) => (
                  <tr key={lead.application_id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-xs text-gray">{lead.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray">
                      {lead.location_name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {activeTab === 'hha' 
                        ? getInterestBadge(lead.interested_in_hha)
                        : getInterestBadge(lead.interested_in_cpr)
                      }
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(lead.application_status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray">
                      {lead.certifications && lead.certifications.length > 0 
                        ? lead.certifications.filter(c => c !== 'none').join(', ').toUpperCase() || 'None'
                        : 'None'
                      }
                    </td>
                    <td className="px-4 py-3">
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="text-sm text-maroon hover:underline">
                          {lead.phone}
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray">
                    No {activeTab === 'hha' ? 'HHA' : 'CPR'} certification leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
