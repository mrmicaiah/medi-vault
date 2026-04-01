import React, { useState } from 'react';
import { Input, Select, Textarea } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function ApplicationBasics({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    // Position & Employment Type
    position_applied: (data.position_applied as string) || '',
    employment_type: (data.employment_type as string) || '',
    desired_hourly_rate: (data.desired_hourly_rate as string) || '',
    desired_start_date: (data.desired_start_date as string) || '',
    
    // Legal Questions
    is_18_or_older: (data.is_18_or_older as string) || '',
    convicted_violent_crime: (data.convicted_violent_crime as string) || '',
    background_check_consent: (data.background_check_consent as string) || '',
    
    // Citizenship & Work Authorization
    citizenship_status: (data.citizenship_status as string) || '',
    eligible_to_work: (data.eligible_to_work as string) || '',
    
    // Languages - English is always primary
    speaks_other_languages: (data.speaks_other_languages as string) || '',
    other_languages: (data.other_languages as string) || '',
    
    // How heard & Previous Employment
    how_heard: (data.how_heard as string) || '',
    referral_name: (data.referral_name as string) || '',
    worked_for_eveready_before: (data.worked_for_eveready_before as string) || '',
    previous_eveready_details: (data.previous_eveready_details as string) || '',
  });

  const handleChange = (field: string, value: unknown) => {
    const updated = { ...form, [field]: value };
    
    // If they say "no" to other languages, clear the text field
    if (field === 'speaks_other_languages' && value === 'no') {
      updated.other_languages = '';
    }
    
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">Tell us about the position you're applying for and answer a few required questions.</p>

      {/* Position Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Position Information</h3>
        
        <Select
          label="Position Applied For"
          required
          value={form.position_applied}
          onChange={(e) => handleChange('position_applied', e.target.value)}
          options={[
            { value: 'pca', label: 'Personal Care Aide (PCA)' },
            { value: 'hha', label: 'Home Health Aide (HHA)' },
            { value: 'cna', label: 'Certified Nursing Assistant (CNA)' },
            { value: 'lpn', label: 'Licensed Practical Nurse (LPN)' },
            { value: 'rn', label: 'Registered Nurse (RN)' },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Employment Type"
            required
            value={form.employment_type}
            onChange={(e) => handleChange('employment_type', e.target.value)}
            options={[
              { value: 'full_time', label: 'Full-Time' },
              { value: 'part_time', label: 'Part-Time' },
              { value: 'fill_in', label: 'Fill In When Available' },
              { value: 'live_in', label: 'Live-In Provider' },
            ]}
          />
          <Input
            label="Desired Hourly Rate"
            type="number"
            required
            value={form.desired_hourly_rate}
            onChange={(e) => handleChange('desired_hourly_rate', e.target.value)}
            placeholder="e.g., 15.00"
          />
        </div>

        <Input
          label="Desired Start Date"
          type="date"
          required
          value={form.desired_start_date}
          onChange={(e) => handleChange('desired_start_date', e.target.value)}
        />
      </div>

      {/* Legal Requirements */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Legal Requirements</h3>
        
        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Are you 18 years of age or older? <span className="text-error">*</span>
          </label>
          <div className="flex gap-4">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="is_18_or_older"
                  value={val}
                  checked={form.is_18_or_older === val}
                  onChange={(e) => handleChange('is_18_or_older', e.target.value)}
                  className="h-4 w-4 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
          {form.is_18_or_older === 'no' && (
            <p className="mt-2 text-sm text-error">You must be 18 years or older to apply for this position.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Have you ever been convicted of a violent crime? <span className="text-error">*</span>
          </label>
          <div className="flex gap-4">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="convicted_violent_crime"
                  value={val}
                  checked={form.convicted_violent_crime === val}
                  onChange={(e) => handleChange('convicted_violent_crime', e.target.value)}
                  className="h-4 w-4 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            A background check is required for employment. <span className="text-error">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="background_check_consent"
                value="consent"
                checked={form.background_check_consent === 'consent'}
                onChange={(e) => handleChange('background_check_consent', e.target.value)}
                className="h-4 w-4 text-maroon focus:ring-maroon"
              />
              <span className="text-sm text-slate">I consent to a background check</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="background_check_consent"
                value="no_consent"
                checked={form.background_check_consent === 'no_consent'}
                onChange={(e) => handleChange('background_check_consent', e.target.value)}
                className="h-4 w-4 text-maroon focus:ring-maroon"
              />
              <span className="text-sm text-slate">I DO NOT consent to a background check</span>
            </label>
          </div>
          {form.background_check_consent === 'no_consent' && (
            <p className="mt-2 text-sm text-error">A background check is required for employment. You cannot proceed without consent.</p>
          )}
        </div>
      </div>

      {/* Citizenship & Work Authorization */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Citizenship & Work Authorization</h3>
        
        <Select
          label="Citizenship Status"
          required
          value={form.citizenship_status}
          onChange={(e) => handleChange('citizenship_status', e.target.value)}
          options={[
            { value: 'us_citizen', label: 'A citizen of the United States' },
            { value: 'us_national', label: 'A noncitizen national of the United States' },
            { value: 'permanent_resident', label: 'A lawful permanent resident' },
            { value: 'authorized_alien', label: 'An alien authorized to work' },
          ]}
        />

        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Are you eligible for employment in the United States? <span className="text-error">*</span>
          </label>
          <div className="flex gap-4">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="eligible_to_work"
                  value={val}
                  checked={form.eligible_to_work === val}
                  onChange={(e) => handleChange('eligible_to_work', e.target.value)}
                  className="h-4 w-4 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray">Note: Documentation required (Birth Certificate, Passport, or Work Visa)</p>
        </div>
      </div>

      {/* Languages */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Languages</h3>
        
        <div className="rounded-lg bg-slate-50 border border-border p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-maroon text-white text-xs font-medium">✓</div>
            <span className="text-sm font-medium text-slate">English</span>
            <span className="text-xs text-gray">(Primary Language)</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Do you speak any other languages? <span className="text-error">*</span>
          </label>
          <div className="flex gap-4">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="speaks_other_languages"
                  value={val}
                  checked={form.speaks_other_languages === val}
                  onChange={(e) => handleChange('speaks_other_languages', e.target.value)}
                  className="h-4 w-4 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </div>

        {form.speaks_other_languages === 'yes' && (
          <Input
            label="What other languages do you speak?"
            value={form.other_languages}
            onChange={(e) => handleChange('other_languages', e.target.value)}
            placeholder="e.g., Spanish, French, Tagalog"
          />
        )}
      </div>

      {/* How Did You Hear About Us */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Additional Information</h3>
        
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

        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Have you ever worked for Eveready HomeCare before? <span className="text-error">*</span>
          </label>
          <div className="flex gap-4">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="worked_for_eveready_before"
                  value={val}
                  checked={form.worked_for_eveready_before === val}
                  onChange={(e) => handleChange('worked_for_eveready_before', e.target.value)}
                  className="h-4 w-4 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </div>

        {form.worked_for_eveready_before === 'yes' && (
          <Textarea
            label="Please provide details"
            value={form.previous_eveready_details}
            onChange={(e) => handleChange('previous_eveready_details', e.target.value)}
            placeholder="When did you work here? What position? Why did you leave?"
          />
        )}
      </div>
    </div>
  );
}
