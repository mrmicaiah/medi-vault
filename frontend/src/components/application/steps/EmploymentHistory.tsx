import React, { useState } from 'react';
import { Input, Textarea } from '../../ui/Input';
import { Button } from '../../ui/Button';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

interface Job {
  employer: string;
  title: string;
  start_date: string;
  end_date: string;
  supervisor: string;
  phone: string;
  reason_left: string;
  duties: string;
}

const emptyJob: Job = {
  employer: '', title: '', start_date: '', end_date: '',
  supervisor: '', phone: '', reason_left: '', duties: '',
};

export function EmploymentHistory({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    // Current Employment
    is_currently_employed: (data.is_currently_employed as string) || '',
    current_employer: (data.current_employer as string) || '',
    current_supervisor: (data.current_supervisor as string) || '',
    current_supervisor_phone: (data.current_supervisor_phone as string) || '',
    current_start_date: (data.current_start_date as string) || '',
    may_contact_current: (data.may_contact_current as string) || '',
    
    // Previous Jobs
    jobs: (data.jobs as Job[]) || [{ ...emptyJob }],
    no_second_employer: (data.no_second_employer as boolean) || false,
  });

  const handleChange = (field: string, value: unknown) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  const updateJob = (index: number, field: keyof Job, value: string) => {
    const updated = form.jobs.map((j, i) =>
      i === index ? { ...j, [field]: value } : j
    );
    handleChange('jobs', updated);
  };

  const addJob = () => {
    const updated = [...form.jobs, { ...emptyJob }];
    handleChange('jobs', updated);
  };

  const removeJob = (index: number) => {
    if (form.jobs.length <= 1) return;
    const updated = form.jobs.filter((_, i) => i !== index);
    handleChange('jobs', updated);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        List your employment history starting with your most recent or current employer.
      </p>

      {/* Current Employment */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Current Employment</h3>
        
        <div>
          <label className="block text-sm font-medium text-slate mb-2">
            Are you currently employed? <span className="text-error">*</span>
          </label>
          <div className="flex gap-4">
            {['yes', 'no'].map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="is_currently_employed"
                  value={val}
                  checked={form.is_currently_employed === val}
                  onChange={(e) => handleChange('is_currently_employed', e.target.value)}
                  className="h-4 w-4 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </div>

        {form.is_currently_employed === 'yes' && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-gray-50">
            <Input
              label="Current Employer"
              required
              value={form.current_employer}
              onChange={(e) => handleChange('current_employer', e.target.value)}
              placeholder="Company name"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Supervisor Name"
                value={form.current_supervisor}
                onChange={(e) => handleChange('current_supervisor', e.target.value)}
              />
              <Input
                label="Supervisor Phone"
                type="tel"
                value={form.current_supervisor_phone}
                onChange={(e) => handleChange('current_supervisor_phone', e.target.value)}
              />
            </div>

            <Input
              label="Start Date"
              type="date"
              value={form.current_start_date}
              onChange={(e) => handleChange('current_start_date', e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-slate mb-2">
                May we contact your current employer?
              </label>
              <div className="flex gap-4">
                {['yes', 'no'].map((val) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="may_contact_current"
                      value={val}
                      checked={form.may_contact_current === val}
                      onChange={(e) => handleChange('may_contact_current', e.target.value)}
                      className="h-4 w-4 text-maroon focus:ring-maroon"
                    />
                    <span className="text-sm text-slate">{val === 'yes' ? 'Yes' : 'No'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Previous Employment */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-navy border-b border-border pb-2">Previous Employment</h3>
        <p className="text-xs text-gray">Note: This should NOT include your current employer if listed above.</p>

        {form.jobs.map((job, index) => (
          <div key={index} className="space-y-4 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-navy">
                {index === 0 ? '1st Previous Employer' : `${index + 1}${index === 1 ? 'nd' : 'rd'} Previous Employer`}
              </h4>
              {form.jobs.length > 1 && (
                <button
                  onClick={() => removeJob(index)}
                  className="text-sm text-error hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Skip checkbox for 2nd employer */}
            {index === 1 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.no_second_employer}
                  onChange={(e) => handleChange('no_second_employer', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-maroon focus:ring-maroon"
                />
                <span className="text-sm text-slate">I do not have a 2nd previous employer</span>
              </label>
            )}

            {!(index === 1 && form.no_second_employer) && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input 
                    label="Employer Name" 
                    required={index === 0}
                    value={job.employer} 
                    onChange={(e) => updateJob(index, 'employer', e.target.value)} 
                  />
                  <Input 
                    label="Job Title" 
                    required={index === 0}
                    value={job.title} 
                    onChange={(e) => updateJob(index, 'title', e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input 
                    label="Start Date" 
                    type="date" 
                    required={index === 0}
                    value={job.start_date} 
                    onChange={(e) => updateJob(index, 'start_date', e.target.value)} 
                  />
                  <Input 
                    label="End Date" 
                    type="date" 
                    required={index === 0}
                    value={job.end_date} 
                    onChange={(e) => updateJob(index, 'end_date', e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input 
                    label="Supervisor Name" 
                    value={job.supervisor} 
                    onChange={(e) => updateJob(index, 'supervisor', e.target.value)} 
                  />
                  <Input 
                    label="Supervisor Phone" 
                    type="tel" 
                    value={job.phone} 
                    onChange={(e) => updateJob(index, 'phone', e.target.value)} 
                  />
                </div>

                <Input 
                  label="Reason for Leaving" 
                  value={job.reason_left} 
                  onChange={(e) => updateJob(index, 'reason_left', e.target.value)} 
                />
                
                <Textarea 
                  label="Key Duties / Responsibilities" 
                  value={job.duties} 
                  onChange={(e) => updateJob(index, 'duties', e.target.value)} 
                  placeholder="Describe your primary responsibilities..." 
                />
              </>
            )}
          </div>
        ))}

        {form.jobs.length < 3 && (
          <Button variant="secondary" onClick={addJob} size="sm">
            + Add Another Employer
          </Button>
        )}
      </div>
    </div>
  );
}
