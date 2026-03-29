import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { Alert } from '../../ui/Alert';
import { formatDate } from '../../../lib/utils';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function FinalSignature({ data, onSave }: StepProps) {
  const [form, setForm] = useState({
    agreed_truthful: (data.agreed_truthful as boolean) || false,
    agreed_at_will: (data.agreed_at_will as boolean) || false,
    agreed_policies: (data.agreed_policies as boolean) || false,
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
      <Alert variant="info" title="Final Step">
        This is the final step of your application. Please review the statements below carefully
        and provide your signature to submit your application.
      </Alert>

      <div className="h-48 overflow-y-auto rounded-lg border border-border bg-gray-50 p-4 text-sm text-slate scrollbar-thin">
        <h4 className="mb-3 font-semibold text-navy">APPLICANT CERTIFICATION AND FINAL SIGNATURE</h4>
        <p className="mb-3">
          I certify that all information provided in this application is true, complete, and correct to the best
          of my knowledge. I understand that any misrepresentation, falsification, or material omission of
          information may result in my disqualification from consideration for employment or, if employed,
          my termination.
        </p>
        <p className="mb-3">
          I understand that employment with this agency is "at-will," meaning that either I or the agency may
          terminate the employment relationship at any time, with or without cause or notice. No representative
          of the agency has the authority to make any agreement to the contrary.
        </p>
        <p>
          I acknowledge that I have read, understand, and agree to comply with all agency policies and procedures,
          including those related to confidentiality, safety, and professional conduct.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-border p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.agreed_truthful}
            onChange={(e) => handleChange('agreed_truthful', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-maroon focus:ring-maroon"
          />
          <span className="text-sm text-slate">
            I certify that all information provided in this application is true, complete, and correct.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.agreed_at_will}
            onChange={(e) => handleChange('agreed_at_will', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-maroon focus:ring-maroon"
          />
          <span className="text-sm text-slate">
            I understand that employment is at-will and may be terminated at any time by either party.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.agreed_policies}
            onChange={(e) => handleChange('agreed_policies', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-maroon focus:ring-maroon"
          />
          <span className="text-sm text-slate">
            I agree to comply with all agency policies and procedures.
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
