import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { formatDate } from '../../../lib/utils';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function CriminalBackground({ data, onSave }: StepProps) {
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
        Please review and authorize the criminal background check disclosure.
      </p>

      <div className="h-64 overflow-y-auto rounded-lg border border-border bg-gray-50 p-4 text-sm text-slate scrollbar-thin">
        <h4 className="mb-3 font-semibold text-navy">CRIMINAL BACKGROUND CHECK AUTHORIZATION</h4>
        <p className="mb-3">
          In connection with my application for employment, I understand that a criminal background check will
          be conducted as part of the hiring process.
        </p>
        <p className="mb-3">
          <strong>1. Authorization:</strong> I hereby authorize the agency and its designated agents to obtain
          information regarding my criminal history from federal, state, and local law enforcement agencies,
          courts, and other sources as permitted by law.
        </p>
        <p className="mb-3">
          <strong>2. Scope:</strong> The background check may include, but is not limited to, a search of criminal
          records, sex offender registries, abuse registries, and exclusion lists (OIG, SAM).
        </p>
        <p className="mb-3">
          <strong>3. Ongoing Obligation:</strong> I understand that I have an ongoing obligation to report any
          criminal charges, arrests, or convictions that occur during my employment.
        </p>
        <p className="mb-3">
          <strong>4. Fair Credit Reporting Act:</strong> I acknowledge that the background check will be conducted
          in accordance with the Fair Credit Reporting Act (FCRA) and applicable state laws.
        </p>
        <p className="mb-3">
          <strong>5. Adverse Action:</strong> If information obtained through the background check is used to make
          an adverse employment decision, I will be provided with a copy of the report and a summary of my rights.
        </p>
        <p>
          I certify that the information provided in this application is true and complete. I understand that
          any misrepresentation or omission may result in disqualification or termination.
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
            I authorize the agency to conduct a criminal background check and agree to the terms outlined above.
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
