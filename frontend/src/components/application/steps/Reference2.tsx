import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function Reference2({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    ref2_name: (data.ref2_name as string) || '',
    ref2_relationship: (data.ref2_relationship as string) || '',
    ref2_company: (data.ref2_company as string) || '',
    ref2_title: (data.ref2_title as string) || '',
    ref2_phone: (data.ref2_phone as string) || '',
    ref2_email: (data.ref2_email as string) || '',
    ref2_years_known: (data.ref2_years_known as string) || '',
  });

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray">
        Provide a second professional reference, different from the first.
      </p>

      <Input label="Full Name" required value={form.ref2_name} onChange={(e) => handleChange('ref2_name', e.target.value)} />

      <Select
        label="Relationship"
        required
        value={form.ref2_relationship}
        onChange={(e) => handleChange('ref2_relationship', e.target.value)}
        options={[
          { value: 'supervisor', label: 'Former Supervisor' },
          { value: 'coworker', label: 'Coworker' },
          { value: 'mentor', label: 'Mentor / Instructor' },
          { value: 'professional', label: 'Professional Contact' },
          { value: 'other', label: 'Other' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Company / Organization" value={form.ref2_company} onChange={(e) => handleChange('ref2_company', e.target.value)} />
        <Input label="Title" value={form.ref2_title} onChange={(e) => handleChange('ref2_title', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Phone" type="tel" required value={form.ref2_phone} onChange={(e) => handleChange('ref2_phone', e.target.value)} />
        <Input label="Email" type="email" value={form.ref2_email} onChange={(e) => handleChange('ref2_email', e.target.value)} />
      </div>

      <Input label="Years Known" type="number" value={form.ref2_years_known} onChange={(e) => handleChange('ref2_years_known', e.target.value)} placeholder="e.g., 2" />
    </div>
  );
}
