import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';

interface SSNInputProps {
  value?: string;
  onChange: (ssn: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

/**
 * Secure SSN input component with formatting and masking.
 * Displays as ***-**-**** while typing shows the actual digits.
 * Formats automatically as XXX-XX-XXXX.
 */
export function SSNInput({
  value = '',
  onChange,
  onBlur,
  disabled = false,
  error,
  label = 'Social Security Number',
  required = false,
  className,
}: SSNInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [rawValue, setRawValue] = useState('');

  // Initialize from value prop
  useEffect(() => {
    if (value) {
      const clean = value.replace(/\D/g, '').slice(0, 9);
      setRawValue(clean);
      setDisplayValue(formatSSN(clean));
    }
  }, [value]);

  const formatSSN = (digits: string): string => {
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
  };

  const maskSSN = (digits: string): string => {
    if (digits.length === 0) return '';
    if (digits.length <= 5) return '•'.repeat(digits.length);
    const masked = '•••-••-' + digits.slice(5);
    return masked;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Remove all non-digits
    const digits = input.replace(/\D/g, '').slice(0, 9);
    setRawValue(digits);
    setDisplayValue(formatSSN(digits));
    onChange(digits);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(formatSSN(rawValue));
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const isComplete = rawValue.length === 9;

  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate">
          {label}
          {required && <span className="ml-1 text-maroon">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={isFocused ? displayValue : (rawValue ? maskSSN(rawValue) : '')}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="•••-••-••••"
          className={clsx(
            'w-full rounded-lg border px-3 py-2.5 text-sm font-mono tracking-wider',
            'transition-colors duration-150',
            'placeholder:text-gray-light',
            disabled && 'cursor-not-allowed bg-gray-50 opacity-60',
            error
              ? 'border-error bg-error-bg focus:border-error focus:ring-1 focus:ring-error'
              : 'border-border bg-white hover:border-gray focus:border-maroon focus:ring-1 focus:ring-maroon',
          )}
        />
        {isComplete && !error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      <p className="mt-1 text-xs text-gray">
        <svg className="mr-1 inline h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your SSN is encrypted and stored securely
      </p>
    </div>
  );
}
