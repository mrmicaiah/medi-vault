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

export function TBTest({ data, onSave, onFileSelect, pendingFile, onChange }: StepProps) {
  // Initialize skip to false if there's already a file uploaded
  const existingFileName = (data.file_name as string) || '';
  const initialSkip = existingFileName ? false : ((data.skip as boolean) || false);
  
  const [form, setForm] = useState({
    skip: initialSkip,
    test_date: (data.test_date as string) || '',
    test_type: (data.test_type as string) || '',
    result: (data.result as string) || '',
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
        Upload your TB (Tuberculosis) test results. This is required for healthcare workers.
      </p>

      {/* Show success message if already uploaded */}
      {existingFileName && !pendingFile && (
        <Alert variant="success" title="Document Uploaded">
          <span className="font-medium">{existingFileName}</span> is on file. 
          You can upload a new version below if needed.
        </Alert>
      )}

      <Alert variant="info" title="TB Test Requirements">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>TB skin test (PPD) or QuantiFERON blood test accepted</li>
          <li>Test must be completed within the last 12 months</li>
          <li>If you have a positive TB history, upload chest X-ray clearance</li>
        </ul>
      </Alert>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Test Date"
          type="date"
          value={form.test_date}
          onChange={(e) => handleChange('test_date', e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-navy mb-1">Test Type</label>
          <select
            value={form.test_type}
            onChange={(e) => handleChange('test_type', e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
          >
            <option value="">Select test type...</option>
            <option value="ppd">TB Skin Test (PPD)</option>
            <option value="quantiferon">QuantiFERON Blood Test</option>
            <option value="tspot">T-SPOT Blood Test</option>
            <option value="chest_xray">Chest X-Ray</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy mb-1">Test Result</label>
        <select
          value={form.result}
          onChange={(e) => handleChange('result', e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
        >
          <option value="">Select result...</option>
          <option value="negative">Negative</option>
          <option value="positive_cleared">Positive (with clearance)</option>
        </select>
      </div>

      {/* Photo Tips */}
      <PhotoTips documentType="credential" />

      <FileUpload
        label="TB Test Results"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
        maxSize={10 * 1024 * 1024}
        currentFile={displayFileName ? { name: displayFileName } : null}
        helperText="Upload or take a photo of your TB test results document"
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
            id="skip_tb"
            checked={form.skip}
            onChange={(e) => handleSkip(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
          />
          <label htmlFor="skip_tb" className="text-sm text-slate">
            I don't have TB test results / I'll upload later
          </label>
        </div>
      )}
    </div>
  );
}
