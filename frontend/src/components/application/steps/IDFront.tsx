import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function IDFront({ data, onSave }: StepProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    onSave({ file_name: selectedFile.name, file_size: selectedFile.size, file: selectedFile });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload the front of your government-issued photo ID (driver's license, state ID, or passport).
      </p>

      <Alert variant="info" title="Photo ID Requirements">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>Must be a government-issued photo ID</li>
          <li>ID must not be expired</li>
          <li>Photo and text must be clearly visible</li>
          <li>Ensure there is no glare or obstruction</li>
        </ul>
      </Alert>

      <FileUpload
        label="ID Front"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={10 * 1024 * 1024}
        currentFile={data.file_name ? { name: data.file_name as string } : null}
        helperText="Upload a clear photo or scan of the front of your ID"
      />
    </div>
  );
}
