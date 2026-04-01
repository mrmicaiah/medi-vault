import React from 'react';
import { Button } from '../ui/Button';
import { formatDate } from '../../lib/utils';

interface PhotoIDViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  frontData?: Record<string, unknown>;
  backData?: Record<string, unknown>;
}

const ID_TYPE_LABELS: Record<string, string> = {
  drivers_license: "Driver's License",
  state_id: 'State ID',
  passport: 'US Passport',
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

export function PhotoIDViewModal({
  isOpen,
  onClose,
  frontData = {},
  backData = {},
}: PhotoIDViewModalProps) {
  if (!isOpen) return null;

  const idType = frontData.id_type as string;
  const idNumber = frontData.id_number as string;
  const issuingState = frontData.issuing_state as string;
  const expirationDate = frontData.expiration_date as string;
  const frontFileName = frontData.file_name as string;
  const backFileName = backData.file_name as string;
  const frontUrl = frontData.storage_url as string;
  const backUrl = backData.storage_url as string;

  const hasData = frontFileName || backFileName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy">
            Photo ID on File
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
            <p className="mt-3 text-sm text-gray">No Photo ID uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ID Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate">ID Information</h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
                <div>
                  <p className="text-xs text-gray">ID Type</p>
                  <p className="text-sm font-medium text-slate">
                    {ID_TYPE_LABELS[idType] || idType || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray">ID Number</p>
                  <p className="text-sm font-medium text-slate">{idNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray">Issuing State</p>
                  <p className="text-sm font-medium text-slate">
                    {STATE_LABELS[issuingState] || issuingState || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray">Expiration Date</p>
                  <p className="text-sm font-medium text-slate">
                    {expirationDate ? formatDate(expirationDate) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate">Uploaded Documents</h3>
              <div className="space-y-2">
                {/* Front */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-maroon/10">
                      <svg className="h-5 w-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate">Front of ID</p>
                      <p className="text-xs text-gray">{frontFileName || 'Not uploaded'}</p>
                    </div>
                  </div>
                  {frontUrl && (
                    <a
                      href={frontUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-maroon hover:text-maroon-dark"
                    >
                      View
                    </a>
                  )}
                </div>

                {/* Back */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-maroon/10">
                      <svg className="h-5 w-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate">Back of ID</p>
                      <p className="text-xs text-gray">{backFileName || 'Not uploaded'}</p>
                    </div>
                  </div>
                  {backUrl && (
                    <a
                      href={backUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-maroon hover:text-maroon-dark"
                    >
                      View
                    </a>
                  )}
                </div>
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
