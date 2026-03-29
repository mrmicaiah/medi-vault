import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onChange?: () => void;
  saving: boolean;
}

export function SocialSecurityCard({ data, onSave, onChange }: StepProps) {
  const [form, setForm] = useState({
    skip: (data.skip as boolean) || false,
    file_name: (data.file_name as string) || '',
  });

  const handleFileSelect = (file: File) => {
    setForm({ ...form, file_name: file.name });
    onChange?.();
    onSave({ ...form, file_name: file.name, file_size: file.size, file });
  };

  const handleSkip = (checked: boolean) => {
    setForm({ ...form, skip: checked });
    onChange?.();
    onSave({ ...form, skip: checked });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload a photo of your Social Security card. This is required for I-9 verification and payroll setup.
      </p>

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

      {!form.skip && (
        <>
          <Alert variant="info" title="Social Security Card Tips">
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>Card must show your full name and SSN</li>
              <li>Ensure text is clearly legible</li>
              <li>If your card is laminated, avoid glare</li>
              <li>Old or worn cards are acceptable if readable</li>
            </ul>
          </Alert>

          <FileUpload
            label="Social Security Card"
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={form.file_name ? { name: form.file_name } : null}
            helperText="Upload a clear photo or scan of your Social Security card"
          />
        </>
      )}

      {form.skip && (
        <Alert variant="warning" title="Required for Hiring">
          Your Social Security card is required for I-9 verification before you can be hired.
          You can upload it from your dashboard at any time.
        </Alert>
      )}
    </div>
  );
}
