import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function Education({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    highest_education: (data.highest_education as string) || '',
    school_name: (data.school_name as string) || '',
    school_city: (data.school_city as string) || '',
    school_state: (data.school_state as string) || '',
    graduation_year: (data.graduation_year as string) || '',
    degree_field: (data.degree_field as string) || '',
    additional_certifications: (data.additional_certifications as string) || '',
  });

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray">Please provide your educational background.</p>

      <Select
        label="Highest Level of Education"
        required
        value={form.highest_education}
        onChange={(e) => handleChange('highest_education', e.target.value)}
        options={[
          { value: 'high_school', label: 'High School / GED' },
          { value: 'some_college', label: 'Some College' },
          { value: 'associate', label: "Associate's Degree" },
          { value: 'bachelor', label: "Bachelor's Degree" },
          { value: 'master', label: "Master's Degree" },
          { value: 'doctorate', label: 'Doctorate' },
          { value: 'trade', label: 'Trade / Vocational School' },
        ]}
      />

      <Input
        label="School Name"
        required
        value={form.school_name}
        onChange={(e) => handleChange('school_name', e.target.value)}
        placeholder="Name of school or institution"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="City" value={form.school_city} onChange={(e) => handleChange('school_city', e.target.value)} />
        <Input label="State" value={form.school_state} onChange={(e) => handleChange('school_state', e.target.value)} maxLength={2} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Year Graduated" type="number" value={form.graduation_year} onChange={(e) => handleChange('graduation_year', e.target.value)} placeholder="2020" />
        <Input label="Field of Study / Degree" value={form.degree_field} onChange={(e) => handleChange('degree_field', e.target.value)} placeholder="e.g., Nursing, CNA Program" />
      </div>

      <Input
        label="Additional Certifications or Training"
        value={form.additional_certifications}
        onChange={(e) => handleChange('additional_certifications', e.target.value)}
        placeholder="List any additional certifications"
      />
    </div>
  );
}
