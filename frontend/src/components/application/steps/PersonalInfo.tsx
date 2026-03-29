import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function PersonalInfo({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    first_name: (data.first_name as string) || '',
    middle_name: (data.middle_name as string) || '',
    last_name: (data.last_name as string) || '',
    date_of_birth: (data.date_of_birth as string) || '',
    ssn_last4: (data.ssn_last4 as string) || '',
    gender: (data.gender as string) || '',
    address_line1: (data.address_line1 as string) || '',
    address_line2: (data.address_line2 as string) || '',
    city: (data.city as string) || '',
    state: (data.state as string) || '',
    zip: (data.zip as string) || '',
    phone: (data.phone as string) || '',
    alt_phone: (data.alt_phone as string) || '',
    email: (data.email as string) || '',
  });

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray">Please provide your personal information.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="First Name" required value={form.first_name} onChange={(e) => handleChange('first_name', e.target.value)} />
        <Input label="Middle Name" value={form.middle_name} onChange={(e) => handleChange('middle_name', e.target.value)} />
        <Input label="Last Name" required value={form.last_name} onChange={(e) => handleChange('last_name', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Date of Birth" type="date" required value={form.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} />
        <Input label="Last 4 of SSN" maxLength={4} required value={form.ssn_last4} onChange={(e) => handleChange('ssn_last4', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" />
        <Select label="Gender" value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
          { value: 'prefer_not', label: 'Prefer not to say' },
        ]} />
      </div>

      <Input label="Address Line 1" required value={form.address_line1} onChange={(e) => handleChange('address_line1', e.target.value)} placeholder="Street address" />
      <Input label="Address Line 2" value={form.address_line2} onChange={(e) => handleChange('address_line2', e.target.value)} placeholder="Apt, suite, etc." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="City" required value={form.city} onChange={(e) => handleChange('city', e.target.value)} />
        <Input label="State" required value={form.state} onChange={(e) => handleChange('state', e.target.value)} placeholder="VA" maxLength={2} />
        <Input label="ZIP Code" required value={form.zip} onChange={(e) => handleChange('zip', e.target.value)} placeholder="12345" maxLength={10} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Phone" type="tel" required value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="(555) 123-4567" />
        <Input label="Alternate Phone" type="tel" value={form.alt_phone} onChange={(e) => handleChange('alt_phone', e.target.value)} />
      </div>

      <Input label="Email" type="email" required value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
    </div>
  );
}
