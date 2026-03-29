import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, required, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-navy"
          >
            {label}
            {required && <span className="ml-1 text-error">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-lg border px-3 py-2 text-sm text-slate shadow-sm transition-colors placeholder:text-gray-light focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20',
            error
              ? 'border-error focus:border-error focus:ring-error/20'
              : 'border-border',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-error">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, required, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-navy">
            {label}
            {required && <span className="ml-1 text-error">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-lg border px-3 py-2 text-sm text-slate shadow-sm transition-colors placeholder:text-gray-light focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20',
            error ? 'border-error focus:border-error focus:ring-error/20' : 'border-border',
            className
          )}
          rows={4}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        {helperText && !error && <p className="text-sm text-gray">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, required, options, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-navy">
            {label}
            {required && <span className="ml-1 text-error">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'block w-full rounded-lg border px-3 py-2 text-sm text-slate shadow-sm transition-colors focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20',
            error ? 'border-error' : 'border-border',
            className
          )}
          {...props}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
