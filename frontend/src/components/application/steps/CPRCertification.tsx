import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Input } from '../../ui/Input';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onChange?: () => void;
  saving: boolean;
}

export function CPRCertification({ data, onSave, onChange }: StepProps) {
  const [form, setForm] = useState({
    skip: (data.skip as boolean) || false,
    expiration_date: (data.expiration_date as string) || '',
    issuing_organization: (data.issuing_organization as string) || '',
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
        Upload your CPR certification card or certificate.
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
          I don't have my CPR certification yet (I'll upload it later)
        </label>
      </div>

      {!form.skip && (
        <>
          <Alert variant="info" title="Accepted CPR Certifications">
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>American Heart Association (AHA)</li>
              <li>American Red Cross</li>
              <li>National Safety Council</li>
              <li>Other accredited providers</li>
            </ul>
          </Alert>

          <Input
            label="Issuing Organization"
            required
            value={form.issuing_organization}
            onChange={(e) => handleChange('issuing_organization', e.target.value)}
            placeholder="e.g., American Heart Association"
          />

          <Input
            label="Expiration Date"
            type="date"
            required
            value={form.expiration_date}
            onChange={(e) => handleChange('expiration_date', e.target.value)}
          />

          <FileUpload
            label="CPR Certification"
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={form.file_name ? { name: form.file_name } : null}
            helperText="Upload a clear photo or scan of your CPR card or certificate"
          />
        </>
      )}

      {form.skip && (
        <Alert variant="warning" title="Action Required">
          CPR certification is required before you can be assigned to clients.
          You can upload it from your dashboard at any time.
        </Alert>
      )}
    </div>
  );
}
