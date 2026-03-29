import React, { useState } from 'react';
import { FileUpload } from '../../ui/FileUpload';
import { Input, Select } from '../../ui/Input';
import { Alert } from '../../ui/Alert';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onFileSelect?: (file: File | null) => void;
  pendingFile?: File | null;
  onChange?: () => void;
  saving: boolean;
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'District of Columbia' },
];

export function IDFront({ data, onSave, onFileSelect, pendingFile, onChange }: StepProps) {
  const [form, setForm] = useState({
    skip: (data.skip as boolean) || false,
    id_type: (data.id_type as string) || '',
    id_number: (data.id_number as string) || '',
    issuing_state: (data.issuing_state as string) || '',
    expiration_date: (data.expiration_date as string) || '',
  });

  const displayFileName = pendingFile?.name || (data.file_name as string) || '';

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onChange?.();
    onSave(updated);
  };

  const handleFileSelect = (file: File) => {
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
        Upload the front of your government-issued photo ID.
      </p>

      <div className="flex items-center gap-3 rounded-lg border border-border bg-gray-50 p-4">
        <input
          type="checkbox"
          id="skip_id_front"
          checked={form.skip}
          onChange={(e) => handleSkip(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
        />
        <label htmlFor="skip_id_front" className="text-sm text-slate">
          I'll upload this later from my dashboard
        </label>
      </div>

      {!form.skip && (
        <>
          <Alert variant="info" title="Photo ID Requirements">
            <ul className="mt-1 list-disc pl-4 space-y-1">
              <li>Must be a government-issued photo ID</li>
              <li>ID must not be expired</li>
              <li>Photo and text must be clearly visible</li>
              <li>Ensure there is no glare or obstruction</li>
            </ul>
          </Alert>

          <Select
            label="ID Type"
            required
            value={form.id_type}
            onChange={(e) => handleChange('id_type', e.target.value)}
            options={[
              { value: 'drivers_license', label: "Driver's License" },
              { value: 'state_id', label: 'State ID' },
              { value: 'passport', label: 'US Passport' },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="ID Number"
              required
              value={form.id_number}
              onChange={(e) => handleChange('id_number', e.target.value)}
              placeholder="Enter your ID number"
            />

            <Select
              label="Issuing State"
              required
              value={form.issuing_state}
              onChange={(e) => handleChange('issuing_state', e.target.value)}
              options={US_STATES}
            />
          </div>

          <Input
            label="Expiration Date"
            type="date"
            required
            value={form.expiration_date}
            onChange={(e) => handleChange('expiration_date', e.target.value)}
          />

          <FileUpload
            label="Front of ID"
            onFileSelect={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            maxSize={10 * 1024 * 1024}
            currentFile={displayFileName ? { name: displayFileName } : null}
            helperText="Upload a clear photo or scan of the front of your ID"
          />

          {pendingFile && (
            <p className="text-xs text-gray-500">
              File will be uploaded when you click "Next"
            </p>
          )}
        </>
      )}

      {form.skip && (
        <Alert variant="warning" title="Required for Hiring">
          A government-issued photo ID is required before you can be hired.
          You can upload it from your dashboard at any time.
        </Alert>
      )}
    </div>
  );
}
