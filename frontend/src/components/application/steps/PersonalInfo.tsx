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
    other_names_used: (data.other_names_used as string) || '',
    no_other_names: (data.no_other_names as boolean) || false,
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

  const [ageError, setAgeError] = useState<string | null>(null);

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

  // Validate age when DOB changes
  useEffect(() => {
    if (form.date_of_birth) {
      const birthDate = new Date(form.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        setAgeError('You must be 18 years or older to apply. Please verify your date of birth.');
      } else {
        setAgeError(null);
      }
    }
  }, [form.date_of_birth]);

  const handleChange = (field: string, value: unknown) => {
    const updated = { ...form, [field]: value };
    
    // If checking "no other names", clear the other names field
    if (field === 'no_other_names' && value === true) {
      updated.other_names_used = '';
    }
    
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

  const states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">Please provide your personal information. This information is required for the I-9 form.</p>

      {/* Name Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Legal Name</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input 
            label="First Name" 
            required 
            value={form.first_name} 
            onChange={(e) => handleChange('first_name', e.target.value)} 
          />
          <Input 
            label="Middle Name" 
            value={form.middle_name} 
            onChange={(e) => handleChange('middle_name', e.target.value)}
            helperText="Or middle initial"
          />
          <Input 
            label="Last Name" 
            required 
            value={form.last_name} 
            onChange={(e) => handleChange('last_name', e.target.value)} 
          />
        </div>

        <div className="space-y-2">
          <Input 
            label="Other Names Used" 
            value={form.other_names_used} 
            onChange={(e) => handleChange('other_names_used', e.target.value)} 
            placeholder="Maiden name or other names (if applicable)"
            helperText="Required for I-9 verification - include maiden name and any other last names used"
            disabled={form.no_other_names}
            required={!form.no_other_names}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.no_other_names}
              onChange={(e) => handleChange('no_other_names', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
            />
            <span className="text-sm text-slate">I have no other names to report</span>
          </label>
        </div>
      </div>

      {/* Personal Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Personal Details</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input 
            label="Date of Birth" 
            type="date" 
            required 
            value={form.date_of_birth} 
            onChange={(e) => handleChange('date_of_birth', e.target.value)}
            error={ageError || undefined}
          />
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
          <Select 
            label="Gender" 
            value={form.gender} 
            onChange={(e) => handleChange('gender', e.target.value)} 
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
              { value: 'prefer_not', label: 'Prefer not to say' },
            ]} 
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Current Address</h3>
        
        <Input 
          label="Street Address" 
          required 
          value={form.address_line1} 
          onChange={(e) => handleChange('address_line1', e.target.value)} 
          placeholder="123 Main Street" 
        />
        <Input 
          label="Apt, Suite, Unit (optional)" 
          value={form.address_line2} 
          onChange={(e) => handleChange('address_line2', e.target.value)} 
          placeholder="Apt 4B" 
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input 
            label="City" 
            required 
            value={form.city} 
            onChange={(e) => handleChange('city', e.target.value)} 
          />
          <Select
            label="State"
            required
            value={form.state}
            onChange={(e) => handleChange('state', e.target.value)}
            options={states.map(s => ({ value: s, label: s }))}
          />
          <Input 
            label="ZIP Code" 
            required 
            value={form.zip} 
            onChange={(e) => handleChange('zip', e.target.value)} 
            placeholder="12345" 
            maxLength={10} 
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Contact Information</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input 
            label="Phone" 
            type="tel" 
            required 
            value={form.phone} 
            onChange={(e) => handleChange('phone', e.target.value)} 
            placeholder="(555) 123-4567" 
          />
          <Input 
            label="Alternate Phone" 
            type="tel" 
            value={form.alt_phone} 
            onChange={(e) => handleChange('alt_phone', e.target.value)} 
          />
        </div>

        <Input 
          label="Email" 
          type="email" 
          required 
          value={form.email} 
          onChange={(e) => handleChange('email', e.target.value)} 
        />
      </div>
    </div>
  );
}
