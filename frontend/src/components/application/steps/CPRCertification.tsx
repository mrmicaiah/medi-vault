import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function CPRCertification({ data, onSave }: StepProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    onSave({ file_name: selectedFile.name, file_size: selectedFile.size, file: selectedFile });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload your current CPR/First Aid certification card or certificate.
      </p>

      <Alert variant="info" title="CPR Certification Requirements">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>Must be from an accredited provider (AHA, Red Cross, etc.)</li>
          <li>Certification must be current and not expired</li>
          <li>Both front and back should be visible if it is a card</li>
          <li>If you do not have CPR certification yet, click "Not Yet" to skip</li>
        </ul>
      </Alert>

      <FileUpload
        label="CPR / First Aid Certification"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={10 * 1024 * 1024}
        currentFile={data.file_name ? { name: data.file_name as string } : null}
        helperText="Upload your CPR or First Aid certification"
      />
    </div>
  );
}
