import React, { useState } from 'react';
import { Input, Textarea } from '../../ui/Input';
import { Select } from '../../ui/Input';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function Education({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    // Education
    graduated_high_school: (data.graduated_high_school as string) || '',
    highest_education: (data.highest_education as string) || '',
    school_name: (data.school_name as string) || '',
    graduation_year: (data.graduation_year as string) || '',
    
    // Certifications (multi-select)
    certifications: (data.certifications as string[]) || [],
    
    // Certification Interest (for leads)
    interested_in_hha_certification: (data.interested_in_hha_certification as string) || '',
    interested_in_cpr_certification: (data.interested_in_cpr_certification as string) || '',
    
    // License & Eligibility
    has_cpr_certification: (data.has_cpr_certification as string) || '',
    has_drivers_license: (data.has_drivers_license as string) || '',
    has_tb_test: (data.has_tb_test as string) || '',
    eligible_to_work: (data.eligible_to_work as string) || '',
    
    // Skills & Capabilities
    will_travel_30_min: (data.will_travel_30_min as string) || '',
    can_do_catheter_care: (data.can_do_catheter_care as string) || '',
    can_do_vital_signs: (data.can_do_vital_signs as string) || '',
    will_work_bed_bound: (data.will_work_bed_bound as string) || '',
    
    // Additional Skills
    additional_skills: (data.additional_skills as string) || '',
  });

  const certificationOptions = [
    { value: 'hha', label: 'HHA Certificate' },
    { value: 'cna', label: 'CNA License' },
    { value: 'pca', label: 'PCA Certificate' },
    { value: 'lpn', label: 'LPN License' },
    { value: 'rn', label: 'RN License' },
    { value: 'none', label: 'I currently hold no certifications' },
  ];

  const handleChange = (field: string, value: unknown) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  const toggleCertification = (cert: string) => {
    let updated: string[];
    
    if (cert === 'none') {
      // If selecting "none", clear all other selections
      updated = form.certifications.includes('none') ? [] : ['none'];
    } else {
      // If selecting any other cert, remove "none" if present
      const withoutNone = form.certifications.filter(c => c !== 'none');
      updated = withoutNone.includes(cert)
        ? withoutNone.filter(c => c !== cert)
        : [...withoutNone, cert];
    }
    
    handleChange('certifications', updated);
  };

  // Check if user has no certifications or no HHA specifically
  const hasNoCertifications = form.certifications.includes('none');
  const hasNoHHA = !form.certifications.includes('hha') && !form.certifications.includes('cna') && !form.certifications.includes('lpn') && !form.certifications.includes('rn');
  const hasNoCPR = form.has_cpr_certification === 'no';

  const RadioGroup = ({ name, label, value, required = false, helperText }: { name: string; label: string; value: string; required?: boolean; helperText?: string }) => (
    <div>
      <label className="block text-sm font-medium text-slate mb-2">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <div className="flex gap-4">
        {['yes', 'no'].map((val) => (
          <label key={val} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={val}
              checked={value === val}
              onChange={(e) => handleChange(name, e.target.value)}
              className="h-4 w-4 text-maroon focus:ring-maroon"
            />
            <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
          </label>
        ))}
      </div>
      {helperText && <p className="mt-1 text-xs text-gray">{helperText}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">Please provide your educational background and certifications.</p>

      {/* Education */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Education</h3>
        
        <RadioGroup 
          name="graduated_high_school" 
          label="Did you graduate High School?" 
          value={form.graduated_high_school}
          required
        />

        <Select
          label="Highest Level of Education"
          required
          value={form.highest_education}
          onChange={(e) => handleChange('highest_education', e.target.value)}
          options={[
            { value: 'some_high_school', label: 'Some High School' },
            { value: 'high_school', label: 'High School / GED' },
            { value: 'some_college', label: 'Some College' },
            { value: 'associate', label: "Associate's Degree" },
            { value: 'bachelor', label: "Bachelor's Degree" },
            { value: 'master', label: "Master's Degree" },
            { value: 'doctorate', label: 'Doctorate' },
            { value: 'trade', label: 'Trade / Vocational School' },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="School Name"
            value={form.school_name}
            onChange={(e) => handleChange('school_name', e.target.value)}
            placeholder="Name of school or institution"
          />
          <Input 
            label="Year Graduated" 
            type="number" 
            value={form.graduation_year} 
            onChange={(e) => handleChange('graduation_year', e.target.value)} 
            placeholder="2020" 
          />
        </div>
      </div>

      {/* Certifications */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Certifications</h3>
        
        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Select all certifications you hold <span className="text-error">*</span>
          </label>
          <div className="space-y-2">
            {certificationOptions.map((cert) => (
              <label key={cert.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.certifications.includes(cert.value)}
                  onChange={() => toggleCertification(cert.value)}
                  className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{cert.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* HHA Certification Interest - Show if no certifications or no HHA-level cert */}
        {(hasNoCertifications || hasNoHHA) && form.certifications.length > 0 && (
          <div className="p-4 rounded-lg border-2 border-maroon-subtle bg-maroon-subtle/20">
            <label className="block text-sm font-medium text-slate mb-2">
              Would you be interested in getting certified through our agency's HHA training program?
            </label>
            <p className="text-xs text-gray mb-3">
              We offer HHA certification classes for aides who want to advance their careers. Training is provided at no cost for qualifying candidates.
            </p>
            <div className="flex gap-4">
              {[
                { value: 'yes', label: 'Yes, I\'m interested!' },
                { value: 'maybe', label: 'Maybe, tell me more' },
                { value: 'no', label: 'No, not at this time' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="interested_in_hha_certification"
                    value={opt.value}
                    checked={form.interested_in_hha_certification === opt.value}
                    onChange={(e) => handleChange('interested_in_hha_certification', e.target.value)}
                    className="h-4 w-4 text-maroon focus:ring-maroon"
                  />
                  <span className="text-sm text-slate">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <RadioGroup 
          name="has_cpr_certification" 
          label="Do you hold CPR certification?" 
          value={form.has_cpr_certification}
          required
        />

        {/* CPR Certification Interest - Show if they don't have CPR */}
        {hasNoCPR && (
          <div className="p-4 rounded-lg border-2 border-maroon-subtle bg-maroon-subtle/20">
            <label className="block text-sm font-medium text-slate mb-2">
              Would you be interested in getting CPR certified through our agency?
            </label>
            <p className="text-xs text-gray mb-3">
              We offer CPR certification classes for our aides. This is often required for client assignments.
            </p>
            <div className="flex gap-4">
              {[
                { value: 'yes', label: 'Yes, I\'m interested!' },
                { value: 'maybe', label: 'Maybe, tell me more' },
                { value: 'no', label: 'No, not at this time' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="interested_in_cpr_certification"
                    value={opt.value}
                    checked={form.interested_in_cpr_certification === opt.value}
                    onChange={(e) => handleChange('interested_in_cpr_certification', e.target.value)}
                    className="h-4 w-4 text-maroon focus:ring-maroon"
                  />
                  <span className="text-sm text-slate">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <RadioGroup 
          name="has_tb_test" 
          label="Have you had a TB test in the past year?" 
          value={form.has_tb_test}
        />
      </div>

      {/* License & Eligibility */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">License & Eligibility</h3>
        
        <RadioGroup 
          name="has_drivers_license" 
          label="Are you a licensed driver?" 
          value={form.has_drivers_license}
          required
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
          <p className="mt-1 text-xs text-gray">Note: Documentation required (Birth Certificate or Work Visa)</p>
        </div>
      </div>

      {/* Skills & Capabilities */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Skills & Capabilities</h3>
        
        <RadioGroup 
          name="will_travel_30_min" 
          label="Will you travel 30 minutes one way to a client?" 
          value={form.will_travel_30_min}
          required
        />

        <RadioGroup 
          name="can_do_catheter_care" 
          label="Can you do catheter care?" 
          value={form.can_do_catheter_care}
          required
        />

        <RadioGroup 
          name="can_do_vital_signs" 
          label="Can you do vital signs?" 
          value={form.can_do_vital_signs}
          required
        />

        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Will you work with bed bound patients? <span className="text-error">*</span>
          </label>
          <div className="space-y-2">
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
              { value: 'conditional', label: 'Yes, under certain conditions' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="will_work_bed_bound"
                  value={opt.value}
                  checked={form.will_work_bed_bound === opt.value}
                  onChange={(e) => handleChange('will_work_bed_bound', e.target.value)}
                  className="h-4 w-4 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Textarea
          label="Any additional skills we should be aware of?"
          value={form.additional_skills}
          onChange={(e) => handleChange('additional_skills', e.target.value)}
          placeholder="List any additional skills, training, or special capabilities..."
          helperText="Optional - but helpful for matching you with clients"
        />
      </div>
    </div>
  );
}
