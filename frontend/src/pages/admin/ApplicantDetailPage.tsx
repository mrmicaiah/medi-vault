import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

// Types
interface ApplicationData {
  application: {
    id: string;
    user_id: string;
    status: string;
    current_step: number;
    total_steps: number;
    created_at: string;
    submitted_at: string | null;
    location_id: string | null;
    location_name: string | null;
  };
  profile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
  };
  steps: Array<{
    step_number: number;
    step_name: string;
    step_type: string;
    status: string;
    data: Record<string, unknown> | null;
    completed_at: string | null;
  }>;
  documents: Array<{
    id: string;
    document_type: string;
    category: string;
    original_filename: string;
    signed_url: string | null;
    expiration_date: string | null;
    created_at: string;
  }>;
  agreements: Array<{
    id: string;
    agreement_type: string;
    signed_name: string;
    signed_at: string;
    pdf_url: string | null;
  }>;
  uploaded_files: Array<{
    step_number: number;
    document_name: string;
    file_name: string | null;
    signed_url: string | null;
    uploaded_at: string | null;
    skipped: boolean;
  }>;
}

// Step name mapping
const STEP_NAMES: Record<number, string> = {
  1: 'Position & Eligibility',
  2: 'Personal Information',
  3: 'Emergency Contact',
  4: 'Education & Certifications',
  5: 'Reference 1',
  6: 'Reference 2',
  7: 'Employment History',
  8: 'Work Preferences',
  9: 'Confidentiality Agreement',
  10: 'E-Signature Consent',
  11: 'Work Authorization',
  12: 'Photo ID (Front)',
  13: 'Photo ID (Back)',
  14: 'Social Security Card',
  15: 'Professional Credentials',
  16: 'CPR Certification',
  17: 'TB Test Results',
  18: 'Orientation Agreement',
  19: 'Criminal Background Attestation',
  20: 'VA Code Disclosure',
  21: 'Job Description',
  22: 'Final Submission',
};

const AGREEMENT_NAMES: Record<string, string> = {
  confidentiality: 'Confidentiality Agreement',
  esignature_consent: 'E-Signature Consent',
  orientation: 'Orientation Agreement',
  criminal_attestation: 'Criminal Background Attestation',
  va_code_disclosure: 'VA Code Disclosure',
  job_description: 'Job Description Acknowledgment',
  master_onboarding: 'Master Onboarding Agreement',
};

