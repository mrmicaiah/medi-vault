import React, { useState, useEffect } from 'react';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Input';
import { SSNInput } from '../../ui/SSNInput';
import { api } from '../../../lib/api';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onChange?: () => void;
  saving: boolean;
}

export function PersonalInfo({ data, onSave, onChange }: StepProps) {
  const [form, setForm] = useState({
    first_name: (data.first_name as string) || '',
    middle_name: (data.middle_name as string) || '',
    last_name: (data.last_name as string) || '',
    date_of_birth: (data.date_of_birth as string) || '',
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

  // SSN is stored separately via encrypted endpoint
  const [ssn, setSSN] = useState('');
  const [ssnSaved, setSSNSaved] = useState(false);
  const [ssnLastFour, setSSNLastFour] = useState((data.ssn_last_four as string) || '');
  const [savingSSN, setSavingSSN] = useState(false);
  const [ssnError, setSSNError] = useState<string | null>(null);

  // Check if SSN was already provided
  useEffect(() => {
    const checkSSN = async () => {
      try {
        const res = await api.get<{ ssn_provided: boolean; ssn_last_four: string | null }>('/sensitive/ssn');
        if (res.ssn_provided && res.ssn_last_four) {
          setSSNSaved(true);
          setSSNLastFour(res.ssn_last_four);
        }
      } catch {
        // SSN not provided yet, that's fine
      }
    };
    checkSSN();
  }, []);

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onChange?.();
    // Include ssn_last_four in the saved data for display purposes
    onSave({ ...updated, ssn_last_four: ssnLastFour });
  };

  const handleSSNChange = (value: string) => {
    setSSN(value);
    setSSNError(null);
    onChange?.();
  };

  const handleSSNBlur = async () => {
    // Only save if we have a complete 9-digit SSN
    if (ssn.length !== 9) {
      if (ssn.length > 0 && ssn.length < 9) {
        setSSNError('SSN must be exactly 9 digits');
      }
      return;
    }

    setSavingSSN(true);
    setSSNError(null);

    try {
      const res = await api.post<{ ssn_last_four: string }>('/sensitive/ssn', { ssn });
      setSSNSaved(true);
      setSSNLastFour(res.ssn_last_four);
      // Update form data with last 4 for reference
      onSave({ ...form, ssn_last_four: res.ssn_last_four });
    } catch (err) {
      setSSNError(err instanceof Error ? err.message : 'Failed to save SSN');
    } finally {
      setSavingSSN(false);
    }
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
        <div>
          {ssnSaved ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate">
                Social Security Number <span className="text-maroon">*</span>
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-success bg-success-bg px-3 py-2.5">
                <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-mono text-sm">***-**-{ssnLastFour}</span>
                <span className="ml-2 text-xs text-success">Saved securely</span>
              </div>
              <button
                type="button"
                onClick={() => { setSSNSaved(false); setSSN(''); }}
                className="mt-1 text-xs text-gray hover:text-slate"
              >
                Update SSN
              </button>
            </div>
          ) : (
            <SSNInput
              value={ssn}
              onChange={handleSSNChange}
              onBlur={handleSSNBlur}
              disabled={savingSSN}
              error={ssnError || undefined}
              required
            />
          )}
        </div>
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
