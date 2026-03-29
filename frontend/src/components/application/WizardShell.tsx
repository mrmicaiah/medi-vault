import React from 'react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { StepRenderer } from './StepRenderer';
import { STEP_NAMES, TOTAL_STEPS } from '../../types';
import { Alert } from '../ui/Alert';

// Upload steps that can be skipped
const UPLOAD_STEPS = [11, 12, 13, 14, 15, 16, 17];

interface WizardShellProps {
  currentStep: number;
  completedCount: number;
  saving: boolean;
  stepData: Record<string, unknown>;
  allStepsData: Record<number, { data: Record<string, unknown>; status: string }>;
  onNext: () => void;
  onPrev: () => void;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onSaveAndExit: () => void;
  onChange?: () => void;
  onReturnToDashboard: () => void;
}

export function WizardShell({
  currentStep,
  completedCount,
  saving,
  stepData,
  allStepsData,
  onNext,
  onPrev,
  onSave,
  onSaveAndExit,
  onChange,
  onReturnToDashboard,
}: WizardShellProps) {
  const stepName = STEP_NAMES[currentStep] || `Step ${currentStep}`;
  const isFirst = currentStep === 1;
  const isLast = currentStep === TOTAL_STEPS;
  
  const hasSkippedUploads = UPLOAD_STEPS.some(stepNum => {
    const step = allStepsData[stepNum];
    return step?.data?.skip === true;
  });

  const skippedUploadCount = UPLOAD_STEPS.filter(stepNum => {
    const step = allStepsData[stepNum];
    return step?.data?.skip === true;
  }).length;

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
            {Array.from({ length: TOTAL_STEPS }, (_, i) => {
              const stepNum = i + 1;
              const stepInfo = allStepsData[stepNum];
              const isSkipped = stepInfo?.data?.skip === true;
              
              return (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    stepNum < currentStep
                      ? isSkipped ? 'bg-warning' : 'bg-success'
                      : stepNum === currentStep
                        ? 'bg-maroon'
                        : 'bg-gray-100'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <StepRenderer
          step={currentStep}
          data={stepData}
          onSave={onSave}
          saving={saving}
          onChange={onChange}
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
          {isLast ? (
            hasSkippedUploads ? (
              <div className="flex flex-col items-end gap-2">
                <Button onClick={onReturnToDashboard} loading={saving}>
                  Return to Dashboard
                </Button>
                <p className="text-xs text-warning">
                  {skippedUploadCount} document{skippedUploadCount > 1 ? 's' : ''} still needed for hiring
                </p>
              </div>
            ) : (
              <Button onClick={onNext} loading={saving}>
                Submit Application
              </Button>
            )
          ) : (
            <Button onClick={onNext} loading={saving}>
              Next
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {isLast && hasSkippedUploads && (
        <Alert variant="warning" className="mt-6" title="Documents Needed">
          <p className="text-sm">
            You've chosen to upload the following documents later. Your application will be saved,
            but you won't be eligible for hiring until all required documents are uploaded.
          </p>
          <ul className="mt-2 list-disc pl-4 text-sm">
            {UPLOAD_STEPS.map(stepNum => {
              const step = allStepsData[stepNum];
              if (step?.data?.skip) {
                return (
                  <li key={stepNum}>{STEP_NAMES[stepNum]}</li>
                );
              }
              return null;
            })}
          </ul>
        </Alert>
      )}
    </div>
  );
}
