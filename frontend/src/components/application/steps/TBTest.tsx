import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function TBTest({ data, onSave }: StepProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    onSave({ file_name: selectedFile.name, file_size: selectedFile.size, file: selectedFile });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload your Tuberculosis (TB) test results or chest X-ray report.
      </p>

      <Alert variant="info" title="TB Test Requirements">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>A 2-step PPD (Mantoux) skin test, or QuantiFERON blood test</li>
          <li>Test must have been completed within the last 12 months</li>
          <li>Results must show your name, date, and reading</li>
          <li>If positive, a chest X-ray report is required</li>
          <li>If you have not completed a TB test yet, click "Not Yet" to skip</li>
        </ul>
      </Alert>

      <FileUpload
        label="TB Test Results"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={10 * 1024 * 1024}
        currentFile={data.file_name ? { name: data.file_name as string } : null}
        helperText="Upload your TB test results or chest X-ray report"
      />
    </div>
  );
}
