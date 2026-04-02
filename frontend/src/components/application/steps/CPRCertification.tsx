import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Input } from '../../ui/Input';
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

export function CPRCertification({ data, onSave, onFileSelect, pendingFile, onChange }: StepProps) {
  // Initialize skip to false if there's already a file uploaded
  const existingFileName = (data.file_name as string) || '';
  const initialSkip = existingFileName ? false : ((data.skip as boolean) || false);
  
  const [form, setForm] = useState({
    skip: initialSkip,
    certification_date: (data.certification_date as string) || '',
    expiration_date: (data.expiration_date as string) || '',
    issuing_organization: (data.issuing_organization as string) || '',
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
        Upload your CPR/First Aid certification. This is required for most home care positions.
      </p>

      {/* Show success message if already uploaded */}
      {existingFileName && !pendingFile && (
        <Alert variant="success" title="Document Uploaded">
          <span className="font-medium">{existingFileName}</span> is on file. 
          You can upload a new version below if needed.
        </Alert>
      )}

      <Alert variant="info" title="Accepted CPR Certifications">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>American Heart Association (AHA)</li>
          <li>American Red Cross</li>
          <li>National Safety Council</li>
          <li>Other nationally recognized certifications</li>
        </ul>
      </Alert>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Certification Date"
          type="date"
          value={form.certification_date}
          onChange={(e) => handleChange('certification_date', e.target.value)}
        />

        <Input
          label="Expiration Date"
          type="date"
          value={form.expiration_date}
          onChange={(e) => handleChange('expiration_date', e.target.value)}
        />
      </div>

      <Input
        label="Issuing Organization"
        value={form.issuing_organization}
        onChange={(e) => handleChange('issuing_organization', e.target.value)}
        placeholder="e.g., American Heart Association"
      />

      {/* Photo Tips */}
      <PhotoTips documentType="credential" />

      <FileUpload
        label="CPR Certification"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
        maxSize={10 * 1024 * 1024}
        currentFile={displayFileName ? { name: displayFileName } : null}
        helperText="Upload or take a photo of your CPR card or certificate"
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
            id="skip_cpr"
            checked={form.skip}
            onChange={(e) => handleSkip(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
          />
          <label htmlFor="skip_cpr" className="text-sm text-slate">
            I don't have a CPR certification / I'll upload later
          </label>
        </div>
      )}
    </div>
  );
}
