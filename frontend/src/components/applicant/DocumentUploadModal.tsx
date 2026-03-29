import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { Input, Select } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { api } from '../../lib/api';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  applicationId: string;
  stepNumber: number;
  stepName: string;
  existingData?: Record<string, unknown>;
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'District of Columbia' },
];

const WORK_AUTH_TYPES = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'us_passport', label: 'US Passport' },
  { value: 'naturalization', label: 'Certificate of Naturalization' },
  { value: 'work_authorization', label: 'Work Authorization Card' },
];

const ID_TYPES = [
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'state_id', label: 'State ID' },
  { value: 'passport', label: 'US Passport' },
];

export function DocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
  applicationId,
  stepNumber,
  stepName,
  existingData = {},
}: DocumentUploadModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>(existingData);
  const [file, setFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setFormData(prev => ({ ...prev, file_name: selectedFile.name }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      // TODO: Upload file to storage first, then save step data
      // For now, just save the metadata
      await api.post(`/applications/${applicationId}/steps`, {
        step_number: stepNumber,
        data: { ...formData, skip: false },
        status: 'completed',
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setSaving(false);
    }
  };

  const renderFields = () => {
    switch (stepNumber) {
      case 11: // Work Authorization
        return (
          <>
            <Select
              label="Worker Type"
              required
              value={(formData.worker_type as string) || ''}
              onChange={(e) => handleFieldChange('worker_type', e.target.value)}
              options={[
                { value: 'employee', label: 'Employee (W-2)' },
                { value: 'contractor', label: 'Independent Contractor (1099)' },
              ]}
            />
            <Select
              label="Document Type"
              required
              value={(formData.document_type as string) || ''}
              onChange={(e) => handleFieldChange('document_type', e.target.value)}
              options={WORK_AUTH_TYPES}
            />
            <Input
              label="Document ID Number"
              required
              value={(formData.document_number as string) || ''}
              onChange={(e) => handleFieldChange('document_number', e.target.value)}
            />
          </>
        );

      case 12: // ID Front
        return (
          <>
            <Select
              label="ID Type"
              required
              value={(formData.id_type as string) || ''}
              onChange={(e) => handleFieldChange('id_type', e.target.value)}
              options={ID_TYPES}
            />
            <Input
              label="ID Number"
              required
              value={(formData.id_number as string) || ''}
              onChange={(e) => handleFieldChange('id_number', e.target.value)}
            />
            <Select
              label="Issuing State"
              required
              value={(formData.issuing_state as string) || ''}
              onChange={(e) => handleFieldChange('issuing_state', e.target.value)}
              options={US_STATES}
            />
            <Input
              label="Expiration Date"
              type="date"
              required
              value={(formData.expiration_date as string) || ''}
              onChange={(e) => handleFieldChange('expiration_date', e.target.value)}
            />
          </>
        );

      case 13: // ID Back
      case 14: // SSN Card
        // File only
        return null;

      case 15: // Credentials
        return (
          <>
            <Input
              label="Credential Type"
              value={(formData.credential_type as string) || ''}
              onChange={(e) => handleFieldChange('credential_type', e.target.value)}
              placeholder="e.g., CNA, LPN, RN"
            />
            <Input
              label="Credential Number"
              value={(formData.credential_number as string) || ''}
              onChange={(e) => handleFieldChange('credential_number', e.target.value)}
            />
            <Select
              label="Issuing State"
              value={(formData.issuing_state as string) || ''}
              onChange={(e) => handleFieldChange('issuing_state', e.target.value)}
              options={US_STATES}
            />
            <Input
              label="Expiration Date"
              type="date"
              value={(formData.expiration_date as string) || ''}
              onChange={(e) => handleFieldChange('expiration_date', e.target.value)}
            />
          </>
        );

      case 16: // CPR
        return (
          <>
            <Input
              label="Issuing Organization"
              value={(formData.issuing_org as string) || ''}
              onChange={(e) => handleFieldChange('issuing_org', e.target.value)}
              placeholder="e.g., American Heart Association"
            />
            <Input
              label="Expiration Date"
              type="date"
              value={(formData.expiration_date as string) || ''}
              onChange={(e) => handleFieldChange('expiration_date', e.target.value)}
            />
          </>
        );

      case 17: // TB Test
        return (
          <>
            <Select
              label="Test Type"
              value={(formData.test_type as string) || ''}
              onChange={(e) => handleFieldChange('test_type', e.target.value)}
              options={[
                { value: 'skin', label: 'Skin Test (PPD)' },
                { value: 'blood', label: 'Blood Test (IGRA)' },
                { value: 'xray', label: 'Chest X-Ray' },
              ]}
            />
            <Input
              label="Test Date"
              type="date"
              value={(formData.test_date as string) || ''}
              onChange={(e) => handleFieldChange('test_date', e.target.value)}
            />
            <Select
              label="Result"
              value={(formData.result as string) || ''}
              onChange={(e) => handleFieldChange('result', e.target.value)}
              options={[
                { value: 'negative', label: 'Negative' },
                { value: 'positive', label: 'Positive (with clearance)' },
              ]}
            />
          </>
        );

      default:
        return null;
    }
  };

  const canSubmit = formData.file_name && !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy">
            Upload {stepName}
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

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="space-y-4">
          {renderFields()}

          <FileUpload
            label="Document"
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={formData.file_name ? { name: formData.file_name as string } : null}
            helperText="Upload a clear photo or scan"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            Upload Document
          </Button>
        </div>
      </div>
    </div>
  );
}
