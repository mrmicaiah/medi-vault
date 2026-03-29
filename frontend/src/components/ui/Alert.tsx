import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface AlertProps {
  variant?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  className?: string;
}

const variantConfig: Record<string, { bg: string; text: string; icon: string }> = {
  success: { bg: 'bg-success-bg border-success/20', text: 'text-success', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  warning: { bg: 'bg-warning-bg border-warning/20', text: 'text-warning', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
  error: { bg: 'bg-error-bg border-error/20', text: 'text-error', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  info: { bg: 'bg-info-bg border-info/20', text: 'text-info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
};

export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  className,
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border p-4',
        config.bg,
        className
      )}
    >
      <svg className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.text)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
      </svg>
      <div className="flex-1">
        {title && <p className={cn('text-sm font-medium', config.text)}>{title}</p>}
        <div className={cn('text-sm', config.text, title ? 'mt-1 opacity-90' : '')}>
          {children}
        </div>
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className={cn('flex-shrink-0 rounded p-0.5 hover:opacity-70', config.text)}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
