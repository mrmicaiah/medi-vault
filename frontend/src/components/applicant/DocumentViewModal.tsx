import React from 'react';
import { Button } from '../ui/Button';
import { formatDate } from '../../lib/utils';

interface DocumentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepNumber: number;
  stepName: string;
  data?: Record<string, unknown>;
}

const ID_TYPE_LABELS: Record<string, string> = {
  drivers_license: "Driver's License",
  state_id: 'State ID',
  passport: 'US Passport',
};

const WORK_AUTH_LABELS: Record<string, string> = {
  birth_certificate: 'Birth Certificate',
  us_passport: 'US Passport',
  naturalization: 'Certificate of Naturalization',
  work_authorization: 'Work Authorization Card',
};

const TB_TEST_LABELS: Record<string, string> = {
  ppd: 'PPD Skin Test',
  quantiferon: 'QuantiFERON-TB Gold',
  tspot: 'T-SPOT',
  xray: 'Chest X-Ray',
  skin: 'Skin Test (PPD)',
  blood: 'Blood Test (IGRA)',
};

const STATE_LABELS: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

export function DocumentViewModal({
  isOpen,
  onClose,
  stepNumber,
  stepName,
  data = {},
}: DocumentViewModalProps) {
  if (!isOpen) return null;

  const fileName = data.file_name as string;
  const fileUrl = data.storage_url as string;
  const uploadedAt = data.uploaded_at as string;

  const hasData = !!fileName;

  // Render metadata fields based on step type
  const renderMetadata = () => {
    switch (stepNumber) {
      case 11: // Work Authorization
        return (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray">Worker Type</p>
              <p className="text-sm font-medium text-slate">
                {data.worker_type === 'employee' ? 'Employee (W-2)' : 
                 data.worker_type === 'contractor' ? 'Independent Contractor (1099)' : 
                 (data.worker_type as string) || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray">Document Type</p>
              <p className="text-sm font-medium text-slate">
                {WORK_AUTH_LABELS[data.document_type as string] || (data.document_type as string) || '—'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray">Document Number</p>
              <p className="text-sm font-medium text-slate">{(data.document_number as string) || '—'}</p>
            </div>
          </div>
        );

      case 14: // SSN Card
        return (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray">Social Security Number</p>
            <p className="text-sm font-medium text-slate">
              {data.ssn_last_four ? `•••-••-${data.ssn_last_four}` : 'On file'}
            </p>
          </div>
        );

      case 15: // Professional Credentials
        return (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray">Credential Type</p>
              <p className="text-sm font-medium text-slate">{(data.credential_type as string) || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray">Credential Number</p>
              <p className="text-sm font-medium text-slate">{(data.credential_number as string) || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray">Issuing State</p>
              <p className="text-sm font-medium text-slate">
                {STATE_LABELS[data.issuing_state as string] || (data.issuing_state as string) || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray">Expiration Date</p>
              <p className="text-sm font-medium text-slate">
                {data.expiration_date ? formatDate(data.expiration_date as string) : '—'}
              </p>
            </div>
          </div>
        );

      case 16: // CPR Certification
        return (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray">Issuing Organization</p>
              <p className="text-sm font-medium text-slate">{(data.issuing_org as string) || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray">Expiration Date</p>
              <p className="text-sm font-medium text-slate">
                {data.expiration_date ? formatDate(data.expiration_date as string) : '—'}
              </p>
            </div>
          </div>
        );

      case 17: // TB Test
        return (
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray">Test Type</p>
              <p className="text-sm font-medium text-slate">
                {TB_TEST_LABELS[data.test_type as string] || (data.test_type as string) || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray">Test Date</p>
              <p className="text-sm font-medium text-slate">
                {data.test_date ? formatDate(data.test_date as string) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray">Result</p>
              <p className="text-sm font-medium text-slate">
                {data.result === 'negative' ? 'Negative' :
                 data.result === 'positive_cleared' ? 'Positive - Cleared' :
                 data.result === 'positive' ? 'Positive (with clearance)' :
                 (data.result as string) || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray">Expiration Date</p>
              <p className="text-sm font-medium text-slate">
                {data.expiration_date ? formatDate(data.expiration_date as string) : '—'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy">
            {stepName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray hover:text-slate"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!hasData ? (
          <div className="py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-3 text-sm text-gray">No document uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metadata section */}
            {renderMetadata() && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate">Document Information</h3>
                {renderMetadata()}
              </div>
            )}

            {/* File section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate">Uploaded Document</h3>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-maroon/10">
                    <svg className="h-5 w-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate">{fileName}</p>
                    {uploadedAt && (
                      <p className="text-xs text-gray">Uploaded {formatDate(uploadedAt)}</p>
                    )}
                  </div>
                </div>
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-maroon hover:text-maroon-dark"
                  >
                    View File
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
