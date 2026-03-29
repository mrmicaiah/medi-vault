import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function SocialSecurityCard({ data, onSave }: StepProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    onSave({ file_name: selectedFile.name, file_size: selectedFile.size, file: selectedFile });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload a copy of your Social Security card for employment verification.
      </p>

      <Alert variant="warning" title="Security Notice">
        Your Social Security card is encrypted and stored securely. It will only be used for employment
        verification purposes as required by law.
      </Alert>

      <Alert variant="info" title="Upload Tips">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>Ensure the full card is visible in the image</li>
          <li>Name and number must be clearly readable</li>
          <li>Accepted formats: PDF, JPG, PNG</li>
        </ul>
      </Alert>

      <FileUpload
        label="Social Security Card"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={10 * 1024 * 1024}
        currentFile={data.file_name ? { name: data.file_name as string } : null}
        helperText="Upload a clear photo or scan of your Social Security card"
      />
    </div>
  );
}
