import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onChange?: () => void;
  saving: boolean;
}

export function IDBack({ data, onSave, onChange }: StepProps) {
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
        Now upload the back of your ID. This helps us verify the barcode and additional information.
      </p>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-gray-50 p-4">
        <input
          type="checkbox"
          id="skip_id_back"
          checked={form.skip}
          onChange={(e) => handleSkip(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
        />
        <label htmlFor="skip_id_back" className="text-sm text-slate">
          I'll upload this later from my dashboard
        </label>
      </div>

      {!form.skip && (
        <>
          <Alert variant="info" title="Back of ID Tips">
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>Make sure the barcode is clearly visible</li>
              <li>Avoid glare on laminated cards</li>
              <li>Include all edges of the card</li>
            </ul>
          </Alert>

          <FileUpload
            label="Back of ID"
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={form.file_name ? { name: form.file_name } : null}
            helperText="Upload a clear photo or scan of the back of your ID"
          />
        </>
      )}

      {form.skip && (
        <Alert variant="warning" title="Required for Hiring">
          The back of your ID is required before you can be hired.
          You can upload it from your dashboard at any time.
        </Alert>
      )}
    </div>
  );
}
