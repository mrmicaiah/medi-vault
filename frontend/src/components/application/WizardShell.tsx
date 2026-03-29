import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { StepRenderer } from './StepRenderer';
import { STEP_NAMES, TOTAL_STEPS } from '../../types';

interface WizardShellProps {
  currentStep: number;
  completedCount: number;
  saving: boolean;
  stepData: Record<string, unknown>;
  onNext: () => void;
  onPrev: () => void;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onSkip: () => void;
  onSaveAndExit: () => void;
}

export function WizardShell({
  currentStep,
  completedCount,
  saving,
  stepData,
  onNext,
  onPrev,
  onSave,
  onSkip,
  onSaveAndExit,
}: WizardShellProps) {
  const navigate = useNavigate();
  const stepName = STEP_NAMES[currentStep] || `Step ${currentStep}`;
  const isFirst = currentStep === 1;
  const isLast = currentStep === TOTAL_STEPS;
  const canSkip = currentStep >= 15 && currentStep <= 17;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">
            Employment Application
          </h1>
          <p className="mt-1 text-sm text-gray">
            Step {currentStep} of {TOTAL_STEPS}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSaveAndExit}
          disabled={saving}
        >
          Save & Exit
        </Button>
      </div>

      <ProgressBar
        value={completedCount}
        max={TOTAL_STEPS}
        className="mb-8"
      />

      <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="mb-6 border-b border-border pb-4">
          <h2 className="font-display text-lg font-semibold text-navy">
            {stepName}
          </h2>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i + 1 < currentStep
                    ? 'bg-success'
                    : i + 1 === currentStep
                      ? 'bg-maroon'
                      : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
        </div>

        <StepRenderer
          step={currentStep}
          data={stepData}
          onSave={onSave}
          saving={saving}
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={onPrev}
          disabled={isFirst || saving}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>

        <div className="flex gap-3">
          {canSkip && (
            <Button variant="ghost" onClick={onSkip} disabled={saving}>
              Not Yet
            </Button>
          )}
          <Button onClick={onNext} loading={saving}>
            {isLast ? 'Submit Application' : 'Next'}
            {!isLast && (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
