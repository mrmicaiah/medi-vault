import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function WorkAuthorization({ data, onSave }: StepProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    onSave({ file_name: selectedFile.name, file_size: selectedFile.size, file: selectedFile });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload your work authorization document (e.g., I-9, Employment Eligibility Verification).
      </p>

      <Alert variant="info" title="Tips for uploading">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>Ensure the document is current and not expired</li>
          <li>All text must be clearly readable</li>
          <li>Accepted formats: PDF, JPG, PNG</li>
          <li>Maximum file size: 10MB</li>
        </ul>
      </Alert>

      <FileUpload
        label="Work Authorization Document"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={10 * 1024 * 1024}
        currentFile={data.file_name ? { name: data.file_name as string } : null}
        helperText="Upload your Employment Eligibility Verification form or equivalent document"
      />
    </div>
  );
}
