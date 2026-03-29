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

const DOCUMENT_TYPES = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'us_passport', label: 'US Passport' },
  { value: 'naturalization', label: 'Certificate of Naturalization' },
  { value: 'work_authorization', label: 'Work Authorization Card' },
];

export function WorkAuthorization({ data, onSave, onChange }: StepProps) {
  const [form, setForm] = useState({
    worker_type: (data.worker_type as string) || '',
    document_type: (data.document_type as string) || '',
    issuing_authority: (data.issuing_authority as string) || 'United States',
    document_number: (data.document_number as string) || '',
    file_name: (data.file_name as string) || '',
  });

  const handleChange = (field: string, value: string) => {
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

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Upload a document that proves your authorization to work in the United States.
      </p>

      <Alert variant="info" title="Accepted Documents">
        <ul className="mt-1 list-disc pl-4 space-y-1">
          <li>Birth Certificate (US)</li>
          <li>US Passport</li>
          <li>Certificate of Naturalization</li>
          <li>Work Authorization Card</li>
        </ul>
      </Alert>

      <Select
        label="Worker Type"
        required
        value={form.worker_type}
        onChange={(e) => handleChange('worker_type', e.target.value)}
        options={[
          { value: 'employee', label: 'Employee (W-2)' },
          { value: 'contractor', label: 'Independent Contractor (1099)' },
        ]}
      />

      <Select
        label="Document Type"
        required
        value={form.document_type}
        onChange={(e) => handleChange('document_type', e.target.value)}
        options={DOCUMENT_TYPES}
      />

      <Input
        label="Issuing Authority"
        required
        value={form.issuing_authority}
        onChange={(e) => handleChange('issuing_authority', e.target.value)}
        placeholder="United States"
      />

      <Input
        label="Document ID Number"
        required
        value={form.document_number}
        onChange={(e) => handleChange('document_number', e.target.value)}
        placeholder="Enter the document number"
      />

      <FileUpload
        label="Work Authorization Document"
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={10 * 1024 * 1024}
        currentFile={form.file_name ? { name: form.file_name } : null}
        helperText="Upload a clear photo or scan of your work authorization document"
      />
    </div>
  );
}
