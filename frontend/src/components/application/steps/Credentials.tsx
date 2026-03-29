import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function Credentials({ data, onSave }: StepProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    onSave({ file_name: selectedFile.name, file_size: selectedFile.size, file: selectedFile });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload your professional credentials or certifications (CNA certificate, nursing license, etc.).
      </p>

      <Alert variant="info" title="What to upload">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>CNA, HHA, or LPN/RN license or certificate</li>
          <li>Must show your name, credential type, and expiration date</li>
          <li>If you have multiple credentials, upload the most relevant one</li>
          <li>If you do not yet have credentials, click "Not Yet" to skip</li>
        </ul>
      </Alert>

      <FileUpload
        label="Professional Credentials"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={10 * 1024 * 1024}
        currentFile={data.file_name ? { name: data.file_name as string } : null}
        helperText="Upload your professional license, certificate, or credential document"
      />
    </div>
  );
}
