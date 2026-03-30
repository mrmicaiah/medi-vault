import React, { useState } from 'react';
import { Input } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function Reference1({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    ref1_name: (data.ref1_name as string) || '',
    ref1_relationship: (data.ref1_relationship as string) || '',
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-navy">Reference 1</h3>
        <p className="text-sm text-gray mt-1">
          Provide a personal or professional reference. This should be someone who can speak to your character and work ethic.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-info bg-info-bg">
        <p className="text-sm text-info">
          <strong>Note:</strong> We require two personal references. A third reference is optional but recommended.
        </p>
      </div>

      <div className="space-y-4">
        <Input 
          label="Full Name" 
          required 
          value={form.ref1_name} 
          onChange={(e) => handleChange('ref1_name', e.target.value)}
          placeholder="John Smith" 
        />

        <Input 
          label="Relationship" 
          required 
          value={form.ref1_relationship} 
          onChange={(e) => handleChange('ref1_relationship', e.target.value)}
          placeholder="e.g., Former Supervisor, Coworker, Friend"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input 
            label="Phone" 
            type="tel" 
            required 
            value={form.ref1_phone} 
            onChange={(e) => handleChange('ref1_phone', e.target.value)}
            placeholder="(555) 123-4567" 
          />
          <Input 
            label="Email" 
            type="email" 
            value={form.ref1_email} 
            onChange={(e) => handleChange('ref1_email', e.target.value)} 
          />
        </div>

        <Input 
          label="How long have you known this person?" 
          value={form.ref1_years_known} 
          onChange={(e) => handleChange('ref1_years_known', e.target.value)} 
          placeholder="e.g., 3 years" 
        />
      </div>
    </div>
  );
}
