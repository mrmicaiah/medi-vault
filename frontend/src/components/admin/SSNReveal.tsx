import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';

interface SSNRevealProps {
  userId: string;
  ssnLastFour?: string;
  ssnProvided: boolean;
}

/**
 * Component for admins to view masked SSN with reveal functionality.
 * Requires confirmation and logs all access.
 */
export function SSNReveal({ userId, ssnLastFour, ssnProvided }: SSNRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [fullSSN, setFullSSN] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!ssnProvided) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        SSN not provided
      </div>
    );
  }

  const maskedSSN = `***-**-${ssnLastFour}`;

  const handleRevealClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmReveal = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{ ssn_full: string }>(
        `/sensitive/ssn/${userId}/reveal`,
        { reason: reason || 'Admin review' }
      );
      setFullSSN(response.ssn_full);
      setRevealed(true);
      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reveal SSN');
    } finally {
      setLoading(false);
    }
  };

  const handleHide = () => {
    setRevealed(false);
    setFullSSN(null);
    setReason('');
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setReason('');
    setError(null);
  };

  // Confirmation modal
  if (showConfirm) {
    return (
      <div className="rounded-lg border border-warning bg-warning-bg p-4">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium text-slate">Confirm SSN Access</span>
        </div>
        <p className="mb-3 text-sm text-gray">
          This action will be logged for compliance purposes. Please provide a reason for accessing this SSN.
        </p>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for access (e.g., I-9 verification)"
          className="mb-3 w-full rounded border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
        />
        {error && (
          <p className="mb-3 text-sm text-error">{error}</p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmReveal}
            loading={loading}
          >
            Reveal SSN
          </Button>
        </div>
      </div>
    );
  }

  // Revealed state
  if (revealed && fullSSN) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-medium text-slate">{fullSSN}</span>
        <button
          onClick={handleHide}
          className="flex items-center gap-1 text-xs text-gray hover:text-slate"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          Hide
        </button>
        <span className="text-xs text-gray">(Revealed - logged)</span>
      </div>
    );
  }

  // Default masked state
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-sm text-gray">{maskedSSN}</span>
      <button
        onClick={handleRevealClick}
        className="flex items-center gap-1 text-xs text-maroon hover:text-maroon-light"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Reveal
      </button>
    </div>
  );
}
