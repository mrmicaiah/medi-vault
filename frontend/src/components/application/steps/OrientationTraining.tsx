import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { formatDate } from '../../../lib/utils';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function OrientationTraining({ data, onSave }: StepProps) {
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
        Review and acknowledge the orientation and training requirements.
      </p>

      <div className="h-64 overflow-y-auto rounded-lg border border-border bg-gray-50 p-4 text-sm text-slate scrollbar-thin">
        <h4 className="mb-3 font-semibold text-navy">ORIENTATION AND TRAINING ACKNOWLEDGMENT</h4>
        <p className="mb-3">
          As a new employee, I understand that I am required to complete orientation and training as a condition
          of my employment. I acknowledge the following:
        </p>
        <p className="mb-3">
          <strong>1. Orientation Program:</strong> I will attend and complete the agency orientation program, which covers
          agency policies, procedures, safety protocols, infection control, HIPAA compliance, and emergency procedures.
        </p>
        <p className="mb-3">
          <strong>2. In-Service Training:</strong> I understand that I am required to complete a minimum number of
          in-service training hours annually, as mandated by state and federal regulations.
        </p>
        <p className="mb-3">
          <strong>3. Competency Evaluation:</strong> I agree to participate in competency evaluations to demonstrate
          proficiency in required skills before providing client care independently.
        </p>
        <p className="mb-3">
          <strong>4. Continuing Education:</strong> I understand that maintaining required certifications and licenses
          is my responsibility, and I must provide updated documentation to the agency.
        </p>
        <p className="mb-3">
          <strong>5. Training Records:</strong> I understand that my training records will be maintained by the agency
          and are subject to review by regulatory agencies.
        </p>
        <p>
          I acknowledge that failure to complete required training may result in suspension or termination of employment.
        </p>
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
            I acknowledge and agree to comply with all orientation and training requirements outlined above.
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
