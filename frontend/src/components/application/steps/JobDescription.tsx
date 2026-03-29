import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { formatDate } from '../../../lib/utils';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function JobDescription({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    agreed: (data.agreed as boolean) || false,
    signature: (data.signature as string) || '',
    signed_date: (data.signed_date as string) || new Date().toISOString().split('T')[0],
  });

  const handleChange = (field: string, value: unknown) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray">
        Review the job description and acknowledge your understanding of the role requirements.
      </p>

      <div className="h-64 overflow-y-auto rounded-lg border border-border bg-gray-50 p-4 text-sm text-slate scrollbar-thin">
        <h4 className="mb-3 font-semibold text-navy">JOB DESCRIPTION ACKNOWLEDGMENT</h4>
        <p className="mb-3">
          <strong>Position:</strong> Home Care Aide / Personal Care Attendant
        </p>
        <p className="mb-3">
          <strong>Summary:</strong> The Home Care Aide provides personal care, homemaker, and companion services
          to clients in their homes, enabling them to maintain independence and quality of life.
        </p>

        <p className="mb-2 font-semibold">Essential Duties and Responsibilities:</p>
        <ul className="mb-3 list-disc pl-6 space-y-1">
          <li>Assist clients with activities of daily living (ADLs) including bathing, dressing, grooming, and toileting</li>
          <li>Assist with mobility, transfers, and ambulation</li>
          <li>Prepare meals according to dietary guidelines and assist with feeding as needed</li>
          <li>Perform light housekeeping duties including laundry, dishes, and tidying</li>
          <li>Provide medication reminders (as permitted by state regulations)</li>
          <li>Monitor and report changes in client condition to the supervisor</li>
          <li>Document care provided according to agency policies</li>
          <li>Accompany clients to medical appointments and errands</li>
          <li>Provide emotional support and companionship</li>
          <li>Follow the individualized care plan for each client</li>
        </ul>

        <p className="mb-2 font-semibold">Physical Requirements:</p>
        <ul className="mb-3 list-disc pl-6 space-y-1">
          <li>Ability to lift up to 50 pounds</li>
          <li>Ability to stand, walk, bend, and kneel for extended periods</li>
          <li>Ability to perform repetitive motions</li>
          <li>Ability to work in a home environment with varying conditions</li>
        </ul>

        <p className="mb-2 font-semibold">Qualifications:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Must be at least 18 years of age</li>
          <li>High school diploma or GED preferred</li>
          <li>Valid driver's license and reliable transportation</li>
          <li>Current CPR/First Aid certification (or willingness to obtain)</li>
          <li>Ability to pass background check and drug screening</li>
        </ul>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.agreed}
            onChange={(e) => handleChange('agreed', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-maroon focus:ring-maroon"
          />
          <span className="text-sm text-slate">
            I have reviewed the job description above and understand the duties, responsibilities, and
            requirements of this position.
          </span>
        </label>

        <Input
          label="Typed Signature (Full Legal Name)"
          required
          value={form.signature}
          onChange={(e) => handleChange('signature', e.target.value)}
          placeholder="Type your full legal name"
        />

        <div>
          <label className="block text-sm font-medium text-navy">Date</label>
          <p className="mt-1 text-sm text-slate">{formatDate(form.signed_date)}</p>
        </div>
      </div>
    </div>
  );
}
