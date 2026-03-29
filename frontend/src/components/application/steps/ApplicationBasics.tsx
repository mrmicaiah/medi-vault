import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function ApplicationBasics({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    position_applied: (data.position_applied as string) || '',
    desired_start_date: (data.desired_start_date as string) || '',
    employment_type: (data.employment_type as string) || '',
    how_heard: (data.how_heard as string) || '',
    referral_name: (data.referral_name as string) || '',
  });

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray">Tell us about the position you are applying for.</p>

      <Select
        label="Position Applied For"
        required
        value={form.position_applied}
        onChange={(e) => handleChange('position_applied', e.target.value)}
        options={[
          { value: 'pca', label: 'Personal Care Aide (PCA)' },
          { value: 'hha', label: 'Home Health Aide (HHA)' },
          { value: 'cna', label: 'Certified Nursing Assistant (CNA)' },
          { value: 'rn', label: 'Registered Nurse (RN)' },
          { value: 'lpn', label: 'Licensed Practical Nurse (LPN)' },
          { value: 'other', label: 'Other' },
        ]}
      />

      <Input
        label="Desired Start Date"
        type="date"
        required
        value={form.desired_start_date}
        onChange={(e) => handleChange('desired_start_date', e.target.value)}
      />

      <Select
        label="Employment Type"
        required
        value={form.employment_type}
        onChange={(e) => handleChange('employment_type', e.target.value)}
        options={[
          { value: 'full_time', label: 'Full-Time' },
          { value: 'part_time', label: 'Part-Time' },
          { value: 'per_diem', label: 'Per Diem' },
        ]}
      />

      <Select
        label="How Did You Hear About Us?"
        value={form.how_heard}
        onChange={(e) => handleChange('how_heard', e.target.value)}
        options={[
          { value: 'website', label: 'Company Website' },
          { value: 'indeed', label: 'Indeed' },
          { value: 'referral', label: 'Employee Referral' },
          { value: 'social_media', label: 'Social Media' },
          { value: 'job_fair', label: 'Job Fair' },
          { value: 'other', label: 'Other' },
        ]}
      />

      {form.how_heard === 'referral' && (
        <Input
          label="Referral Name"
          value={form.referral_name}
          onChange={(e) => handleChange('referral_name', e.target.value)}
          placeholder="Name of the person who referred you"
        />
      )}
    </div>
  );
}
