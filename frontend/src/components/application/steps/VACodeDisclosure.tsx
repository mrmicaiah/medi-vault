import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { formatDate } from '../../../lib/utils';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function VACodeDisclosure({ data, onSave }: StepProps) {
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
        Review and acknowledge the Virginia Code of Conduct disclosure.
      </p>

      <div className="h-64 overflow-y-auto rounded-lg border border-border bg-gray-50 p-4 text-sm text-slate scrollbar-thin">
        <h4 className="mb-3 font-semibold text-navy">VIRGINIA CODE DISCLOSURE AND ACKNOWLEDGMENT</h4>
        <p className="mb-3">
          Pursuant to the Code of Virginia and applicable regulations governing home care organizations,
          I acknowledge the following disclosures:
        </p>
        <p className="mb-3">
          <strong>1. Barrier Crimes (Virginia Code 19.2-392.02):</strong> I understand that certain criminal convictions
          constitute barrier crimes that may prohibit my employment in a home care setting. These include, but are not
          limited to, felony convictions involving assault, abuse, neglect, fraud, and drug offenses.
        </p>
        <p className="mb-3">
          <strong>2. Abuse and Neglect Reporting:</strong> I understand that as a caregiver, I am a mandated reporter
          and am required to report any suspected abuse, neglect, or exploitation of clients to the appropriate
          authorities immediately.
        </p>
        <p className="mb-3">
          <strong>3. Rights of Clients:</strong> I acknowledge that clients have the right to be treated with dignity
          and respect, to be free from abuse and neglect, to privacy, and to make informed decisions about their care.
        </p>
        <p className="mb-3">
          <strong>4. Standards of Conduct:</strong> I agree to maintain professional conduct at all times, including
          but not limited to: arriving on time, following care plans, maintaining appropriate boundaries, and refraining
          from the use of drugs or alcohol while on duty.
        </p>
        <p className="mb-3">
          <strong>5. Disclosure:</strong> I certify that I have not been convicted of any barrier crime as defined
          by Virginia law, and I have not been found to have abused, neglected, or exploited any individual.
        </p>
        <p>
          I understand that any false statements or omissions in this disclosure may result in immediate termination
          and potential legal action.
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
            I have read and acknowledge the Virginia Code disclosures above. I certify that no barrier crimes
            apply to me.
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