// Status badge styles
const statusStyles: Record<string, { bg: string; text: string }> = {
  in_progress: { bg: 'bg-blue-50', text: 'text-blue-700' },
  submitted: { bg: 'bg-amber-50', text: 'text-amber-700' },
  under_review: { bg: 'bg-purple-50', text: 'text-purple-700' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700' },
  hired: { bg: 'bg-teal-50', text: 'text-teal-700' },
};

export function ApplicantDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'application' | 'documents' | 'agreements'>('profile');
  
  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApplicationData>(`/admin/applicants/${id}`);
      setData(res);
      
      // Initialize edit form with current values
      const step2 = res.steps.find(s => s.step_number === 2)?.data || {};
      const step3 = res.steps.find(s => s.step_number === 3)?.data || {};
      setEditForm({
        first_name: res.profile.first_name || '',
        last_name: res.profile.last_name || '',
        email: res.profile.email || '',
        phone: res.profile.phone || (step2.phone as string) || '',
        address_line1: (step2.address_line1 as string) || '',
        address_line2: (step2.address_line2 as string) || '',
        city: (step2.city as string) || '',
        state: (step2.state as string) || '',
        zip: (step2.zip as string) || '',
        date_of_birth: (step2.date_of_birth as string) || '',
        emergency_name: (step3.name as string) || '',
        emergency_relationship: (step3.relationship as string) || '',
        emergency_phone: (step3.phone as string) || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applicant');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await api.patch(`/admin/applicants/${id}/profile`, editForm);
      await loadData();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await api.post(`/admin/applicant/${id}/status`, { status: newStatus });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const openDocument = (url: string | null) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Document not available');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading applicant...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray text-lg">Applicant not found</p>
        <Link to="/admin/applicants" className="text-maroon hover:underline mt-4 inline-block">
          ← Back to Applicants
        </Link>
      </div>
    );
  }

  const { application, profile, steps, agreements, uploaded_files } = data;
  const step2 = steps.find(s => s.step_number === 2)?.data || {};
  const step3 = steps.find(s => s.step_number === 3)?.data || {};
  const step1 = steps.find(s => s.step_number === 1)?.data || {};
  
  const statusStyle = statusStyles[application.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/applicants" className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-xl font-bold text-white">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-navy">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-sm text-gray">{profile.email}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {application.status.replace(/_/g, ' ')}
          </span>
          
          {application.status === 'submitted' && (
            <>
              <Button variant="danger" size="sm" onClick={() => handleStatusChange('rejected')}>
                Reject
              </Button>
              <Button size="sm" onClick={() => handleStatusChange('approved')}>
                Approve
              </Button>
            </>
          )}
          
          {application.status === 'approved' && (
            <Link to={`/admin/hire/${application.id}`}>
              <Button size="sm">Hire</Button>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          {(['profile', 'application', 'documents', 'agreements'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-maroon text-maroon'
                  : 'border-transparent text-gray hover:text-slate'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'documents' && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                  {uploaded_files.filter(f => !f.skipped && f.file_name).length}
                </span>
              )}
              {tab === 'agreements' && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                  {agreements.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-border">
        
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy">Personal Information</h2>
              {!editing ? (
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} loading={saving}>
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            {!editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray uppercase tracking-wide">Full Name</p>
                    <p className="mt-1 text-slate">{profile.first_name} {profile.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray uppercase tracking-wide">Email</p>
                    <p className="mt-1 text-slate">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray uppercase tracking-wide">Phone</p>
                    <p className="mt-1 text-slate">{profile.phone || step2.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray uppercase tracking-wide">Date of Birth</p>
                    <p className="mt-1 text-slate">{step2.date_of_birth ? formatDate(step2.date_of_birth as string) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray uppercase tracking-wide">Position Applied</p>
                    <p className="mt-1 text-slate">{(step1.position_applied as string)?.toUpperCase() || '—'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray uppercase tracking-wide">Address</p>
                    <p className="mt-1 text-slate">
                      {step2.address_line1 || '—'}
                      {step2.address_line2 && <><br />{step2.address_line2}</>}
                      {(step2.city || step2.state || step2.zip) && (
                        <><br />{[step2.city, step2.state, step2.zip].filter(Boolean).join(', ')}</>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray uppercase tracking-wide">Emergency Contact</p>
                    <p className="mt-1 text-slate">
                      {step3.name || '—'}
                      {step3.relationship && <span className="text-gray"> ({step3.relationship})</span>}
                      {step3.phone && <><br />{step3.phone}</>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray uppercase tracking-wide">Application Date</p>
                    <p className="mt-1 text-slate">{formatDate(application.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray uppercase tracking-wide">Location</p>
                    <p className="mt-1 text-slate">{application.location_name || '—'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.date_of_birth}
                    onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={editForm.address_line1}
                    onChange={(e) => setEditForm({ ...editForm, address_line1: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={editForm.address_line2}
                    onChange={(e) => setEditForm({ ...editForm, address_line2: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray uppercase mb-1">ZIP</label>
                  <input
                    type="text"
                    value={editForm.zip}
                    onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                  />
                </div>
                
                <div className="md:col-span-2 border-t border-border pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-navy mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray uppercase mb-1">Name</label>
                      <input
                        type="text"
                        value={editForm.emergency_name}
                        onChange={(e) => setEditForm({ ...editForm, emergency_name: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray uppercase mb-1">Relationship</label>
                      <input
                        type="text"
                        value={editForm.emergency_relationship}
                        onChange={(e) => setEditForm({ ...editForm, emergency_relationship: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray uppercase mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editForm.emergency_phone}
                        onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-2 focus:ring-maroon/20 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Application Tab */}
        {activeTab === 'application' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy">Application Progress</h2>
              <span className="text-sm text-gray">
                {steps.filter(s => s.status === 'completed').length} of {application.total_steps} steps completed
              </span>
            </div>
            
            <div className="space-y-2">
              {Array.from({ length: 22 }, (_, i) => i + 1).map((stepNum) => {
                const step = steps.find(s => s.step_number === stepNum);
                const isCompleted = step?.status === 'completed';
                const isSkipped = step?.data?.skip === true;
                
                return (
                  <div
                    key={stepNum}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isCompleted 
                        ? isSkipped ? 'border-warning/30 bg-warning/5' : 'border-success/30 bg-success/5'
                        : 'border-border bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                        isCompleted
                          ? isSkipped ? 'bg-warning text-white' : 'bg-success text-white'
                          : 'bg-gray-200 text-gray'
                      }`}>
                        {isCompleted ? '✓' : stepNum}
                      </div>
                      <span className={`text-sm ${isCompleted ? 'text-slate' : 'text-gray'}`}>
                        {STEP_NAMES[stepNum]}
                      </span>
                      {isSkipped && (
                        <span className="text-xs text-warning font-medium">(Skipped)</span>
                      )}
                    </div>
                    {step?.completed_at && (
                      <span className="text-xs text-gray">{formatDate(step.completed_at)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-navy mb-6">Uploaded Documents</h2>
            
            <div className="space-y-3">
              {uploaded_files.map((file) => (
                <div
                  key={file.step_number}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      file.skipped ? 'bg-gray-100' : file.file_name ? 'bg-maroon-subtle' : 'bg-gray-100'
                    }`}>
                      <svg className={`h-5 w-5 ${file.skipped ? 'text-gray' : file.file_name ? 'text-maroon' : 'text-gray'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate">{file.document_name}</p>
                      {file.file_name && (
                        <p className="text-xs text-gray">{file.file_name}</p>
                      )}
                      {file.skipped && (
                        <p className="text-xs text-warning">Skipped by applicant</p>
                      )}
                      {!file.file_name && !file.skipped && (
                        <p className="text-xs text-gray">Not uploaded</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.uploaded_at && (
                      <span className="text-xs text-gray mr-2">{formatDate(file.uploaded_at)}</span>
                    )}
                    {file.file_name && file.signed_url ? (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => openDocument(file.signed_url)}
                      >
                        View
                      </Button>
                    ) : file.file_name ? (
                      <Badge variant="warning">No URL</Badge>
                    ) : null}
                  </div>
                </div>
              ))}
              
              {uploaded_files.length === 0 && (
                <p className="text-center text-gray py-8">No documents uploaded yet</p>
              )}
            </div>
          </div>
        )}

        {/* Agreements Tab */}
        {activeTab === 'agreements' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-navy mb-6">Signed Agreements</h2>
            
            <div className="space-y-3">
              {agreements.map((agreement) => (
                <div
                  key={agreement.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate">
                        {AGREEMENT_NAMES[agreement.agreement_type] || agreement.agreement_type}
                      </p>
                      <p className="text-xs text-gray">
                        Signed by "{agreement.signed_name}" on {formatDate(agreement.signed_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {agreement.pdf_url ? (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => openDocument(agreement.pdf_url)}
                      >
                        View PDF
                      </Button>
                    ) : (
                      <Badge variant="neutral">PDF Pending</Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {agreements.length === 0 && (
                <p className="text-center text-gray py-8">No agreements signed yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
