import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { Input, Select } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

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

// Map step numbers to readable folder names for storage organization
const STEP_FOLDER_NAMES: Record<number, string> = {
  11: 'work-authorization',
  12: 'id-front',
  13: 'id-back',
  14: 'ssn-card',
  15: 'credentials',
  16: 'cpr-certification',
  17: 'tb-test',
};

export function DocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
  applicationId,
  stepNumber,
  stepName,
  existingData = {},
}: DocumentUploadModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
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

  const uploadFileToStorage = async (file: File): Promise<{ path: string; url: string }> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    const folderName = STEP_FOLDER_NAMES[stepNumber] || `step-${stepNumber}`;
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${folderName}/${timestamp}_${sanitizedFileName}`;

    setUploadProgress('Uploading file...');

    const { data, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);

    setUploadProgress(null);

    return {
      path: data.path,
      url: urlData?.signedUrl || '',
    };
  };

  const deleteOldFile = async (storagePath: string) => {
    try {
      setUploadProgress('Removing old file...');
      const { error } = await supabase.storage.from('documents').remove([storagePath]);
      if (error) {
        console.warn('Failed to delete old file (non-critical):', error);
      }
    } catch (err) {
      console.warn('Error deleting old file:', err);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Delete old file if exists
      const oldStoragePath = existingData?.storage_path as string | undefined;
      if (oldStoragePath) {
        await deleteOldFile(oldStoragePath);
      }

      const { path, url } = await uploadFileToStorage(file);

      setUploadProgress('Saving document info...');
      
      await api.post(`/applications/${applicationId}/steps`, {
        step_number: stepNumber,
        data: { 
          ...formData, 
          skip: false,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: path,
          storage_url: url,
          uploaded_at: new Date().toISOString(),
        },
        status: 'completed',
      });

      setUploadProgress(null);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
      setUploadProgress(null);
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
                { value: 'ppd', label: 'PPD Skin Test' },
                { value: 'quantiferon', label: 'QuantiFERON-TB Gold' },
                { value: 'tspot', label: 'T-SPOT' },
                { value: 'xray', label: 'Chest X-Ray' },
              ]}
            />
            <Input
              label="Test Date"
              type="date"
              required
              value={(formData.test_date as string) || ''}
              onChange={(e) => {
                const testDate = e.target.value;
                handleFieldChange('test_date', testDate);
                if (testDate) {
                  const date = new Date(testDate);
                  date.setFullYear(date.getFullYear() + 1);
                  handleFieldChange('expiration_date', date.toISOString().split('T')[0]);
                }
              }}
              helperText="TB tests are valid for 12 months"
            />
            {formData.test_date && (
              <div className="rounded-lg bg-gray-50 border border-border p-3">
                <p className="text-sm text-gray">
                  <span className="font-medium">Expires:</span>{' '}
                  {(() => {
                    const date = new Date(formData.test_date as string);
                    date.setFullYear(date.getFullYear() + 1);
                    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                  })()}
                </p>
              </div>
            )}
            <Select
              label="Result"
              value={(formData.result as string) || ''}
              onChange={(e) => handleFieldChange('result', e.target.value)}
              options={[
                { value: 'negative', label: 'Negative' },
                { value: 'positive_cleared', label: 'Positive - Cleared by physician' },
              ]}
            />
          </>
        );

      default:
        return null;
    }
  };

  const canSubmit = file && !saving;

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
            disabled={saving}
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

        {uploadProgress && (
          <Alert variant="info" className="mb-4">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {uploadProgress}
            </div>
          </Alert>
        )}

        <div className="space-y-4">
          {renderFields()}

          <FileUpload
            label="Document"
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={file ? { name: file.name } : (formData.file_name ? { name: formData.file_name as string } : null)}
            helperText="Upload a clear photo or scan (PDF, JPG, or PNG, max 10MB)"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving} disabled={!canSubmit}>
            {saving ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>
    </div>
  );
}
