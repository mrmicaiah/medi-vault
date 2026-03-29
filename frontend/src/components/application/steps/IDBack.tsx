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
  const [fileName, setFileName] = useState((data.file_name as string) || '');

  const handleFileSelect = (file: File) => {
    setFileName(file.name);
    onChange?.();
    onSave({ file_name: file.name, file_size: file.size, file });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Now upload the back of your ID. This helps us verify the barcode and additional information.
      </p>

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
        currentFile={fileName ? { name: fileName } : null}
        helperText="Upload a clear photo or scan of the back of your ID"
      />
    </div>
  );
}
