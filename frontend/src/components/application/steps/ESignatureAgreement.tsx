import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { formatDate } from '../../../lib/utils';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function ESignatureAgreement({ data, onSave }: StepProps) {
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
        Please review and agree to the electronic signature disclosure.
      </p>

      <div className="h-64 overflow-y-auto rounded-lg border border-border bg-gray-50 p-4 text-sm text-slate scrollbar-thin">
        <h4 className="mb-3 font-semibold text-navy">ELECTRONIC SIGNATURE CONSENT AND AGREEMENT</h4>
        <p className="mb-3">
          By signing this agreement electronically, I consent to the use of electronic signatures in lieu of handwritten
          signatures for all documents associated with my application and employment.
        </p>
        <p className="mb-3">
          <strong>1. Consent to Electronic Signatures:</strong> I agree that my electronic signature is the legal equivalent
          of my manual signature on this and all related application documents.
        </p>
        <p className="mb-3">
          <strong>2. Legal Validity:</strong> I acknowledge that electronic signatures are legally binding under the
          Electronic Signatures in Global and National Commerce Act (E-SIGN Act) and the Uniform Electronic
          Transactions Act (UETA).
        </p>
        <p className="mb-3">
          <strong>3. Intent to Sign:</strong> When I type my name in the signature field, I intend for it to serve as my
          official signature, indicating my agreement to the terms of the associated document.
        </p>
        <p className="mb-3">
          <strong>4. Record Keeping:</strong> I understand that electronic records of my signatures will be maintained
          and are accessible for review upon request.
        </p>
        <p className="mb-3">
          <strong>5. Right to Withdraw:</strong> I may withdraw my consent to use electronic signatures at any time by
          notifying the agency in writing. However, withdrawal may delay processing of my application.
        </p>
        <p className="mb-3">
          <strong>6. Hardware and Software Requirements:</strong> I confirm that I have access to a device and internet
          connection that allows me to access, view, and retain electronic records.
        </p>
        <p>
          I acknowledge that I have read this Electronic Signature Consent and Agreement and voluntarily agree to its terms.
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
            I consent to the use of electronic signatures and agree to the terms outlined above.
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
