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
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  application_id: string;
  status: string;
  current_step: number;
  completed_steps: number;
  total_steps: number;
  submitted_at: string | null;
  location_name?: string;
  steps: Array<{
    step_number: number;
    step_name: string;
    step_type: string;
    is_completed: boolean;
    data: Record<string, unknown> | null;
    completed_at: string | null;
  }>;
  documents: Array<{
    id: string;
    document_type: string;
    file_name: string;
    created_at: string;
    expires_at: string | null;
    is_current: boolean;
  }>;
  agreements: Array<{
    id: string;
    agreement_type: string;
    signed_at: string;
    pdf_path: string | null;
  }>;
}

interface Props {
  applicant: Applicant;
  onClose: () => void;
  onRefresh: () => void;
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

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<ApplicantDetail>(
          `/admin/applicants/${applicant.application_id}`
        );
        setDetail(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [applicant.application_id]);

  // Extract info from steps
  const getStepData = (stepNumber: number) => {
    return detail?.steps.find((s) => s.step_number === stepNumber)?.data || {};
  };

  const personalInfo = getStepData(2);
  const preferencesData = getStepData(8);

  // Document status from steps 11-17
  const hasDocument = (stepNumber: number) => {
    const step = detail?.steps.find((s) => s.step_number === stepNumber);
    return Boolean(step?.data?.file_name && !step?.data?.skip);
  };

  // Onboarding status
  const onboarding = {
    cred: hasDocument(15), // Credentials
    cpr: hasDocument(16),  // CPR
    tb: hasDocument(17),   // TB
    linkSent: (detail?.status === 'submitted' || detail?.status === 'under_review' || detail?.status === 'approved'),
    complete: detail?.status === 'hired',
  };

  const city = (personalInfo.city as string) || applicant.location_name || '—';
  const certifications = hasDocument(15) ? 'Uploaded' : 'Not uploaded';
  const cpr = hasDocument(16);
  const tb = hasDocument(17);
  const driversLicense = hasDocument(12); // ID Front
  const travel30 = (preferencesData.willing_to_travel as boolean) ?? true;
  const bedBound = (preferencesData.bed_bound_care as boolean) ?? false;
  const availability = (preferencesData.availability as string) || 'Not specified';
  const hours = (preferencesData.hours_preference as string) || 'Not specified';
  const smokerPref = (preferencesData.smoker_preference as string) || 'No preference';

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
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
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
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
                <button className="bg-slate px-4 py-3 text-sm font-semibold text-white hover:bg-slate/90">
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
                    {detail?.completed_steps || applicant.completed_steps}/
                    {detail?.total_steps || 22}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-maroon"
                    style={{
                      width: `${((detail?.completed_steps || applicant.completed_steps) / (detail?.total_steps || 22)) * 100}%`,
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
