import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';

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
}

// Simple in-memory cache
const detailCache = new Map<string, ApplicantDetail>();

const YesNo = ({ value }: { value: boolean | string | undefined }) => {
  const isYes = value === true || value === 'yes';
  return (
    <span className={`font-semibold ${isYes ? 'text-success' : 'text-error'}`}>
      {isYes ? 'YES' : 'NO'}
    </span>
  );
};

const CheckCircle = ({ checked, label }: { checked: boolean; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] ${
      checked ? 'border-success bg-success text-white' : 'border-gray-300 bg-transparent'
    }`}>
      {checked && '✓'}
    </div>
    <span className="text-xs text-gray">{label}</span>
  </div>
);

export function PipelinePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [applicantDetail, setApplicantDetail] = useState<ApplicantDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  
  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadApplicants();
  }, []);

  const loadApplicants = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ applications: Applicant[] }>('/admin/pipeline');
      setApplicants(res.applications || []);
    } catch (err) {
      console.error('Error loading applicants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  const selectApplicant = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setPanelOpen(true);
    
    // Check cache first
    const cached = detailCache.get(applicant.id);
    if (cached) {
      setApplicantDetail(cached);
      return;
    }
    
    setLoadingDetail(true);
    setApplicantDetail(null);
    
    try {
      const res = await api.get<{ application: unknown; profile: unknown; steps: Array<{ step_number: number; data: Record<string, unknown> }> }>(
        `/admin/applicants/${applicant.id}`
      );
      
      const steps = res.steps || [];
      const step1 = steps.find(s => s.step_number === 1)?.data || {};
      const step2 = steps.find(s => s.step_number === 2)?.data || {};
      const step4 = steps.find(s => s.step_number === 4)?.data || {};
      const step8 = steps.find(s => s.step_number === 8)?.data || {};
      const step15 = steps.find(s => s.step_number === 15)?.data || {};
      const step16 = steps.find(s => s.step_number === 16)?.data || {};
      const step17 = steps.find(s => s.step_number === 17)?.data || {};
      
      const detail: ApplicantDetail = {
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
      };
      
      // Cache for fast re-access
      detailCache.set(applicant.id, detail);
      setApplicantDetail(detail);
    } catch (err) {
      console.error('Error loading applicant detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => {
      setSelectedApplicant(null);
      setApplicantDetail(null);
    }, 250);
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadError(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedApplicant || !uploadType) return;

    setUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedApplicant.user_id}/${uploadType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadErr) throw uploadErr;

      // Invalidate cache for this applicant
      detailCache.delete(selectedApplicant.id);
      await selectApplicant(selectedApplicant);
      setShowUploadModal(false);
      setUploadType('');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const goToView = (id: string) => {
    navigate(`/admin/applicant/${id}`);
  };

  const goToHire = (id: string) => {
    navigate(`/admin/hire/${id}`);
  };

  const getPositionLabel = (position?: string) => {
    const labels: Record<string, string> = { pca: 'PCA', hha: 'HHA', cna: 'CNA', lpn: 'LPN', rn: 'RN' };
    return labels[position || ''] || position?.toUpperCase() || '—';
  };

  const formatCertifications = (certs?: string[]) => {
    if (!certs || certs.length === 0 || (certs.length === 1 && certs[0] === 'none')) return 'None';
    return certs.filter(c => c !== 'none').map(c => c.toUpperCase()).join(', ');
  };

  const formatAvailability = (days?: string[]) => {
    if (!days || days.length === 0) return '—';
    if (days.length === 7) return 'Any Day';
    if (days.length >= 5) return 'Most Days';
    return days.slice(0, 3).map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ') + (days.length > 3 ? '...' : '');
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
    const config: Record<string, { bg: string; text: string; label: string }> = {
      in_progress: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'In Progress' },
      submitted: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Submitted' },
      under_review: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Under Review' },
      approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
      rejected: { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' },
      hired: { bg: 'bg-teal-50', text: 'text-teal-700', label: 'Hired' },
    };
    const s = config[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    return (
      <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${s.bg} ${s.text}`}>
        {s.label}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Applicants</h1>
          <p className="text-sm text-gray mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Button onClick={() => window.open('/apply/eveready-homecare', '_blank')}>
          <span className="mr-1">+</span> Add Applicant
        </Button>
      </div>

      {error && <Alert variant="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-border p-5">
          <p className="text-sm text-gray font-medium">Total</p>
          <p className="text-3xl font-bold text-navy mt-1">{applicants.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <p className="text-sm text-gray font-medium">Submitted</p>
          <p className="text-3xl font-bold text-warning mt-1">{applicants.filter(a => a.status === 'submitted').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <p className="text-sm text-gray font-medium">In Progress</p>
          <p className="text-3xl font-bold text-info mt-1">{applicants.filter(a => a.status === 'in_progress').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <p className="text-sm text-gray font-medium">Approved</p>
          <p className="text-3xl font-bold text-success mt-1">{applicants.filter(a => a.status === 'approved').length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Applicant</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Location</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Applied</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {applicants.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-gray">No applicants yet</td></tr>
            ) : (
              applicants.map((applicant) => (
                <tr 
                  key={applicant.id} 
                  onClick={() => selectApplicant(applicant)} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-navy text-sm font-semibold text-white">
                        {applicant.first_name?.[0] || ''}{applicant.last_name?.[0] || ''}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy">{applicant.first_name} {applicant.last_name}</p>
                        <p className="text-xs text-gray">{applicant.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate">{applicant.location_name || '—'}</td>
                  <td className="px-6 py-4">{getStatusBadge(applicant.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray">{new Date(applicant.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out Panel */}
      {selectedApplicant && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-250 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            onClick={closePanel} 
          />
          
          {/* Panel */}
          <div className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="px-6 py-5 bg-navy flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedApplicant.first_name} {selectedApplicant.last_name}
                </h2>
                <p className="text-sm text-maroon font-medium">{getPositionLabel(applicantDetail?.position_applied)}</p>
              </div>
              <button 
                onClick={closePanel} 
                className="text-white/60 hover:text-white text-2xl leading-none p-1"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
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
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {[
                      { label: 'City', value: applicantDetail?.city || '—' },
                      { label: 'Certifications', value: formatCertifications(applicantDetail?.certifications) },
                      { label: 'CPR / TB', value: (
                        <>
                          <YesNo value={applicantDetail?.has_cpr_certification} />
                          <span className="mx-2 text-gray-300">|</span>
                          <YesNo value={applicantDetail?.has_tb_test} />
                        </>
                      )},
                      { label: 'Drivers Lic.', value: <YesNo value={applicantDetail?.has_drivers_license} /> },
                      { label: 'Travel 30min', value: <YesNo value={applicantDetail?.will_travel_30_min} /> },
                      { label: 'Bed Bound', value: <YesNo value={applicantDetail?.will_work_bed_bound} /> },
                      { label: 'Availability', value: formatAvailability(applicantDetail?.available_days) },
                      { label: 'Hours', value: formatHours(applicantDetail?.hours_per_week) },
                      { label: 'Smokers?', value: formatSmokerPref(applicantDetail?.comfortable_with_smokers) },
                    ].map((row, i, arr) => (
                      <div 
                        key={i} 
                        className={`grid grid-cols-[110px_1fr] px-4 py-3 items-center ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <span className="text-xs font-semibold text-navy">{row.label}</span>
                        <span className="text-sm text-slate">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <button 
                      onClick={() => goToView(selectedApplicant.id)}
                      className="py-3 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 transition-colors"
                    >
                      View Full Profile
                    </button>
                    <button 
                      onClick={() => goToHire(selectedApplicant.id)}
                      className="py-3 bg-success text-navy text-sm font-semibold rounded-lg hover:bg-success/90 transition-colors"
                    >
                      Onboard
                    </button>
                  </div>

                  {/* Onboarding Status */}
                  <div className="bg-white rounded-lg shadow-sm p-4 mt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray uppercase tracking-wide">Documents</span>
                      <div className="flex gap-4">
                        <CheckCircle checked={applicantDetail?.credentials_uploaded || false} label="Cred." />
                        <CheckCircle checked={applicantDetail?.cpr_uploaded || false} label="CPR" />
                        <CheckCircle checked={applicantDetail?.tb_uploaded || false} label="TB" />
                      </div>
                    </div>
                  </div>

                  {/* Upload Button */}
                  <button 
                    onClick={handleUploadClick}
                    className="w-full mt-5 py-3 bg-white border border-border text-navy text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Upload Document
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedApplicant && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" onClick={() => setShowUploadModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl z-[70] p-6">
            <h3 className="text-lg font-semibold text-navy mb-4">Upload Document</h3>
            <p className="text-sm text-gray mb-4">
              Upload a document for {selectedApplicant.first_name} {selectedApplicant.last_name}
            </p>
            
            {uploadError && (
              <Alert variant="error" className="mb-4">{uploadError}</Alert>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate mb-1">Document Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
              >
                <option value="">Select type...</option>
                <option value="credentials">Professional Credentials</option>
                <option value="cpr">CPR Certification</option>
                <option value="tb">TB Test Results</option>
                <option value="id_front">Photo ID (Front)</option>
                <option value="id_back">Photo ID (Back)</option>
                <option value="ssn">Social Security Card</option>
                <option value="work_auth">Work Authorization</option>
                <option value="other">Other</option>
              </select>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                disabled={!uploadType || uploading}
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Select File
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
