import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function IDBack({ data, onSave }: StepProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    onSave({ file_name: selectedFile.name, file_size: selectedFile.size, file: selectedFile });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload the back of your government-issued photo ID.
      </p>

      <Alert variant="info" title="Tips">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>Ensure the barcode and text are clearly visible</li>
          <li>The image should not be blurry or cut off</li>
          <li>If using a passport, you may skip this step</li>
        </ul>
      </Alert>

      <FileUpload
        label="ID Back"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={10 * 1024 * 1024}
        currentFile={data.file_name ? { name: data.file_name as string } : null}
        helperText="Upload a clear photo or scan of the back of your ID"
      />
    </div>
  );
}
