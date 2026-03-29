import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { WizardShell } from '../../components/application/WizardShell';
import { ReadOnlyApplication } from '../../components/application/ReadOnlyApplication';
import { useApplication } from '../../hooks/useApplication';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function ApplicationPage() {
  const navigate = useNavigate();
  const {
    currentStep,
    completedCount,
    saving,
    loading,
    error,
    hasUnsavedChanges,
    steps,
    applicationStatus,
    isLocked,
    loadApplication,
    saveStep,
    submitApplication,
    nextStep,
    prevStep,
    getStepData,
    markDirty,
  } = useApplication();

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const handleSave = (data: Record<string, unknown>, completed?: boolean) => {
    saveStep(currentStep, data, completed);
  };

  const handleChange = () => {
    markDirty();
  };

  const handleNext = async () => {
    await saveStep(currentStep, getStepData(currentStep), true);
    nextStep();
  };

  const handleSubmit = async () => {
    await saveStep(currentStep, getStepData(currentStep), true);
    await submitApplication();
    navigate('/applicant');
  };

  const handleSaveAndExit = async () => {
    await saveStep(currentStep, getStepData(currentStep), false);
    navigate('/applicant');
  };

  const handleReturnToDashboard = async () => {
    await saveStep(currentStep, getStepData(currentStep), true);
    await submitApplication();
    navigate('/applicant');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading your application...</p>
        </div>
      </div>
    );
  }

  // If application is locked (submitted/approved/rejected), show read-only view
  if (isLocked) {
    return (
      <ReadOnlyApplication
        steps={steps}
        applicationStatus={applicationStatus}
      />
    );
  }

  return (
    <div>
      {error && (
        <Alert variant="error" className="mb-6" dismissible>
          {error}
        </Alert>
      )}

      {hasUnsavedChanges && (
        <div className="mb-4 rounded-lg border border-warning bg-warning-bg px-4 py-2 text-sm text-warning">
          You have unsaved changes
        </div>
      )}

      <WizardShell
        currentStep={currentStep}
        completedCount={completedCount}
        saving={saving}
        stepData={getStepData(currentStep)}
        allStepsData={steps}
        onNext={handleNext}
        onPrev={prevStep}
        onSave={handleSave}
        onSaveAndExit={handleSaveAndExit}
        onChange={handleChange}
        onReturnToDashboard={handleReturnToDashboard}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
