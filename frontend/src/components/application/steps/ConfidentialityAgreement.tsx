import React, { useState } from 'react';
import { Input } from '../../ui/Input';
import { formatDate } from '../../../lib/utils';

interface StepProps {
  data: Record<string, unknown>;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  saving: boolean;
}

export function ConfidentialityAgreement({ data, onSave }: StepProps) {
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
        Please read the confidentiality agreement below carefully, then sign to acknowledge your understanding.
      </p>

      <div className="h-64 overflow-y-auto rounded-lg border border-border bg-gray-50 p-4 text-sm text-slate scrollbar-thin">
        <h4 className="mb-3 font-semibold text-navy">CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT</h4>
        <p className="mb-3">
          As an employee or applicant of this Home Care Agency, I understand that I may have access to confidential
          information regarding clients, patients, staff, and business operations. I agree to the following terms:
        </p>
        <p className="mb-3">
          <strong>1. Definition of Confidential Information:</strong> Confidential information includes, but is not limited to,
          patient medical records, personal health information (PHI), client contact information, care plans, financial
          information, employee records, trade secrets, business strategies, and any other proprietary information.
        </p>
        <p className="mb-3">
          <strong>2. Non-Disclosure:</strong> I agree not to disclose, share, copy, or distribute any confidential information
          to any unauthorized person, organization, or entity, either during or after my employment.
        </p>
        <p className="mb-3">
          <strong>3. HIPAA Compliance:</strong> I understand that patient health information is protected under the Health
          Insurance Portability and Accountability Act (HIPAA) and that unauthorized disclosure of PHI may result in civil
          and criminal penalties.
        </p>
        <p className="mb-3">
          <strong>4. Use of Information:</strong> I agree to use confidential information solely for the purpose of performing
          my job duties and in accordance with agency policies.
        </p>
        <p className="mb-3">
          <strong>5. Return of Materials:</strong> Upon termination of employment, I agree to return all documents, files,
          electronic records, and other materials containing confidential information.
        </p>
        <p className="mb-3">
          <strong>6. Breach Consequences:</strong> I understand that a breach of this agreement may result in disciplinary
          action, up to and including termination of employment, and may subject me to legal liability.
        </p>
        <p className="mb-3">
          <strong>7. Duration:</strong> This agreement remains in effect during my employment and for a period of two (2)
          years following the termination of my employment.
        </p>
        <p>
          I acknowledge that I have read and understand this Confidentiality and Non-Disclosure Agreement, and I agree to
          comply with all its terms and conditions.
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
            I have read, understand, and agree to the terms of the Confidentiality and Non-Disclosure Agreement above.
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
