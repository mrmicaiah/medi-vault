import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface Applicant {
  application_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_step: number;
  completed_steps: number;
  submitted_at: string | null;
  updated_at: string;
  location_name?: string;
  status?: string;
}

interface ApplicantDetail {
  application: {
    id: string;
    user_id: string;
    status: string;
  };
  profile: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
  steps: Array<{
    step_number: number;
    step_name: string;
    step_type: string;
    is_completed: boolean;
    data: Record<string, unknown> | null;
    completed_at: string | null;
  }>;
  ssn_last_four?: string;
}

interface Props {
  applicant: Applicant;
  onClose: () => void;
  onRefresh: () => void;
}

// Helper to safely get string from step data
function getStepString(data: Record<string, unknown> | null, key: string): string {
  if (!data) return '';
  const val = data[key];
  return typeof val === 'string' ? val : '';
}

const YesNo = ({ value }: { value: boolean }) => (
  <span className={`font-semibold ${value ? 'text-emerald-600' : 'text-red-600'}`}>
    {value ? 'YES' : 'NO'}
  </span>
);

const CheckCircle = ({ checked, label }: { checked: boolean; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div
      className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
        checked
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-gray-300 bg-transparent'
      }`}
    >
      {checked && (
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <span className="text-xs text-gray">{label}</span>
  </div>
);

const CheckBox = ({ checked, label }: { checked: boolean; label: string }) => (
  <div className="flex items-center gap-2">
    <div
      className={`flex h-4 w-4 items-center justify-center rounded border-2 ${
        checked
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-gray-300 bg-transparent'
      }`}
    >
      {checked && (
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <span className="text-sm text-gray">{label}</span>
  </div>
);

export function ApplicantDetailPanel({ applicant, onClose, onRefresh }: Props) {
  const [detail, setDetail] = useState<ApplicantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  
  // SSN state
  const [ssnRevealed, setSsnRevealed] = useState(false);
  const [fullSsn, setFullSsn] = useState<string | null>(null);
  const [ssnLoading, setSsnLoading] = useState(false);
  const [editSsn, setEditSsn] = useState('');

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ApplicantDetail>(
          `/admin/applicants/${applicant.application_id}`
        );
        setDetail(res);
        initEditForm(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [applicant.application_id]);

  const initEditForm = (res: ApplicantDetail) => {
    const step2Data = res.steps.find(s => s.step_number === 2)?.data || {};
    const step3Data = res.steps.find(s => s.step_number === 3)?.data || {};
    
    // Try multiple field naming conventions for emergency contact
    const ecFirstName = getStepString(step3Data, 'ec_first_name') || getStepString(step3Data, 'first_name') || '';
    const ecLastName = getStepString(step3Data, 'ec_last_name') || getStepString(step3Data, 'last_name') || '';
    const ecName = getStepString(step3Data, 'name') || [ecFirstName, ecLastName].filter(Boolean).join(' ');
    
    setEditForm({
      first_name: res.profile.first_name || '',
      last_name: res.profile.last_name || '',
      email: res.profile.email || '',
      phone: res.profile.phone || getStepString(step2Data, 'phone') || '',
      date_of_birth: getStepString(step2Data, 'date_of_birth') || '',
      address_line1: getStepString(step2Data, 'address_line1') || '',
      address_line2: getStepString(step2Data, 'address_line2') || '',
      city: getStepString(step2Data, 'city') || '',
      state: getStepString(step2Data, 'state') || '',
      zip: getStepString(step2Data, 'zip') || getStepString(step2Data, 'zip_code') || '',
      emergency_name: ecName,
      emergency_first_name: ecFirstName,
      emergency_last_name: ecLastName,
      emergency_relationship: getStepString(step3Data, 'ec_relationship') || getStepString(step3Data, 'relationship') || '',
      emergency_phone: getStepString(step3Data, 'ec_phone') || getStepString(step3Data, 'phone') || '',
      emergency_email: getStepString(step3Data, 'ec_email') || getStepString(step3Data, 'email') || '',
    });
    setEditSsn('');
  };

  const handleRevealSsn = async () => {
    setSsnLoading(true);
    try {
      const response = await api.get<{ ssn: string }>(`/admin/applicants/${applicant.application_id}/ssn`);
      setFullSsn(response.ssn);
      setSsnRevealed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal SSN');
    } finally {
      setSsnLoading(false);
    }
  };

  const handleSave = async () => {
    if (!detail) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Save profile and step data
      await api.put(`/admin/applicants/${applicant.application_id}`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        date_of_birth: editForm.date_of_birth,
        address_line1: editForm.address_line1,
        address_line2: editForm.address_line2,
        city: editForm.city,
        state: editForm.state,
        zip: editForm.zip,
        emergency_first_name: editForm.emergency_first_name,
        emergency_last_name: editForm.emergency_last_name,
        emergency_relationship: editForm.emergency_relationship,
        emergency_phone: editForm.emergency_phone,
      });
      
      // Save SSN if provided
      if (editSsn && editSsn.replace(/\D/g, '').length === 9) {
        await api.put(`/admin/applicants/${applicant.application_id}/ssn`, {
          ssn: editSsn.replace(/\D/g, '')
        });
      }
      
      setMode('view');
      onRefresh();
      
      // Reload detail
      const res = await api.get<ApplicantDetail>(`/admin/applicants/${applicant.application_id}`);
      setDetail(res);
      initEditForm(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (detail) {
      initEditForm(detail);
    }
    setMode('view');
    setEditSsn('');
  };

  // Extract info from steps
  const getStepData = (stepNumber: number) => {
    return detail?.steps.find((s) => s.step_number === stepNumber)?.data || {};
  };

  const personalInfo = getStepData(2);
  const step3Data = getStepData(3);
  const preferencesData = getStepData(8);

  // Document status from steps 11-17
  const hasDocument = (stepNumber: number) => {
    const step = detail?.steps.find((s) => s.step_number === stepNumber);
    const data = step?.data || {};
    return Boolean((data.file_name || data.storage_path) && !data.skip);
  };

  // Onboarding status
  const onboarding = {
    cred: hasDocument(15),
    cpr: hasDocument(16),
    tb: hasDocument(17),
    linkSent: (detail?.application?.status === 'submitted' || detail?.application?.status === 'under_review' || detail?.application?.status === 'approved'),
    complete: detail?.application?.status === 'hired',
  };

  const city = (personalInfo.city as string) || applicant.location_name || '—';
  const certifications = hasDocument(15) ? 'Uploaded' : 'Not uploaded';
  const cpr = hasDocument(16);
  const tb = hasDocument(17);
  const driversLicense = hasDocument(12);
  const travel30 = (preferencesData.willing_to_travel as boolean) ?? true;
  const bedBound = (preferencesData.bed_bound_care as boolean) ?? false;
  const availability = (preferencesData.availability as string) || 'Not specified';
  const hours = (preferencesData.hours_preference as string) || 'Not specified';
  const smokerPref = (preferencesData.smoker_preference as string) || 'No preference';

  // Emergency contact display
  const emergencyName = getStepString(step3Data, 'ec_first_name') || getStepString(step3Data, 'name') 
    ? [getStepString(step3Data, 'ec_first_name'), getStepString(step3Data, 'ec_last_name')].filter(Boolean).join(' ') || getStepString(step3Data, 'name')
    : '—';
  const emergencyPhone = getStepString(step3Data, 'ec_phone') || getStepString(step3Data, 'phone') || '—';
  const emergencyRelationship = getStepString(step3Data, 'ec_relationship') || getStepString(step3Data, 'relationship') || '';

  const infoRows = [
    { label: 'City', value: city },
    { label: 'Certifications', value: certifications },
    {
      label: 'CPR / TB',
      value: (
        <>
          <YesNo value={cpr} />
          <span className="mx-1 text-gray-300">|</span>
          <YesNo value={tb} />
        </>
      ),
    },
    { label: "Driver's Lic.", value: <YesNo value={driversLicense} /> },
    { label: 'Travel 30min', value: <YesNo value={travel30} /> },
    { label: 'Bed Bound', value: <YesNo value={bedBound} /> },
    { label: 'Availability', value: availability },
    { label: 'Hours', value: hours },
    { label: 'Smokers?', value: smokerPref },
  ];

  // Input component for edit form
  const FormInput = ({ label, field, type = 'text', placeholder = '' }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray uppercase mb-1">{label}</label>
      <input
        type={type}
        value={editForm[field] || ''}
        onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
      />
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between bg-navy px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {applicant.first_name} {applicant.last_name}
              <span className="mx-2 text-white/40">|</span>
              <span className="text-maroon">CNA</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-white/60 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <svg
                className="h-6 w-6 animate-spin text-maroon"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 mb-4">
              {error}
              <button onClick={() => setError(null)} className="ml-2 text-red-900 hover:underline">Dismiss</button>
            </div>
          ) : mode === 'edit' ? (
            /* ==================== EDIT MODE ==================== */
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-navy mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="First Name" field="first_name" />
                  <FormInput label="Last Name" field="last_name" />
                  <FormInput label="Email" field="email" type="email" />
                  <FormInput label="Phone" field="phone" type="tel" />
                  <div className="col-span-2">
                    <FormInput label="Date of Birth" field="date_of_birth" type="date" />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-navy mb-4">Address</h3>
                <div className="space-y-3">
                  <FormInput label="Street Address" field="address_line1" />
                  <FormInput label="Apt/Suite/Unit" field="address_line2" placeholder="Optional" />
                  <div className="grid grid-cols-3 gap-3">
                    <FormInput label="City" field="city" />
                    <FormInput label="State" field="state" />
                    <FormInput label="ZIP" field="zip" />
                  </div>
                </div>
              </div>

              {/* SSN */}
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-navy mb-4">Social Security Number</h3>
                <div className="space-y-3">
                  {detail?.ssn_last_four && (
                    <div className="flex items-center gap-2 text-sm text-gray">
                      <span>Current: ***-**-{detail.ssn_last_four}</span>
                      {!ssnRevealed && (
                        <button
                          onClick={handleRevealSsn}
                          disabled={ssnLoading}
                          className="text-maroon hover:underline text-xs"
                        >
                          {ssnLoading ? 'Loading...' : 'Reveal'}
                        </button>
                      )}
                      {ssnRevealed && fullSsn && (
                        <span className="font-mono text-slate">{fullSsn}</span>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray uppercase mb-1">
                      {detail?.ssn_last_four ? 'Update SSN' : 'Enter SSN'}
                    </label>
                    <input
                      type="text"
                      value={editSsn}
                      onChange={(e) => {
                        // Format as XXX-XX-XXXX
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 9);
                        let formatted = raw;
                        if (raw.length > 5) {
                          formatted = `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`;
                        } else if (raw.length > 3) {
                          formatted = `${raw.slice(0, 3)}-${raw.slice(3)}`;
                        }
                        setEditSsn(formatted);
                      }}
                      placeholder="XXX-XX-XXXX"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                    />
                    <p className="text-xs text-gray mt-1">Leave blank to keep current SSN</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-navy mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="First Name" field="emergency_first_name" />
                  <FormInput label="Last Name" field="emergency_last_name" />
                  <FormInput label="Relationship" field="emergency_relationship" placeholder="e.g., Spouse, Parent" />
                  <FormInput label="Phone" field="emergency_phone" type="tel" />
                </div>
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 rounded-lg border border-gray-300 text-sm font-semibold text-gray hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-lg bg-maroon text-sm font-semibold text-white hover:bg-maroon/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            /* ==================== VIEW MODE ==================== */
            <>
              {/* Contact Info Card */}
              <div className="rounded-lg bg-white p-4 shadow-sm mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray mb-3">Contact Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray">Email</span>
                    <span className="text-slate">{detail?.profile?.email || applicant.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">Phone</span>
                    <span className="text-slate">{detail?.profile?.phone || getStepString(personalInfo, 'phone') || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">DOB</span>
                    <span className="text-slate">{getStepString(personalInfo, 'date_of_birth') ? formatDate(getStepString(personalInfo, 'date_of_birth')) : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">SSN</span>
                    <span className="text-slate font-mono">
                      {detail?.ssn_last_four ? `***-**-${detail.ssn_last_four}` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Address Card */}
              <div className="rounded-lg bg-white p-4 shadow-sm mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray mb-3">Address</h3>
                <p className="text-sm text-slate">
                  {getStepString(personalInfo, 'address_line1') || '—'}
                  {getStepString(personalInfo, 'address_line2') && <><br />{getStepString(personalInfo, 'address_line2')}</>}
                  {(getStepString(personalInfo, 'city') || getStepString(personalInfo, 'state')) && (
                    <><br />{[getStepString(personalInfo, 'city'), getStepString(personalInfo, 'state'), getStepString(personalInfo, 'zip')].filter(Boolean).join(', ')}</>
                  )}
                </p>
              </div>

              {/* Emergency Contact Card */}
              <div className="rounded-lg bg-white p-4 shadow-sm mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray mb-3">Emergency Contact</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray">Name</span>
                    <span className="text-slate">{emergencyName}{emergencyRelationship && ` (${emergencyRelationship})`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray">Phone</span>
                    <span className="text-slate">{emergencyPhone}</span>
                  </div>
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                {infoRows.map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[120px_1fr] items-center px-4 py-3 ${
                      i < infoRows.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <span className="text-sm font-semibold text-navy">
                      {row.label}
                    </span>
                    <span className="text-sm text-slate">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 grid grid-cols-3 overflow-hidden rounded-lg shadow-sm">
                <Link
                  to={`/admin/applicant/${applicant.application_id}`}
                  className="bg-navy px-4 py-3 text-center text-sm font-semibold text-white hover:bg-navy/90"
                >
                  VIEW
                </Link>
                <button 
                  onClick={() => setMode('edit')}
                  className="bg-slate px-4 py-3 text-sm font-semibold text-white hover:bg-slate/90"
                >
                  EDIT
                </button>
                <button className="bg-emerald-400 px-4 py-3 text-sm font-semibold text-navy hover:bg-emerald-500">
                  ONBOARD
                </button>
              </div>

              {/* Onboarding Status */}
              <div className="mt-5 rounded-lg bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray">
                    Onboarding Status
                  </span>
                  <div className="flex gap-3">
                    <CheckCircle checked={onboarding.cred} label="Cred." />
                    <CheckCircle checked={onboarding.cpr} label="CPR" />
                    <CheckCircle checked={onboarding.tb} label="TB" />
                  </div>
                </div>
                <div className="flex gap-6 border-t border-gray-100 pt-3">
                  <CheckBox checked={onboarding.linkSent} label="Link Sent" />
                  <CheckBox checked={onboarding.complete} label="Complete" />
                </div>
              </div>

              {/* Upload Button */}
              <button className="mt-5 w-full rounded-lg bg-navy py-3 text-sm font-semibold tracking-wide text-white hover:bg-navy/90">
                UPLOAD
              </button>

              {/* Progress */}
              <div className="mt-5 rounded-lg bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray">
                    Application Progress
                  </span>
                  <span className="text-sm font-medium text-navy">
                    {detail?.steps?.filter(s => s.is_completed).length || applicant.completed_steps}/
                    {detail?.steps?.length || 22}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-maroon"
                    style={{
                      width: `${((detail?.steps?.filter(s => s.is_completed).length || applicant.completed_steps) / (detail?.steps?.length || 22)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
