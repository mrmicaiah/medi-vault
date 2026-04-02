import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Input, Select } from '../../ui/Input';
import { Alert } from '../../ui/Alert';
import { PhotoTips } from '../../ui/PhotoTips';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onFileSelect?: (file: File | null) => void;
  pendingFile?: File | null;
  onChange?: () => void;
  saving: boolean;
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

const CREDENTIAL_TYPES = [
  { value: 'cna', label: 'CNA (Certified Nursing Assistant)' },
  { value: 'lpn', label: 'LPN (Licensed Practical Nurse)' },
  { value: 'rn', label: 'RN (Registered Nurse)' },
  { value: 'hha', label: 'Home Health Aide Certification' },
  { value: 'pca', label: 'PCA (Personal Care Aide)' },
  { value: 'other', label: 'Other Healthcare License' },
];

export function Credentials({ data, onSave, onFileSelect, pendingFile, onChange }: StepProps) {
  // Initialize skip to false if there's already a file uploaded
  const existingFileName = (data.file_name as string) || '';
  const initialSkip = existingFileName ? false : ((data.skip as boolean) || false);
  
  const [form, setForm] = useState({
    skip: initialSkip,
    credential_type: (data.credential_type as string) || '',
    other_credential_type: (data.other_credential_type as string) || '',
    credential_number: (data.credential_number as string) || '',
    issuing_state: (data.issuing_state as string) || '',
    expiration_date: (data.expiration_date as string) || '',
  });

  const displayFileName = pendingFile?.name || existingFileName;
  const hasUpload = !!displayFileName;

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value, skip: false };
    setForm(updated);
    onChange?.();
    onSave(updated);
  };

  const handleFileSelect = (file: File) => {
    // Update local state to uncheck skip
    setForm(prev => ({ ...prev, skip: false }));
    // Just notify parent about file selection - don't save yet
    onChange?.();
    onFileSelect?.(file);
  };

  const handleSkip = (checked: boolean) => {
    const updated = { ...form, skip: checked };
    setForm(updated);
    onChange?.();
    if (checked) {
      onFileSelect?.(null);
    }
    onSave(updated);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        If you have any healthcare credentials (CNA, LPN, RN, etc.), upload them here.
        This step is optional but may qualify you for additional positions.
      </p>

      {/* Show success message if already uploaded */}
      {existingFileName && !pendingFile && (
        <Alert variant="success" title="Document Uploaded">
          <span className="font-medium">{existingFileName}</span> is on file. 
          You can upload a new version below if needed.
        </Alert>
      )}

      <Select
        label="Credential Type"
        value={form.credential_type}
        onChange={(e) => handleChange('credential_type', e.target.value)}
        options={CREDENTIAL_TYPES}
      />

      {form.credential_type === 'other' && (
        <Input
          label="Specify Credential Type"
          value={form.other_credential_type}
          onChange={(e) => handleChange('other_credential_type', e.target.value)}
          placeholder="Enter your credential type"
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Credential/License Number"
          value={form.credential_number}
          onChange={(e) => handleChange('credential_number', e.target.value)}
          placeholder="Enter your credential number"
        />

        <Select
          label="Issuing State"
          value={form.issuing_state}
          onChange={(e) => handleChange('issuing_state', e.target.value)}
          options={US_STATES}
        />
      </div>

      <Input
        label="Expiration Date"
        type="date"
        value={form.expiration_date}
        onChange={(e) => handleChange('expiration_date', e.target.value)}
      />

      {/* Photo Tips */}
      <PhotoTips documentType="credential" />

      <FileUpload
        label="Credential Document"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
        maxSize={10 * 1024 * 1024}
        currentFile={displayFileName ? { name: displayFileName } : null}
        helperText="Upload or take a photo of your credential (PDF preferred for multi-page documents)"
        optimizeImages={true}
        allowCamera={true}
      />

      {pendingFile && (
        <p className="text-xs text-gray-500">
          File will be uploaded when you click "Next"
        </p>
      )}

      {/* Skip checkbox at the bottom - only show if nothing uploaded */}
      {!hasUpload && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-gray-50 p-4">
          <input
            type="checkbox"
            id="skip_credentials"
            checked={form.skip}
            onChange={(e) => handleSkip(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
          />
          <label htmlFor="skip_credentials" className="text-sm text-slate">
            I don't have credentials to upload / I'll upload later
          </label>
        </div>
      )}
    </div>
  );
}
