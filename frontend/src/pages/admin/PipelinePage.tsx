import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    loadApplicants();
  }, []);

  const loadApplicants = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<PipelineResponse>('/admin/pipeline');
      setApplicants(res.applications || []);
    } catch (err) {
      console.error('[Applicants] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  const selectApplicant = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setPanelOpen(true);
    setLoadingDetail(true);
    
    try {
      const res = await api.get<{ steps: Array<{ step_number: number; data: Record<string, unknown> }> }>(
        `/admin/applicant/${applicant.id}`
      );
      
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
        link_sent: false,
        onboarding_complete: false,
      });
    } catch (err) {
      console.error('[Applicants] Detail error:', err);
      setApplicantDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => {
      setSelectedApplicant(null);
      setApplicantDetail(null);
    }, 300);
  };

  const getPositionLabel = (position?: string) => {
    const labels: Record<string, string> = { pca: 'PCA', hha: 'HHA', cna: 'CNA', lpn: 'LPN', rn: 'RN' };
    return labels[position || ''] || position?.toUpperCase() || '—';
  };

  const formatCertifications = (certs?: string[]) => {
    if (!certs || certs.length === 0 || (certs.length === 1 && certs[0] === 'none')) return 'None';
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
    const labels: Record<string, string> = { part_time: 'Part Time', full_time: 'Full Time', fill_in: 'Fill In', live_in: 'Live-In' };
    return labels[hours || ''] || '—';
  };

  const formatSmokerPref = (pref?: string) => {
    if (pref === 'yes') return 'OK with smokers';
    if (pref === 'no') return 'No smokers';
    if (pref === 'prefer_no_smoking') return 'Prefer non-smoking';
    return 'No preference';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      in_progress: 'bg-blue-100 text-blue-700',
      submitted: 'bg-yellow-100 text-yellow-700',
      under_review: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      hired: 'bg-emerald-100 text-emerald-700',
    };
    const labels: Record<string, string> = {
      in_progress: 'In Progress',
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      hired: 'Hired',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    );
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Applicants</h1>
        <p className="text-sm text-gray mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm text-gray">Total</p>
          <p className="text-3xl font-bold text-navy mt-1">{applicants.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm text-gray">Submitted</p>
          <p className="text-3xl font-bold text-warning mt-1">
            {applicants.filter(a => a.status === 'submitted').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm text-gray">In Progress</p>
          <p className="text-3xl font-bold text-info mt-1">
            {applicants.filter(a => a.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm text-gray">Approved</p>
          <p className="text-3xl font-bold text-success mt-1">
            {applicants.filter(a => a.status === 'approved').length}
          </p>
        </div>
      </div>

      {/* Applicants Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left text-xs font-medium text-gray uppercase tracking-wider px-6 py-3">Applicant</th>
              <th className="text-left text-xs font-medium text-gray uppercase tracking-wider px-6 py-3">Location</th>
              <th className="text-left text-xs font-medium text-gray uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray uppercase tracking-wider px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {applicants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray">
                  No applicants yet
                </td>
              </tr>
            ) : (
              applicants.map((applicant) => (
                <tr 
                  key={applicant.id}
                  onClick={() => selectApplicant(applicant)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy text-sm font-medium text-white">
                        {applicant.first_name?.[0] || ''}{applicant.last_name?.[0] || ''}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-navy">
                          {applicant.first_name} {applicant.last_name}
                        </p>
                        <p className="text-xs text-gray">{applicant.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate">
                    {applicant.location_name || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(applicant.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray">
                    {new Date(applicant.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sliding Panel */}
      {selectedApplicant && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closePanel}
          />
          
          {/* Panel */}
          <div className={`fixed top-0 right-0 h-full w-[450px] bg-white shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-navy">
                  {selectedApplicant.first_name} {selectedApplicant.last_name}
                </h2>
                <p className="text-sm text-maroon font-medium">{getPositionLabel(applicantDetail?.position_applied)}</p>
              </div>
              <button onClick={closePanel} className="text-gray hover:text-slate p-1">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-6">
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
                  <div className="border border-border rounded-lg divide-y divide-border mb-6">
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-3">
                        <p className="text-xs text-gray">City</p>
                        <p className="text-sm font-medium text-navy">{applicantDetail?.city || '—'}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray">Certifications</p>
                        <p className="text-sm font-medium text-navy">{formatCertifications(applicantDetail?.certifications)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-3">
                        <p className="text-xs text-gray">CPR / TB</p>
                        <p className="text-sm">
                          {formatYesNo(applicantDetail?.has_cpr_certification)}
                          <span className="mx-1 text-gray">|</span>
                          {formatYesNo(applicantDetail?.has_tb_test)}
                        </p>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray">Drivers Lic.</p>
                        <p className="text-sm">{formatYesNo(applicantDetail?.has_drivers_license)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-3">
                        <p className="text-xs text-gray">Travel 30min</p>
                        <p className="text-sm">{formatYesNo(applicantDetail?.will_travel_30_min)}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray">Bed Bound</p>
                        <p className="text-sm">{formatYesNo(applicantDetail?.will_work_bed_bound)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="p-3">
                        <p className="text-xs text-gray">Availability</p>
                        <p className="text-sm font-medium text-navy">{formatAvailability(applicantDetail?.available_days)}</p>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-gray">Hours</p>
                        <p className="text-sm font-medium text-navy">{formatHours(applicantDetail?.hours_per_week)}</p>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray">Smokers?</p>
                      <p className="text-sm font-medium text-navy">{formatSmokerPref(applicantDetail?.comfortable_with_smokers)}</p>
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
                  <div className="border border-border rounded-lg p-4 mb-6">
                    <p className="text-xs font-medium text-gray uppercase mb-3">Onboarding Status</p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: 'credentials_uploaded', label: 'Cred.' },
                        { key: 'cpr_uploaded', label: 'CPR' },
                        { key: 'tb_uploaded', label: 'TB' },
                        { key: 'link_sent', label: 'Link Sent' },
                        { key: 'onboarding_complete', label: 'Complete' },
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={applicantDetail?.[item.key as keyof ApplicantDetail] as boolean || false}
                            readOnly
                            className="h-4 w-4 rounded border-gray-300 text-success"
                          />
                          <span className="text-sm">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button variant="secondary" className="w-full">UPLOAD DOCUMENT</Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
