import React from 'react';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { StepRenderer } from './StepRenderer';
import { STEP_NAMES, TOTAL_STEPS } from '../../types';
import { Alert } from '../ui/Alert';

// Upload steps that can be skipped
const UPLOAD_STEPS = [11, 12, 13, 14, 15, 16, 17];

// Agreement steps - just need signature
const AGREEMENT_STEPS = [9, 10, 18, 19, 20, 21];

// Required fields for each step
// Form steps require specific fields to be filled
// Upload steps require file + metadata
// Agreement steps require signature
const STEP_REQUIRED_FIELDS: Record<number, string[]> = {
  // Step 1: Application Basics
  1: [
    'position_applied',
    'employment_type',
    'desired_hourly_rate',
    'desired_start_date',
    'is_18_or_older',
    'convicted_violent_crime',
    'background_check_consent',
    'citizenship_status',
    'eligible_to_work',
    'speaks_other_languages',
    'worked_for_eveready_before',
  ],
  // Step 2: Personal Information
  2: [
    'first_name',
    'middle_name',
    'last_name',
    'date_of_birth',
    'address_line1',
    'city',
    'state',
    'zip',
    'phone',
    'email',
  ],
  // Step 3: Emergency Contact
  3: [
    'ec_first_name',
    'ec_last_name',
    'ec_relationship',
    'ec_phone',
  ],
  // Step 4: Education & Certifications
  4: [
    'graduated_high_school',
    'highest_education',
    // 'certifications' is handled in CHECKBOX_ARRAY_REQUIREMENTS
    'has_cpr_certification',
    'has_drivers_license',
    // Note: eligible_to_work is asked in Education.tsx but stores to step 4 data
    // It's also asked in Step 1, so we validate it there instead
    'will_travel_30_min',
    'can_do_catheter_care',
    'can_do_vital_signs',
    'will_work_bed_bound',
  ],
  // Step 5: Reference 1
  5: [
    'ref1_name',
    'ref1_relationship',
    'ref1_phone',
  ],
  // Step 6: Reference 2
  6: [
    'ref2_name',
    'ref2_relationship',
    'ref2_phone',
  ],
  // Step 7: Employment History
  7: [], // Has its own custom validation below
  // Step 8: Work Preferences
  8: [
    'has_transportation',
    'comfortable_with_pets',
    'comfortable_with_smokers',
  ],
  // Steps 9-10: Agreements (require both checkbox AND signature)
  9: ['agreed', 'signature'],
  10: ['agreed', 'signature'],
  // Steps 11-17: Upload steps
  11: ['authorization_type'],  // Work authorization type is required
  12: ['id_type', 'id_number', 'issuing_state', 'expiration_date'],
  13: [],
  14: [],
  15: [],
  16: [],
  17: [],
  // Steps 18-21: More agreements (require both checkbox AND signature)
  18: ['agreed', 'signature'],
  19: ['agreed', 'signature'],
  20: ['agreed', 'signature'],
  21: ['agreed', 'signature'],
  // Step 22: Final submission (requires all 3 checkboxes + signature)
  22: ['agreed_truthful', 'agreed_at_will', 'agreed_policies', 'signature'],
};

// Steps that require a file upload (when not skipped)
const REQUIRED_FILE_STEPS = [11, 12, 13, 14];

// Steps that require checkbox array to have at least one selection
const CHECKBOX_ARRAY_REQUIREMENTS: Record<number, { field: string; minCount: number }[]> = {
  4: [
    { field: 'certifications', minCount: 1 },
  ],
  8: [
    { field: 'available_days', minCount: 1 },
    { field: 'shift_preferences', minCount: 1 },
  ],
};

interface WizardShellProps {
  currentStep: number;
  completedCount: number;
  saving: boolean;
  stepData: Record<string, unknown>;
  allStepsData: Record<number, { data: Record<string, unknown>; status: string }>;
  pendingFile: File | null;
  onNext: () => void;
  onPrev: () => void;
  onSave: (data: Record<string, unknown>, completed?: boolean) => void;
  onFileSelect: (file: File | null) => void;
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
  pendingFile,
  onNext,
  onPrev,
  onSave,
  onFileSelect,
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

  // Check if file is available (either pending or already uploaded)
  const hasFile = pendingFile !== null || Boolean(stepData.file_name);

  // Check if a field has a valid value
  const hasValidValue = (field: string): boolean => {
    const value = stepData[field];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  };

