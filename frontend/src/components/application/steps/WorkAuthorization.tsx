import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Input, Select } from '../../ui/Input';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onFileSelect?: (file: File | null) => void;
  pendingFile?: File | null;
  onChange?: () => void;
  saving: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'us_passport', label: 'US Passport' },
  { value: 'naturalization', label: 'Certificate of Naturalization' },
  { value: 'work_authorization', label: 'Work Authorization Card' },
];

export function WorkAuthorization({ data, onSave, onFileSelect, pendingFile, onChange }: StepProps) {
  // Initialize skip to false if there's already a file uploaded
  const existingFileName = (data.file_name as string) || '';
  const initialSkip = existingFileName ? false : ((data.skip as boolean) || false);
  
  const [form, setForm] = useState({
    skip: initialSkip,
    worker_type: (data.worker_type as string) || '',
    document_type: (data.document_type as string) || '',
    issuing_authority: (data.issuing_authority as string) || 'United States',
    document_number: (data.document_number as string) || '',
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
    const updated = { ...form, skip: false };
    setForm(updated);
    onChange?.();
    onFileSelect?.(file);
    onSave(updated);
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
        Upload a document that proves your authorization to work in the United States.
      </p>

      {/* Show success message if already uploaded */}
      {existingFileName && !pendingFile && (
        <Alert variant="success" title="Document Uploaded">
          <span className="font-medium">{existingFileName}</span> is on file. 
          You can upload a new version below if needed.
        </Alert>
      )}

      <Alert variant="info" title="Accepted Documents">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>Birth Certificate (US)</li>
          <li>US Passport</li>
          <li>Certificate of Naturalization</li>
          <li>Work Authorization Card</li>
        </ul>
      </Alert>

      <Select
        label="Worker Type"
        required
        value={form.worker_type}
        onChange={(e) => handleChange('worker_type', e.target.value)}
        options={[
          { value: 'employee', label: 'Employee (W-2)' },
          { value: 'contractor', label: 'Independent Contractor (1099)' },
        ]}
      />

      <Select
        label="Document Type"
        required
        value={form.document_type}
        onChange={(e) => handleChange('document_type', e.target.value)}
        options={DOCUMENT_TYPES}
      />

      <Input
        label="Issuing Authority"
        required
        value={form.issuing_authority}
        onChange={(e) => handleChange('issuing_authority', e.target.value)}
        placeholder="United States"
      />

      <Input
        label="Document ID Number"
        required
        value={form.document_number}
        onChange={(e) => handleChange('document_number', e.target.value)}
        placeholder="Enter the document number"
      />

      <FileUpload
        label="Work Authorization Document"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={10 * 1024 * 1024}
        currentFile={displayFileName ? { name: displayFileName } : null}
        helperText="Upload a clear photo or scan of your work authorization document"
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
            id="skip_work_auth"
            checked={form.skip}
            onChange={(e) => handleSkip(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
          />
          <label htmlFor="skip_work_auth" className="text-sm text-slate">
            I'll upload this later from my dashboard
          </label>
        </div>
      )}
    </div>
  );
}
