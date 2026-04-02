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

export function SocialSecurityCard({ data, onSave, onFileSelect, pendingFile, onChange }: StepProps) {
  // Initialize skip to false if there's already a file uploaded
  const existingFileName = (data.file_name as string) || '';
  const initialSkip = existingFileName ? false : ((data.skip as boolean) || false);
  
  const [form, setForm] = useState({
    skip: initialSkip,
  });

  const displayFileName = pendingFile?.name || existingFileName;
  const hasUpload = !!displayFileName;

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
        Upload an image of your Social Security card. This is required for employment verification and tax purposes.
      </p>

      {/* Show success message if already uploaded */}
      {existingFileName && !pendingFile && (
        <Alert variant="success" title="Document Uploaded">
          <span className="font-medium">{existingFileName}</span> is on file. 
          You can upload a new version below if needed.
        </Alert>
      )}

      <Alert variant="warning" title="Important">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>Your Social Security card is sensitive — it will be stored securely</li>
          <li>Make sure your full name and SSN are clearly visible</li>
          <li>Do not upload a photo of your SSN written on paper</li>
        </ul>
      </Alert>

      {/* Photo Tips */}
      <PhotoTips documentType="ssn" />

      <FileUpload
        label="Social Security Card"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
        maxSize={10 * 1024 * 1024}
        currentFile={displayFileName ? { name: displayFileName } : null}
        helperText="Upload or take a photo of your Social Security card"
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
            id="skip_ssn_card"
            checked={form.skip}
            onChange={(e) => handleSkip(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
          />
          <label htmlFor="skip_ssn_card" className="text-sm text-slate">
            I'll upload this later from my dashboard
          </label>
        </div>
      )}
    </div>
  );
}
