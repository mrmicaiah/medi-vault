import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
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

export function WorkAuthorization({ data, onSave, onFileSelect, pendingFile, onChange }: StepProps) {
  // Initialize skip to false if there's already a file uploaded
  const existingFileName = (data.file_name as string) || '';
  const initialSkip = existingFileName ? false : ((data.skip as boolean) || false);
  
  const [form, setForm] = useState({
    skip: initialSkip,
    authorization_type: (data.authorization_type as string) || '',
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
        Upload documentation proving your eligibility to work in the United States.
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
          <li><strong>US Citizens:</strong> US Passport, Birth Certificate, or Naturalization Certificate</li>
          <li><strong>Permanent Residents:</strong> Permanent Resident Card (Green Card)</li>
          <li><strong>Work Visa Holders:</strong> Employment Authorization Document (EAD) or valid work visa</li>
        </ul>
      </Alert>

      <div>
        <label className="block text-sm font-medium text-navy mb-1">Document Type</label>
        <select
          value={form.authorization_type}
          onChange={(e) => handleChange('authorization_type', e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
        >
          <option value="">Select document type...</option>
          <option value="us_passport">US Passport</option>
          <option value="birth_certificate">US Birth Certificate</option>
          <option value="naturalization">Certificate of Naturalization</option>
          <option value="green_card">Permanent Resident Card (Green Card)</option>
          <option value="ead">Employment Authorization Document (EAD)</option>
          <option value="work_visa">Work Visa</option>
        </select>
      </div>

      {/* Photo Tips */}
      <PhotoTips documentType="general" />

      <FileUpload
        label="Work Authorization Document"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
        maxSize={10 * 1024 * 1024}
        currentFile={displayFileName ? { name: displayFileName } : null}
        helperText="Upload or take a photo of your work authorization document"
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
