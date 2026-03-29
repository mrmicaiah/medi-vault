import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Input, Select } from '../../ui/Input';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onChange?: () => void;
  saving: boolean;
}

const CREDENTIAL_TYPES = [
  { value: 'hha', label: 'Home Health Aide (HHA)' },
  { value: 'cna', label: 'Certified Nursing Assistant (CNA)' },
  { value: 'pca', label: 'Personal Care Aide (PCA)' },
  { value: 'lpn', label: 'Licensed Practical Nurse (LPN)' },
  { value: 'rn', label: 'Registered Nurse (RN)' },
];

export function Credentials({ data, onSave, onChange }: StepProps) {
  const [form, setForm] = useState({
    skip: (data.skip as boolean) || false,
    credential_type: (data.credential_type as string) || '',
    credential_number: (data.credential_number as string) || '',
    expiration_date: (data.expiration_date as string) || '',
    issuing_state: (data.issuing_state as string) || '',
    file_name: (data.file_name as string) || '',
  });

  const handleChange = (field: string, value: string | boolean) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onChange?.();
    onSave(updated);
  };

  const handleFileSelect = (file: File) => {
    const updated = { ...form, file_name: file.name, file_size: file.size };
    setForm({ ...form, file_name: file.name });
    onChange?.();
    onSave({ ...updated, file });
  };

  const handleSkip = (checked: boolean) => {
    setForm({ ...form, skip: checked });
    onChange?.();
    onSave({ ...form, skip: checked });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload your professional credentials certificate.
      </p>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-gray-50 p-4">
        <input
          type="checkbox"
          id="skip_credentials"
          checked={form.skip}
          onChange={(e) => handleSkip(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
        />
        <label htmlFor="skip_credentials" className="text-sm text-slate">
          I don't have my credentials yet (I'll upload them later)
        </label>
      </div>

      {!form.skip && (
        <>
          <Select
            label="Credential Type"
            required
            value={form.credential_type}
            onChange={(e) => handleChange('credential_type', e.target.value)}
            options={CREDENTIAL_TYPES}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Credential/License Number"
              required
              value={form.credential_number}
              onChange={(e) => handleChange('credential_number', e.target.value)}
              placeholder="Enter your credential number"
            />

            <Input
              label="Issuing State"
              required
              value={form.issuing_state}
              onChange={(e) => handleChange('issuing_state', e.target.value.toUpperCase())}
              placeholder="VA"
              maxLength={2}
            />
          </div>

          <Input
            label="Expiration Date"
            type="date"
            required
            value={form.expiration_date}
            onChange={(e) => handleChange('expiration_date', e.target.value)}
          />

          <FileUpload
            label="Credentials Certificate"
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={form.file_name ? { name: form.file_name } : null}
            helperText="Upload a clear photo or scan of your credentials certificate"
          />
        </>
      )}

      {form.skip && (
        <Alert variant="warning" title="Action Required">
          You'll need to upload your credentials before you can be assigned to clients.
          You can upload them from your dashboard at any time.
        </Alert>
      )}
    </div>
  );
}
