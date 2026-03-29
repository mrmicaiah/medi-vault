import React from 'react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { StepRenderer } from './StepRenderer';
import { STEP_NAMES, TOTAL_STEPS } from '../../types';
import { Alert } from '../ui/Alert';

// Upload steps that can be skipped
const UPLOAD_STEPS = [11, 12, 13, 14, 15, 16, 17];

// Required fields for each upload step (when not skipped)
const UPLOAD_STEP_REQUIRED_FIELDS: Record<number, string[]> = {
  11: ['worker_type', 'document_type', 'file_name'], // Work Auth
  12: ['id_type', 'id_number', 'issuing_state', 'expiration_date', 'file_name'], // ID Front
  13: ['file_name'], // ID Back
  14: ['file_name'], // SSN Card
  15: [], // Credentials - optional
  16: [], // CPR - optional
  17: [], // TB Test - optional
};

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
  onSubmit: () => void;
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
  onSubmit,
}: WizardShellProps) {
  const stepName = STEP_NAMES[currentStep] || `Step ${currentStep}`;
  const isFirst = currentStep === 1;
  const isLast = currentStep === TOTAL_STEPS;
  const isUploadStep = UPLOAD_STEPS.includes(currentStep);
  const currentStepSkipped = stepData.skip === true;

  // Check if current step can proceed
  const canProceed = (): boolean => {
    if (isUploadStep) {
      if (currentStepSkipped) return true;
      
      const requiredFields = UPLOAD_STEP_REQUIRED_FIELDS[currentStep] || [];
      if (requiredFields.length === 0) return true;
      
      return requiredFields.every(field => {
        const value = stepData[field];
        return value !== undefined && value !== null && value !== '';
      });
    }
    return true;
  };

  const handleNextClick = () => {
    if (canProceed()) {
      onNext();
    }
  };
  
  const hasSkippedUploads = UPLOAD_STEPS.some(stepNum => {
    const step = allStepsData[stepNum];
    return step?.data?.skip === true;
  });

  const skippedUploadCount = UPLOAD_STEPS.filter(stepNum => {
    const step = allStepsData[stepNum];
    return step?.data?.skip === true;
  }).length;

  const getMissingFields = (): string[] => {
    if (!isUploadStep || currentStepSkipped) return [];
    const requiredFields = UPLOAD_STEP_REQUIRED_FIELDS[currentStep] || [];
    return requiredFields.filter(field => {
      const value = stepData[field];
      return value === undefined || value === null || value === '';
    });
  };

  const missingFields = getMissingFields();
  const showValidationError = isUploadStep && !currentStepSkipped && missingFields.length > 0;

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

        {showValidationError && (
          <Alert variant="error" className="mt-4" title="Required Fields Missing">
            Please {missingFields.includes('file_name') ? 'upload the document' : 'fill in all required fields'}, 
            or check "I'll upload this later" to continue.
          </Alert>
        )}
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
              <Button onClick={onSubmit} loading={saving}>
                Submit Application
              </Button>
            )
          ) : (
            <Button 
              onClick={handleNextClick} 
              loading={saving}
              disabled={showValidationError}
            >
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
