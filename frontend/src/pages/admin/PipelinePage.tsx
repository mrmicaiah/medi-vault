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
  id_front_uploaded?: boolean;
  id_back_uploaded?: boolean;
  ssn_card_uploaded?: boolean;
  work_auth_uploaded?: boolean;
  credentials_uploaded?: boolean;
  cpr_uploaded?: boolean;
  tb_uploaded?: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  state?: string;
  zip?: string;
  date_of_birth?: string;
  emergency_name?: string;
  emergency_relationship?: string;
  emergency_phone?: string;
  ssn_last_four?: string;
}

const detailCache = new Map<string, ApplicantDetail>();

const YesNo = ({ value }: { value: boolean | string | undefined }) => {
  const isYes = value === true || value === 'yes';
  return (
    <span className={`font-semibold ${isYes ? 'text-success' : 'text-error'}`}>
      {isYes ? 'YES' : 'NO'}
    </span>
  );
};

const DocLight = ({ uploaded, label }: { uploaded: boolean; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-3 h-3 rounded-full ${uploaded ? 'bg-success' : 'bg-error'}`} />
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
  
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  
  const [ssnRevealed, setSsnRevealed] = useState(false);
  const [revealedSsn, setRevealedSsn] = useState<string | null>(null);
  const [loadingSsn, setLoadingSsn] = useState(false);
  const [editingSsn, setEditingSsn] = useState(false);
  const [newSsn, setNewSsn] = useState('');
  const [savingSsn, setSavingSsn] = useState(false);
  
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
    console.log('[Pipeline] selectApplicant called for:', applicant.id);
    setSelectedApplicant(applicant);
    setPanelOpen(true);
    setEditMode(false);
    setSsnRevealed(false);
    setRevealedSsn(null);
    setEditingSsn(false);
    
    const cached = detailCache.get(applicant.id);
    if (cached) {
      setApplicantDetail(cached);
      initEditForm(cached, applicant);
      return;
    }
    
    setLoadingDetail(true);
    setApplicantDetail(null);
    
    try {
      const res = await api.get<{ 
        application: unknown; 
        profile: Record<string, unknown>;
        steps: Array<{ step_number: number; data: Record<string, unknown> }>;
        ssn_last_four?: string;
      }>(`/admin/applicants/${applicant.id}`);
      
      console.log('[Pipeline] API response:', res);
      
      const stepsMap = new Map<number, Record<string, unknown>>();
      (res.steps || []).forEach(s => {
        stepsMap.set(s.step_number, s.data || {});
      });
      
      const step1 = stepsMap.get(1) || {};
      const step2 = stepsMap.get(2) || {};
      const step3 = stepsMap.get(3) || {};
      const step4 = stepsMap.get(4) || {};
      const step5 = stepsMap.get(5) || {};
      const step6 = stepsMap.get(6) || {};
      const step7 = stepsMap.get(7) || {};
      const step8 = stepsMap.get(8) || {};
      const step9 = stepsMap.get(9) || {};
      const step10 = stepsMap.get(10) || {};
      const step11 = stepsMap.get(11) || {};
      const step12 = stepsMap.get(12) || {};
      const step13 = stepsMap.get(13) || {};
      const step14 = stepsMap.get(14) || {};
      const step15 = stepsMap.get(15) || {};
      const step16 = stepsMap.get(16) || {};
      const step17 = stepsMap.get(17) || {};
      
      const profile = res.profile || {};
      
      // Get position - try multiple possible field names
      const position = (step4.position_applying as string) || (step4.position as string) || (step4.position_applied as string) || '';
      console.log('[Pipeline] Step 4 data:', step4);
      console.log('[Pipeline] Position found:', position);
      
      // Get certifications - handle both array and string
      let certifications: string[] = [];
      if (Array.isArray(step4.certifications)) {
        certifications = step4.certifications as string[];
      } else if (typeof step4.certifications === 'string') {
        certifications = [step4.certifications];
      }
      
      const detail: ApplicantDetail = {
        first_name: (step1.first_name as string) || (profile.first_name as string),
        last_name: (step1.last_name as string) || (profile.last_name as string),
        email: (step1.email as string) || (profile.email as string),
        phone: (step1.phone as string) || (profile.phone as string),
        city: step2.city as string,
        address_line1: step2.address_line1 as string,
        address_line2: step2.address_line2 as string,
        state: step2.state as string,
        zip: step2.zip as string,
        date_of_birth: step2.date_of_birth as string,
        certifications: certifications,
        position_applied: position,
        has_cpr_certification: step5.has_cpr_certification as string,
        has_tb_test: step6.has_tb_test as string,
        has_drivers_license: step7.has_drivers_license as string,
        will_travel_30_min: step8.will_travel_30_min as string,
        will_work_bed_bound: step9.will_work_bed_bound as string,
        available_days: step10.available_days as string[],
        hours_per_week: step10.hours_per_week as string,
        comfortable_with_smokers: step10.comfortable_with_smokers as string,
        work_auth_uploaded: !!(step11.file_url || step11.storage_path),
        id_front_uploaded: !!(step12.file_url || step12.storage_path),
        id_back_uploaded: !!(step13.file_url || step13.storage_path),
        ssn_card_uploaded: !!(step14.file_url || step14.storage_path),
        credentials_uploaded: !!(step15.file_url || step15.storage_path),
        cpr_uploaded: !!(step16.file_url || step16.storage_path),
        tb_uploaded: !!(step17.file_url || step17.storage_path),
        emergency_name: step3.name as string,
        emergency_relationship: step3.relationship as string,
        emergency_phone: step3.phone as string,
        ssn_last_four: res.ssn_last_four,
      };
      
      console.log('[Pipeline] Parsed detail:', detail);
      
      detailCache.set(applicant.id, detail);
      setApplicantDetail(detail);
      initEditForm(detail, applicant);
    } catch (err) {
      console.error('Error loading applicant detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const initEditForm = (detail: ApplicantDetail, applicant: Applicant) => {
    setEditForm({
      first_name: detail.first_name || applicant.first_name || '',
      last_name: detail.last_name || applicant.last_name || '',
      email: detail.email || applicant.email || '',
      phone: detail.phone || '',
      city: detail.city || '',
      address_line1: detail.address_line1 || '',
      address_line2: detail.address_line2 || '',
      state: detail.state || '',
      zip: detail.zip || '',
      date_of_birth: detail.date_of_birth || '',
      emergency_name: detail.emergency_name || '',
      emergency_relationship: detail.emergency_relationship || '',
      emergency_phone: detail.emergency_phone || '',
    });
  };

  const handleRevealSsn = async () => {
    if (!selectedApplicant) return;
    setLoadingSsn(true);
    try {
      const res = await api.get<{ ssn: string; ssn_raw: string }>(`/admin/applicants/${selectedApplicant.id}/ssn`);
      setRevealedSsn(res.ssn);
      setSsnRevealed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal SSN');
    } finally {
      setLoadingSsn(false);
    }
  };

  const handleEditSsn = () => {
    setEditingSsn(true);
    if (revealedSsn) {
      setNewSsn(revealedSsn.replace(/-/g, ''));
    } else {
      setNewSsn('');
    }
  };

  const handleSaveSsn = async () => {
    if (!selectedApplicant) return;
    const cleanSsn = newSsn.replace(/\D/g, '');
    if (cleanSsn.length !== 9) {
      setError('SSN must be exactly 9 digits');
      return;
    }
    setSavingSsn(true);
    try {
      const res = await api.put<{ success: boolean; ssn_last_four: string }>(
        `/admin/applicants/${selectedApplicant.id}/ssn`,
        { ssn: cleanSsn }
      );
      const formattedSsn = `${cleanSsn.slice(0, 3)}-${cleanSsn.slice(3, 5)}-${cleanSsn.slice(5)}`;
      setRevealedSsn(formattedSsn);
      setSsnRevealed(true);
      setEditingSsn(false);
      setApplicantDetail(prev => prev ? { ...prev, ssn_last_four: res.ssn_last_four } : null);
      detailCache.delete(selectedApplicant.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save SSN');
    } finally {
      setSavingSsn(false);
    }
  };

  const formatSsnInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
  };

  const handleSaveEdit = async () => {
    if (!selectedApplicant) return;
    setSaving(true);
    try {
      await api.put(`/admin/applicants/${selectedApplicant.id}`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        city: editForm.city,
        address_line1: editForm.address_line1,
        address_line2: editForm.address_line2,
        state: editForm.state,
        zip: editForm.zip,
        date_of_birth: editForm.date_of_birth,
        emergency_name: editForm.emergency_name,
        emergency_relationship: editForm.emergency_relationship,
        emergency_phone: editForm.emergency_phone,
      });
      setApplicantDetail(prev => prev ? { ...prev, ...editForm } : null);
      detailCache.delete(selectedApplicant.id);
      setApplicants(prev => prev.map(a => 
        a.id === selectedApplicant.id 
          ? { ...a, first_name: editForm.first_name, last_name: editForm.last_name, email: editForm.email }
          : a
      ));
      setSelectedApplicant(prev => prev ? { ...prev, first_name: editForm.first_name, last_name: editForm.last_name, email: editForm.email } : null);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditMode(false);
    setSsnRevealed(false);
    setRevealedSsn(null);
    setEditingSsn(false);
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
      const { error: uploadErr } = await supabase.storage.from('documents').upload(fileName, file);
      if (uploadErr) throw uploadErr;
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

  const goToView = (id: string) => navigate(`/admin/applicant/${id}`);
  const goToHire = (id: string) => navigate(`/admin/hire/${id}`);

  const getPositionLabel = (position?: string) => {
    if (!position) return '';
    const labels: Record<string, string> = { pca: 'PCA', hha: 'HHA', cna: 'CNA', lpn: 'LPN', rn: 'RN' };
    return labels[position.toLowerCase()] || position.toUpperCase();
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
    const map: Record<string, string> = { '10-20': '10–20 hrs', '20-30': '20–30 hrs', '30-40': '30–40 hrs', '40+': '40+ hrs' };
    return map[hours || ''] || hours || '—';
  };

  const formatSmokerPref = (pref?: string) => {
    const map: Record<string, string> = { yes: 'OK with', no: 'Not OK', no_preference: 'No pref' };
    return map[pref || ''] || pref || '—';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      in_progress: 'bg-info/10 text-info',
      submitted: 'bg-warning/10 text-warning',
      under_review: 'bg-maroon/10 text-maroon',
      approved: 'bg-success/10 text-success',
      rejected: 'bg-error/10 text-error',
    };
    const labels: Record<string, string> = {
      in_progress: 'In Progress',
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Applicant Pipeline</h1>
          <p className="text-sm text-gray mt-1">Review and manage applicants</p>
        </div>
      </div>

      {error && <Alert variant="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}

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

      {/* Side Panel */}
      {selectedApplicant && (
        <>
          <div 
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-250 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
            onClick={closePanel} 
          />
          <div className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="px-6 py-5 bg-navy flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-white">
                  {editMode ? 'Edit Applicant' : `${selectedApplicant.first_name} ${selectedApplicant.last_name}`}
                </h2>
                {!editMode && applicantDetail?.position_applied && (
                  <span className="text-sm font-bold text-white bg-white/20 px-2 py-0.5 rounded">
                    {getPositionLabel(applicantDetail.position_applied)}
                  </span>
                )}
                {/* Fallback: show certifications if no position */}
                {!editMode && !applicantDetail?.position_applied && applicantDetail?.certifications && applicantDetail.certifications.length > 0 && applicantDetail.certifications[0] !== 'none' && (
                  <span className="text-sm font-bold text-white bg-white/20 px-2 py-0.5 rounded">
                    {applicantDetail.certifications[0].toUpperCase()}
                  </span>
                )}
              </div>
              <button onClick={closePanel} className="text-white/60 hover:text-white text-2xl leading-none p-1">×</button>
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
              ) : editMode ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray uppercase tracking-wide">Personal Info</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray mb-1">First Name</label>
                        <input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray mb-1">Last Name</label>
                        <input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray mb-1">Email</label>
                      <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray mb-1">Phone</label>
                      <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray mb-1">Date of Birth</label>
                      <input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray uppercase tracking-wide">Social Security</h3>
                    {editingSsn ? (
                      <div className="space-y-2">
                        <input type="text" value={formatSsnInput(newSsn)} onChange={(e) => setNewSsn(e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="XXX-XX-XXXX" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none font-mono" />
                        <p className="text-xs text-gray">Enter 9 digits. Leading zeros are preserved.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingSsn(false)} className="flex-1 py-2 text-sm border border-border rounded-lg hover:bg-gray-50">Cancel</button>
                          <button onClick={handleSaveSsn} disabled={savingSsn || newSsn.replace(/\D/g, '').length !== 9} className="flex-1 py-2 text-sm bg-maroon text-white rounded-lg hover:bg-maroon/90 disabled:opacity-50">{savingSsn ? 'Saving...' : 'Save SSN'}</button>
                        </div>
                      </div>
                    ) : ssnRevealed ? (
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">{revealedSsn}</span>
                        <button onClick={handleEditSsn} className="text-xs text-maroon hover:underline">Edit</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate">{applicantDetail?.ssn_last_four ? `***-**-${applicantDetail.ssn_last_four}` : 'Not on file'}</span>
                        <div className="flex gap-2">
                          {applicantDetail?.ssn_last_four && <button onClick={handleRevealSsn} disabled={loadingSsn} className="text-xs text-maroon hover:underline disabled:opacity-50">{loadingSsn ? 'Loading...' : 'Reveal'}</button>}
                          <button onClick={handleEditSsn} className="text-xs text-maroon hover:underline">{applicantDetail?.ssn_last_four ? 'Edit' : 'Add'}</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray uppercase tracking-wide">Address</h3>
                    <div>
                      <label className="block text-xs text-gray mb-1">Street Address</label>
                      <input type="text" value={editForm.address_line1} onChange={(e) => setEditForm({ ...editForm, address_line1: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray mb-1">Apt/Suite</label>
                      <input type="text" value={editForm.address_line2} onChange={(e) => setEditForm({ ...editForm, address_line2: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray mb-1">City</label>
                        <input type="text" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray mb-1">State</label>
                        <input type="text" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray mb-1">ZIP</label>
                        <input type="text" value={editForm.zip} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-gray uppercase tracking-wide">Emergency Contact</h3>
                    <div>
                      <label className="block text-xs text-gray mb-1">Name</label>
                      <input type="text" value={editForm.emergency_name} onChange={(e) => setEditForm({ ...editForm, emergency_name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray mb-1">Relationship</label>
                        <input type="text" value={editForm.emergency_relationship} onChange={(e) => setEditForm({ ...editForm, emergency_relationship: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray mb-1">Phone</label>
                        <input type="tel" value={editForm.emergency_phone} onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => setEditMode(false)} className="py-3 bg-white border border-border text-navy text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} disabled={saving} className="py-3 bg-maroon text-white text-sm font-semibold rounded-lg hover:bg-maroon/90 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Info Table */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {[
                      { label: 'City', value: applicantDetail?.city || '—' },
                      { label: 'Certifications', value: formatCertifications(applicantDetail?.certifications) },
                      { label: 'CPR / TB', value: (<><YesNo value={applicantDetail?.has_cpr_certification} /><span className="mx-2 text-gray-300">|</span><YesNo value={applicantDetail?.has_tb_test} /></>) },
                      { label: 'Drivers Lic.', value: <YesNo value={applicantDetail?.has_drivers_license} /> },
                      { label: 'Travel 30min', value: <YesNo value={applicantDetail?.will_travel_30_min} /> },
                      { label: 'Bed Bound', value: <YesNo value={applicantDetail?.will_work_bed_bound} /> },
                      { label: 'Availability', value: formatAvailability(applicantDetail?.available_days) },
                      { label: 'Hours', value: formatHours(applicantDetail?.hours_per_week) },
                      { label: 'Smokers?', value: formatSmokerPref(applicantDetail?.comfortable_with_smokers) },
                    ].map((row, i, arr) => (
                      <div key={i} className={`grid grid-cols-[110px_1fr] px-4 py-3 items-center ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <span className="text-xs font-semibold text-navy">{row.label}</span>
                        <span className="text-sm text-slate">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <button onClick={() => goToView(selectedApplicant.id)} className="py-3 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 transition-colors">Full Profile</button>
                    <button onClick={() => setEditMode(true)} className="py-3 bg-white border border-border text-navy text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">Edit</button>
                    <button onClick={() => goToHire(selectedApplicant.id)} className="py-3 bg-success text-navy text-sm font-semibold rounded-lg hover:bg-success/90 transition-colors">Onboard</button>
                  </div>

                  {/* Document Lights */}
                  <div className="bg-white rounded-lg shadow-sm p-4 mt-5">
                    <span className="text-[11px] font-semibold text-gray uppercase tracking-wide block mb-3">Documents</span>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      <DocLight uploaded={applicantDetail?.id_front_uploaded || false} label="ID Front" />
                      <DocLight uploaded={applicantDetail?.id_back_uploaded || false} label="ID Back" />
                      <DocLight uploaded={applicantDetail?.ssn_card_uploaded || false} label="SSN Card" />
                      <DocLight uploaded={applicantDetail?.work_auth_uploaded || false} label="Work Auth" />
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2">
                      <DocLight uploaded={applicantDetail?.credentials_uploaded || false} label="Credentials" />
                      <DocLight uploaded={applicantDetail?.cpr_uploaded || false} label="CPR" />
                      <DocLight uploaded={applicantDetail?.tb_uploaded || false} label="TB" />
                    </div>
                  </div>

                  <button onClick={handleUploadClick} className="w-full mt-5 py-3 bg-white border border-border text-navy text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">Upload Document</button>
                </>
              )}
            </div>

            {/* Footer - Always visible */}
            <div className="px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <p className="text-[10px] text-gray-400 text-center">Powered by MediSVault</p>
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
            <p className="text-sm text-gray mb-4">Upload a document for {selectedApplicant.first_name} {selectedApplicant.last_name}</p>
            {uploadError && <Alert variant="error" className="mb-4">{uploadError}</Alert>}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate mb-1">Document Type</label>
              <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20">
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
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} className="hidden" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button className="flex-1" disabled={!uploadType || uploading} loading={uploading} onClick={() => fileInputRef.current?.click()}>Select File</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
