import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';

interface Applicant {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string;
  location_name: string;
}

interface ApplicantDetail {
  // Basic info
  city?: string;
  certifications?: string[];
  has_cpr_certification?: string;
  has_tb_test?: string;
  has_drivers_license?: string;
  will_travel_30_min?: string;
  will_work_bed_bound?: string;
  available_days?: string[];
  hours_per_week?: string;
  comfortable_with_smokers?: string;
  position_applied?: string;
  // Onboarding status
  credentials_uploaded?: boolean;
  cpr_uploaded?: boolean;
  tb_uploaded?: boolean;
  link_sent?: boolean;
  onboarding_complete?: boolean;
}

interface PipelineResponse {
  applications: Applicant[];
}

export function PipelinePage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [applicantDetail, setApplicantDetail] = useState<ApplicantDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadApplicants();
  }, []);

  const loadApplicants = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<PipelineResponse>('/admin/pipeline');
      setApplicants(res.applications || []);
      
      // Auto-select first applicant if available
      if (res.applications && res.applications.length > 0) {
        selectApplicant(res.applications[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  const selectApplicant = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setLoadingDetail(true);
    
    try {
      // Fetch detailed applicant data
      const res = await api.get<{ steps: Array<{ step_number: number; data: Record<string, unknown> }> }>(
        `/admin/applicant/${applicant.id}`
      );
      
      // Extract data from steps
      const steps = res.steps || [];
      const step1 = steps.find(s => s.step_number === 1)?.data || {};
      const step2 = steps.find(s => s.step_number === 2)?.data || {};
      const step4 = steps.find(s => s.step_number === 4)?.data || {};
      const step8 = steps.find(s => s.step_number === 8)?.data || {};
      const step15 = steps.find(s => s.step_number === 15)?.data || {};
      const step16 = steps.find(s => s.step_number === 16)?.data || {};
      const step17 = steps.find(s => s.step_number === 17)?.data || {};
      
      setApplicantDetail({
        city: step2.city as string,
        certifications: step4.certifications as string[],
        has_cpr_certification: step4.has_cpr_certification as string,
        has_tb_test: step4.has_tb_test as string,
        has_drivers_license: step4.has_drivers_license as string,
        will_travel_30_min: step4.will_travel_30_min as string,
        will_work_bed_bound: step4.will_work_bed_bound as string,
        available_days: step8.available_days as string[],
        hours_per_week: step8.hours_per_week as string,
        comfortable_with_smokers: step8.comfortable_with_smokers as string,
        position_applied: step1.position_applied as string,
        credentials_uploaded: Boolean(step15.file_name),
        cpr_uploaded: Boolean(step16.file_name),
        tb_uploaded: Boolean(step17.file_name),
        link_sent: false, // TODO: track this
        onboarding_complete: false, // TODO: track this
      });
    } catch (err) {
      console.error('Failed to load applicant detail:', err);
      setApplicantDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getPositionLabel = (position?: string) => {
    const labels: Record<string, string> = {
      pca: 'PCA',
      hha: 'HHA',
      cna: 'CNA',
      lpn: 'LPN',
      rn: 'RN',
    };
    return labels[position || ''] || position?.toUpperCase() || '—';
  };

  const formatCertifications = (certs?: string[]) => {
    if (!certs || certs.length === 0 || (certs.length === 1 && certs[0] === 'none')) {
      return 'None';
    }
    return certs.filter(c => c !== 'none').map(c => c.toUpperCase()).join(', ');
  };

  const formatYesNo = (value?: string) => {
    if (value === 'yes') return <span className="text-success font-medium">YES</span>;
    if (value === 'no') return <span className="text-error font-medium">NO</span>;
    return <span className="text-gray">—</span>;
  };

  const formatAvailability = (days?: string[]) => {
    if (!days || days.length === 0) return '—';
    if (days.length === 7) return 'Any Day';
    if (days.length >= 5) return 'Most Days';
    return days.slice(0, 3).join(', ') + (days.length > 3 ? '...' : '');
  };

  const formatHours = (hours?: string) => {
    const labels: Record<string, string> = {
      part_time: 'Part Time',
      full_time: 'Full Time',
      fill_in: 'Fill In',
      live_in: 'Live-In',
    };
    return labels[hours || ''] || '—';
  };

  const formatSmokerPref = (pref?: string) => {
    if (pref === 'yes') return 'OK with smokers';
    if (pref === 'no') return 'No smokers';
    if (pref === 'prefer_no_smoking') return 'Prefer non-smoking';
    return 'No preference';
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading applicants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Left Sidebar - Applicant List */}
      <div className="w-80 flex-shrink-0 border-r border-border bg-white overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="font-display text-xl font-bold text-navy">Applicants</h1>
          <p className="text-xs text-gray mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        
        {error && (
          <div className="p-4">
            <Alert variant="error" dismissible>{error}</Alert>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          {applicants.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray">
              No applicants yet
            </div>
          ) : (
            <div className="divide-y divide-border">
              {applicants.map((applicant) => (
                <button
                  key={applicant.id}
                  onClick={() => selectApplicant(applicant)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    selectedApplicant?.id === applicant.id ? 'bg-maroon-subtle/30 border-l-4 border-maroon' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy text-sm font-medium text-white">
                      {applicant.first_name?.[0] || ''}{applicant.last_name?.[0] || ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">
                        {applicant.first_name} {applicant.last_name}
                      </p>
                      <p className="text-xs text-gray truncate">{applicant.location_name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Applicant Detail */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {selectedApplicant ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-navy">
                  {selectedApplicant.first_name} {selectedApplicant.last_name}
                  <span className="text-maroon ml-2">| {getPositionLabel(applicantDetail?.position_applied)}</span>
                </h2>
              </div>
              <button 
                onClick={() => setSelectedApplicant(null)}
                className="text-gray hover:text-slate"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-12">
                <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <>
                {/* Info Grid */}
                <div className="bg-white rounded-xl border border-border divide-y divide-border mb-6">
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-4">
                      <p className="text-sm text-gray">City</p>
                      <p className="text-sm font-medium text-navy mt-1">{applicantDetail?.city || '—'}</p>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray">Certifications</p>
                      <p className="text-sm font-medium text-navy mt-1">{formatCertifications(applicantDetail?.certifications)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-4">
                      <p className="text-sm text-gray">CPR / TB</p>
                      <p className="text-sm mt-1">
                        {formatYesNo(applicantDetail?.has_cpr_certification)}
                        <span className="mx-2 text-gray">|</span>
                        {formatYesNo(applicantDetail?.has_tb_test)}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray">Drivers Lic.</p>
                      <p className="text-sm mt-1">{formatYesNo(applicantDetail?.has_drivers_license)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-4">
                      <p className="text-sm text-gray">Travel 30min</p>
                      <p className="text-sm mt-1">{formatYesNo(applicantDetail?.will_travel_30_min)}</p>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray">Bed Bound</p>
                      <p className="text-sm mt-1">{formatYesNo(applicantDetail?.will_work_bed_bound)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-4">
                      <p className="text-sm text-gray">Availability</p>
                      <p className="text-sm font-medium text-navy mt-1">{formatAvailability(applicantDetail?.available_days)}</p>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray">Hours</p>
                      <p className="text-sm font-medium text-navy mt-1">{formatHours(applicantDetail?.hours_per_week)}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray">Smokers?</p>
                    <p className="text-sm font-medium text-navy mt-1">{formatSmokerPref(applicantDetail?.comfortable_with_smokers)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mb-6">
                  <Link to={`/admin/applicant/${selectedApplicant.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full">VIEW</Button>
                  </Link>
                  <Link to={`/admin/applicant/${selectedApplicant.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full">EDIT</Button>
                  </Link>
                  <Link to={`/admin/hire/${selectedApplicant.id}`} className="flex-1">
                    <Button className="w-full">ONBOARD</Button>
                  </Link>
                </div>

                {/* Onboarding Status */}
                <div className="bg-white rounded-xl border border-border p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray">ONBOARDING STATUS</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={applicantDetail?.credentials_uploaded || false}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 text-success"
                      />
                      <span className="text-sm">Cred.</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={applicantDetail?.cpr_uploaded || false}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 text-success"
                      />
                      <span className="text-sm">CPR</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={applicantDetail?.tb_uploaded || false}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 text-success"
                      />
                      <span className="text-sm">TB</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={applicantDetail?.link_sent || false}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 text-success"
                      />
                      <span className="text-sm">Link Sent</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={applicantDetail?.onboarding_complete || false}
                        readOnly
                        className="h-4 w-4 rounded border-gray-300 text-success"
                      />
                      <span className="text-sm">Complete</span>
                    </label>
                  </div>
                </div>

                {/* Upload Button */}
                <Button variant="secondary" className="w-full">
                  UPLOAD
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray">Select an applicant to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
