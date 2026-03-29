import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: React.ReactNode;
}

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ children, className, padding = 'md', header }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-white shadow-sm',
        className
      )}
    >
      {header && (
        <div className="border-b border-border px-6 py-4">
          {typeof header === 'string' ? (
            <h3 className="font-display text-lg font-semibold text-navy">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
}
