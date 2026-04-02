import React from 'react';

interface PhotoTipsProps {
  documentType: 'id' | 'ssn' | 'credential' | 'general';
  className?: string;
}

const TIPS = {
  id: [
    'Place your ID on a dark, flat surface',
    'Make sure all four corners are visible',
    'Avoid glare from lights or windows',
    'Photo and text must be clearly readable',
    'Do not cover any part of the ID with your fingers',
  ],
  ssn: [
    'Place card on a dark, contrasting surface',
    'Ensure all numbers are clearly visible',
    'Avoid shadows and glare',
    'Keep the card flat, not bent or curved',
    'Make sure the entire card is in frame',
  ],
  credential: [
    'Capture the entire document including borders',
    'All text and certification numbers must be readable',
    'If multi-page, upload all pages as one PDF',
    'Ensure expiration date is visible',
    'Avoid folded or wrinkled documents',
  ],
  general: [
    'Use good lighting — natural light works best',
    'Hold your phone steady or use a surface',
    'Make sure the document fills most of the frame',
    'Avoid blurry or out-of-focus images',
    'Check the preview before uploading',
  ],
};

export function PhotoTips({ documentType, className = '' }: PhotoTipsProps) {
  const tips = TIPS[documentType] || TIPS.general;

  return (
    <div className={`rounded-lg border border-blue-200 bg-blue-50 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-blue-800">Tips for a Good Photo</h4>
          <ul className="mt-2 space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                <span className="text-blue-400 flex-shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function QuickPhotoTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <svg className="h-4 w-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
