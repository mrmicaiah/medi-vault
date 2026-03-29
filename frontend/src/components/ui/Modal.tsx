import React, { useEffect } from 'react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-navy/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-full rounded-xl bg-white shadow-xl',
          sizeClasses[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="font-display text-lg font-semibold text-navy">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray hover:bg-gray-100 hover:text-slate"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
        {actions && (
          <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
