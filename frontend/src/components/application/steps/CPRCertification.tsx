import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Input } from '../../ui/Input';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onFileSelect?: (file: File | null) => void;
  pendingFile?: File | null;
  onChange?: () => void;
  saving: boolean;
}

export function CPRCertification({ data, onSave, onFileSelect, pendingFile, onChange }: StepProps) {
  const [form, setForm] = useState({
    skip: (data.skip as boolean) || false,
    issuing_org: (data.issuing_org as string) || '',
    expiration_date: (data.expiration_date as string) || '',
  });

  const displayFileName = pendingFile?.name || (data.file_name as string) || '';

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onChange?.();
    onSave(updated);
  };

  const handleFileSelect = (file: File) => {
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
        If you have a current CPR certification, upload it here.
        This step is optional but may be required for certain positions.
      </p>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-gray-50 p-4">
        <input
          type="checkbox"
          id="skip_cpr"
          checked={form.skip}
          onChange={(e) => handleSkip(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
        />
        <label htmlFor="skip_cpr" className="text-sm text-slate">
          I don't have CPR certification / I'll upload later
        </label>
      </div>

      {!form.skip && (
        <>
          <Alert variant="info" title="Accepted CPR Certifications">
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>American Heart Association (AHA)</li>
              <li>American Red Cross</li>
              <li>National Safety Council</li>
              <li>Other accredited organizations</li>
            </ul>
          </Alert>

          <Input
            label="Issuing Organization"
            value={form.issuing_org}
            onChange={(e) => handleChange('issuing_org', e.target.value)}
            placeholder="e.g., American Heart Association"
          />

          <Input
            label="Expiration Date"
            type="date"
            value={form.expiration_date}
            onChange={(e) => handleChange('expiration_date', e.target.value)}
          />

          <FileUpload
            label="CPR Certification"
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={displayFileName ? { name: displayFileName } : null}
            helperText="Upload a clear photo or scan of your CPR card or certificate"
          />

          {pendingFile && (
            <p className="text-xs text-gray-500">
              File will be uploaded when you click "Next"
            </p>
          )}
        </>
      )}
    </div>
  );
}
