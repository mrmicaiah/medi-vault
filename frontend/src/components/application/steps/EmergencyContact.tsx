import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function EmergencyContact({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    ec_first_name: (data.ec_first_name as string) || '',
    ec_last_name: (data.ec_last_name as string) || '',
    ec_relationship: (data.ec_relationship as string) || '',
    ec_phone: (data.ec_phone as string) || '',
    ec_alt_phone: (data.ec_alt_phone as string) || '',
    ec_email: (data.ec_email as string) || '',
    ec_address: (data.ec_address as string) || '',
    ec_city: (data.ec_city as string) || '',
    ec_state: (data.ec_state as string) || '',
    ec_zip: (data.ec_zip as string) || '',
  });

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray">
        Please provide an emergency contact who can be reached in case of an emergency.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="First Name" required value={form.ec_first_name} onChange={(e) => handleChange('ec_first_name', e.target.value)} />
        <Input label="Last Name" required value={form.ec_last_name} onChange={(e) => handleChange('ec_last_name', e.target.value)} />
      </div>

      <Select
        label="Relationship"
        required
        value={form.ec_relationship}
        onChange={(e) => handleChange('ec_relationship', e.target.value)}
        options={[
          { value: 'spouse', label: 'Spouse' },
          { value: 'parent', label: 'Parent' },
          { value: 'sibling', label: 'Sibling' },
          { value: 'child', label: 'Child' },
          { value: 'friend', label: 'Friend' },
          { value: 'other', label: 'Other' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Phone" type="tel" required value={form.ec_phone} onChange={(e) => handleChange('ec_phone', e.target.value)} placeholder="(555) 123-4567" />
        <Input label="Alternate Phone" type="tel" value={form.ec_alt_phone} onChange={(e) => handleChange('ec_alt_phone', e.target.value)} />
      </div>

      <Input label="Email" type="email" value={form.ec_email} onChange={(e) => handleChange('ec_email', e.target.value)} />

      <Input label="Address" value={form.ec_address} onChange={(e) => handleChange('ec_address', e.target.value)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="City" value={form.ec_city} onChange={(e) => handleChange('ec_city', e.target.value)} />
        <Input label="State" value={form.ec_state} onChange={(e) => handleChange('ec_state', e.target.value)} maxLength={2} />
        <Input label="ZIP Code" value={form.ec_zip} onChange={(e) => handleChange('ec_zip', e.target.value)} maxLength={10} />
      </div>
    </div>
  );
}
