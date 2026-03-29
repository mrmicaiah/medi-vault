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
  const [jobs, setJobs] = useState<Job[]>(
    (data.jobs as Job[]) || [{ ...emptyJob }]
  );

  const updateJob = (index: number, field: keyof Job, value: string) => {
    const updated = jobs.map((j, i) =>
      i === index ? { ...j, [field]: value } : j
    );
    setJobs(updated);
    onSave({ jobs: updated });
  };

  const addJob = () => {
    const updated = [...jobs, { ...emptyJob }];
    setJobs(updated);
    onSave({ jobs: updated });
  };

  const removeJob = (index: number) => {
    if (jobs.length <= 1) return;
    const updated = jobs.filter((_, i) => i !== index);
    setJobs(updated);
    onSave({ jobs: updated });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        List your employment history starting with your most recent employer.
      </p>

      {jobs.map((job, index) => (
        <div key={index} className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-navy">
              {index === 0 ? 'Most Recent Employer' : `Previous Employer ${index + 1}`}
            </h4>
            {jobs.length > 1 && (
              <button
                onClick={() => removeJob(index)}
                className="text-sm text-error hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Employer Name" required value={job.employer} onChange={(e) => updateJob(index, 'employer', e.target.value)} />
            <Input label="Job Title" required value={job.title} onChange={(e) => updateJob(index, 'title', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Start Date" type="date" required value={job.start_date} onChange={(e) => updateJob(index, 'start_date', e.target.value)} />
            <Input label="End Date" type="date" value={job.end_date} onChange={(e) => updateJob(index, 'end_date', e.target.value)} helperText="Leave blank if current" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Supervisor Name" value={job.supervisor} onChange={(e) => updateJob(index, 'supervisor', e.target.value)} />
            <Input label="Supervisor Phone" type="tel" value={job.phone} onChange={(e) => updateJob(index, 'phone', e.target.value)} />
          </div>

          <Input label="Reason for Leaving" value={job.reason_left} onChange={(e) => updateJob(index, 'reason_left', e.target.value)} />
          <Textarea label="Key Duties / Responsibilities" value={job.duties} onChange={(e) => updateJob(index, 'duties', e.target.value)} placeholder="Describe your primary responsibilities..." />
        </div>
      ))}

      <Button variant="secondary" onClick={addJob} size="sm">
        + Add Another Employer
      </Button>
    </div>
  );
}
