import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = true,
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  const barColor =
    percentage >= 75
      ? 'bg-success'
      : percentage >= 40
        ? 'bg-warning'
        : 'bg-maroon';

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2.5' : 'h-4';

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium text-slate">Progress</span>
          <span className="text-gray">{percentage}%</span>
        </div>
      )}
      <div className={cn('w-full rounded-full bg-gray-100', heightClass)}>
        <div
          className={cn('rounded-full transition-all duration-500', barColor, heightClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
