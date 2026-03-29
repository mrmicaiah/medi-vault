import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function Reference1({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    ref1_name: (data.ref1_name as string) || '',
    ref1_relationship: (data.ref1_relationship as string) || '',
    ref1_company: (data.ref1_company as string) || '',
    ref1_title: (data.ref1_title as string) || '',
    ref1_phone: (data.ref1_phone as string) || '',
    ref1_email: (data.ref1_email as string) || '',
    ref1_years_known: (data.ref1_years_known as string) || '',
  });

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray">
        Provide a professional reference. This should be someone who can speak to your work ethic and abilities.
      </p>

      <Input label="Full Name" required value={form.ref1_name} onChange={(e) => handleChange('ref1_name', e.target.value)} />

      <Select
        label="Relationship"
        required
        value={form.ref1_relationship}
        onChange={(e) => handleChange('ref1_relationship', e.target.value)}
        options={[
          { value: 'supervisor', label: 'Former Supervisor' },
          { value: 'coworker', label: 'Coworker' },
          { value: 'mentor', label: 'Mentor / Instructor' },
          { value: 'professional', label: 'Professional Contact' },
          { value: 'other', label: 'Other' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Company / Organization" value={form.ref1_company} onChange={(e) => handleChange('ref1_company', e.target.value)} />
        <Input label="Title" value={form.ref1_title} onChange={(e) => handleChange('ref1_title', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Phone" type="tel" required value={form.ref1_phone} onChange={(e) => handleChange('ref1_phone', e.target.value)} />
        <Input label="Email" type="email" value={form.ref1_email} onChange={(e) => handleChange('ref1_email', e.target.value)} />
      </div>

      <Input label="Years Known" type="number" value={form.ref1_years_known} onChange={(e) => handleChange('ref1_years_known', e.target.value)} placeholder="e.g., 3" />
    </div>
  );
}
