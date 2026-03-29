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

export function TBTest({ data, onSave, onChange }: StepProps) {
  const [form, setForm] = useState({
    skip: (data.skip as boolean) || false,
    test_type: (data.test_type as string) || '',
    test_date: (data.test_date as string) || '',
    result: (data.result as string) || '',
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
        Upload your tuberculosis (TB) test results.
      </p>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-gray-50 p-4">
        <input
          type="checkbox"
          id="skip_tb"
          checked={form.skip}
          onChange={(e) => handleSkip(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
        />
        <label htmlFor="skip_tb" className="text-sm text-slate">
          I don't have my TB test results yet (I'll upload them later)
        </label>
      </div>

      {!form.skip && (
        <>
          <Alert variant="info" title="TB Test Requirements">
            <p className="mt-1 text-sm">
              TB test must be dated within the last 12 months. We accept PPD skin tests,
              QuantiFERON blood tests, or chest X-ray results (if you've had a positive PPD).
            </p>
          </Alert>

          <Select
            label="Test Type"
            required
            value={form.test_type}
            onChange={(e) => handleChange('test_type', e.target.value)}
            options={[
              { value: 'ppd', label: 'PPD Skin Test (Mantoux)' },
              { value: 'quantiferon', label: 'QuantiFERON Blood Test' },
              { value: 'tspot', label: 'T-SPOT Blood Test' },
              { value: 'chest_xray', label: 'Chest X-Ray' },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Test Date"
              type="date"
              required
              value={form.test_date}
              onChange={(e) => handleChange('test_date', e.target.value)}
            />

            <Select
              label="Test Result"
              required
              value={form.result}
              onChange={(e) => handleChange('result', e.target.value)}
              options={[
                { value: 'negative', label: 'Negative' },
                { value: 'positive_cleared', label: 'Positive (Cleared by X-Ray)' },
              ]}
            />
          </div>

          <FileUpload
            label="TB Test Results"
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={form.file_name ? { name: form.file_name } : null}
            helperText="Upload a clear photo or scan of your TB test results"
          />
        </>
      )}

      {form.skip && (
        <Alert variant="warning" title="Action Required">
          A valid TB test is required before you can be assigned to clients.
          You can upload it from your dashboard at any time.
        </Alert>
      )}
    </div>
  );
}
