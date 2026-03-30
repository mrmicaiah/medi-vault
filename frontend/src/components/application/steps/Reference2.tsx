import React, { useState } from 'react';
import { Input } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function Reference2({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    // Reference 2 (Required)
    ref2_name: (data.ref2_name as string) || '',
    ref2_relationship: (data.ref2_relationship as string) || '',
    ref2_phone: (data.ref2_phone as string) || '',
    ref2_email: (data.ref2_email as string) || '',
    ref2_years_known: (data.ref2_years_known as string) || '',
    
    // Reference 3 (Optional)
    has_third_reference: (data.has_third_reference as boolean) || false,
    ref3_name: (data.ref3_name as string) || '',
    ref3_relationship: (data.ref3_relationship as string) || '',
    ref3_phone: (data.ref3_phone as string) || '',
    ref3_email: (data.ref3_email as string) || '',
    ref3_years_known: (data.ref3_years_known as string) || '',
    
    // Consent
    consent_to_contact: (data.consent_to_contact as string) || '',
  });

  const handleChange = (field: string, value: unknown) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-6">
      {/* Reference 2 */}
      <div>
        <h3 className="text-lg font-semibold text-navy">Reference 2</h3>
        <p className="text-sm text-gray mt-1">
          Provide a second reference, different from the first.
        </p>
      </div>

      <div className="space-y-4 p-4 rounded-lg border border-border">
        <Input 
          label="Full Name" 
          required 
          value={form.ref2_name} 
          onChange={(e) => handleChange('ref2_name', e.target.value)}
          placeholder="Jane Doe" 
        />

        <Input 
          label="Relationship" 
          required 
          value={form.ref2_relationship} 
          onChange={(e) => handleChange('ref2_relationship', e.target.value)}
          placeholder="e.g., Former Supervisor, Coworker, Friend"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input 
            label="Phone" 
            type="tel" 
            required 
            value={form.ref2_phone} 
            onChange={(e) => handleChange('ref2_phone', e.target.value)}
            placeholder="(555) 123-4567" 
          />
          <Input 
            label="Email" 
            type="email" 
            value={form.ref2_email} 
            onChange={(e) => handleChange('ref2_email', e.target.value)} 
          />
        </div>

        <Input 
          label="How long have you known this person?" 
          value={form.ref2_years_known} 
          onChange={(e) => handleChange('ref2_years_known', e.target.value)} 
          placeholder="e.g., 2 years" 
        />
      </div>

      {/* Reference 3 (Optional) */}
      <div className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.has_third_reference}
            onChange={(e) => handleChange('has_third_reference', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
          />
          <span className="text-sm font-medium text-slate">I would like to add a third reference (optional)</span>
        </label>

        {form.has_third_reference && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-gray-50">
            <h4 className="text-sm font-semibold text-navy">Reference 3 (Optional)</h4>
            
            <Input 
              label="Full Name" 
              value={form.ref3_name} 
              onChange={(e) => handleChange('ref3_name', e.target.value)}
              placeholder="Full name" 
            />

            <Input 
              label="Relationship" 
              value={form.ref3_relationship} 
              onChange={(e) => handleChange('ref3_relationship', e.target.value)}
              placeholder="e.g., Former Supervisor, Coworker, Friend"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input 
                label="Phone" 
                type="tel" 
                value={form.ref3_phone} 
                onChange={(e) => handleChange('ref3_phone', e.target.value)}
                placeholder="(555) 123-4567" 
              />
              <Input 
                label="Email" 
                type="email" 
                value={form.ref3_email} 
                onChange={(e) => handleChange('ref3_email', e.target.value)} 
              />
            </div>

            <Input 
              label="How long have you known this person?" 
              value={form.ref3_years_known} 
              onChange={(e) => handleChange('ref3_years_known', e.target.value)} 
              placeholder="e.g., 5 years" 
            />
          </div>
        )}
      </div>

      {/* Consent to Contact */}
      <div className="space-y-3 p-4 rounded-lg border-2 border-maroon-subtle bg-maroon-subtle/30">
        <label className="block text-sm font-medium text-slate">
          Do you consent to us contacting the references you provided? <span className="text-error">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="consent_to_contact"
              value="yes"
              checked={form.consent_to_contact === 'yes'}
              onChange={(e) => handleChange('consent_to_contact', e.target.value)}
              className="h-4 w-4 mt-0.5 text-maroon focus:ring-maroon"
            />
            <span className="text-sm text-slate">Yes — You may contact the references listed</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="consent_to_contact"
              value="no"
              checked={form.consent_to_contact === 'no'}
              onChange={(e) => handleChange('consent_to_contact', e.target.value)}
              className="h-4 w-4 mt-0.5 text-maroon focus:ring-maroon"
            />
            <span className="text-sm text-slate">No — You MAY NOT contact these references</span>
          </label>
        </div>
        {form.consent_to_contact === 'no' && (
          <p className="text-sm text-warning mt-2">
            Note: We may not be able to proceed with your application without reference verification.
          </p>
        )}
      </div>
    </div>
  );
}