  // Check if current step can proceed
  const canProceed = (): boolean => {
    // Upload steps that are skipped can proceed
    if (isUploadStep && currentStepSkipped) return true;
    
    const requiredFields = STEP_REQUIRED_FIELDS[currentStep] || [];
    
    // Check all required fields
    const allFieldsComplete = requiredFields.every(field => hasValidValue(field));
    if (!allFieldsComplete) return false;

    // Check checkbox array requirements
    const arrayReqs = CHECKBOX_ARRAY_REQUIREMENTS[currentStep] || [];
    const arraysComplete = arrayReqs.every(req => {
      const arr = stepData[req.field];
      return Array.isArray(arr) && arr.length >= req.minCount;
    });
    if (!arraysComplete) return false;

    // For required upload steps, also need a file
    if (REQUIRED_FILE_STEPS.includes(currentStep) && !currentStepSkipped && !hasFile) {
      return false;
    }

    // Step 7 (Employment History) special case
    if (currentStep === 7) {
      // Must answer "are you currently employed?"
      const isCurrentlyEmployed = stepData.is_currently_employed as string;
      if (!isCurrentlyEmployed) return false;
      
      // If currently employed, must provide current employer
      if (isCurrentlyEmployed === 'yes') {
        const currentEmployer = stepData.current_employer as string;
        if (!currentEmployer || currentEmployer.trim() === '') return false;
      }
      
      // Must have at least one previous employer with required fields filled
      // OR have current employment (which counts as employment history)
      const jobs = stepData.jobs as Array<{ employer?: string; title?: string }> | undefined;
      const hasValidPreviousJob = jobs && jobs.length > 0 && 
        jobs[0].employer && jobs[0].employer.trim() !== '' &&
        jobs[0].title && jobs[0].title.trim() !== '';
      
      // If not currently employed, must have previous employment
      if (isCurrentlyEmployed === 'no' && !hasValidPreviousJob) {
        return false;
      }
    }

    // Step 1 special validations
    if (currentStep === 1) {
      if (stepData.is_18_or_older === 'no') return false;
      if (stepData.background_check_consent === 'no_consent') return false;
      if (stepData.eligible_to_work === 'no') return false;
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

  const getMissingItems = (): { fields: string[]; needsFile: boolean; needsArrays: string[] } => {
    if (isUploadStep && currentStepSkipped) {
      return { fields: [], needsFile: false, needsArrays: [] };
    }
    
    const requiredFields = STEP_REQUIRED_FIELDS[currentStep] || [];
    const missingFields = requiredFields.filter(field => !hasValidValue(field));

    const needsFile = REQUIRED_FILE_STEPS.includes(currentStep) && !currentStepSkipped && !hasFile;
    
    const arrayReqs = CHECKBOX_ARRAY_REQUIREMENTS[currentStep] || [];
    const needsArrays = arrayReqs
      .filter(req => {
        const arr = stepData[req.field];
        return !Array.isArray(arr) || arr.length < req.minCount;
      })
      .map(req => req.field);

    return { fields: missingFields, needsFile, needsArrays };
  };

  const { fields: missingFields, needsFile: missingFile, needsArrays } = getMissingItems();
  const hasValidationErrors = missingFields.length > 0 || missingFile || needsArrays.length > 0;
  
  // Also check special step validations
  const hasSpecialErrors = 
    (currentStep === 1 && (
      stepData.is_18_or_older === 'no' ||
      stepData.background_check_consent === 'no_consent' ||
      stepData.eligible_to_work === 'no'
    )) ||
    (currentStep === 7 && (
      !stepData.is_currently_employed ||
      (stepData.is_currently_employed === 'no' && (
        !stepData.jobs || 
        !(stepData.jobs as Array<{ employer?: string }>)[0]?.employer
      ))
    ));

  const showValidationError = hasValidationErrors || hasSpecialErrors;

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
          onFileSelect={onFileSelect}
          pendingFile={pendingFile}
          saving={saving}
          onChange={onChange}
          allStepsData={allStepsData}
        />

        {showValidationError && !canProceed() && (
          <Alert variant="warning" className="mt-4" title="Required Fields">
            {isUploadStep && missingFile
              ? 'Please upload the required document or check "I\'ll upload this later" to continue.'
              : missingFields.length > 0
                ? `Missing: ${missingFields.join(', ')}`
                : needsArrays.length > 0
                  ? `Please select at least one option for: ${needsArrays.join(', ')}`
                  : 'Please complete all required fields (marked with *) before continuing.'
            }
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

        <div className="flex items-center gap-3">
          {/* Save & Continue Later - always available */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveAndExit}
            disabled={saving}
          >
            Save & Continue Later
          </Button>

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
              <Button onClick={onSubmit} loading={saving} disabled={!canProceed()}>
                Submit Application
              </Button>
            )
          ) : (
            <Button 
              onClick={handleNextClick} 
              loading={saving}
              disabled={!canProceed()}
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
