import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { ApplicationStep, ApplicationStatus } from '../types';

interface StepState {
  data: Record<string, unknown>;
  status: string;
}

interface ApplicationState {
  applicationId: string | null;
  applicationStatus: ApplicationStatus;
  currentStep: number;
  steps: Record<number, StepState>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

// Map step numbers to readable folder names for storage organization
const STEP_FOLDER_NAMES: Record<number, string> = {
  11: 'work-authorization',
  12: 'id-front',
  13: 'id-back',
  14: 'ssn-card',
  15: 'credentials',
  16: 'cpr-certification',
  17: 'tb-test',
};

// Steps that involve file uploads
const UPLOAD_STEPS = [11, 12, 13, 14, 15, 16, 17];

export function useApplication() {
  const [state, setState] = useState<ApplicationState>({
    applicationId: null,
    applicationStatus: 'not_started',
    currentStep: 1,
    steps: {},
    loading: false,
    saving: false,
    error: null,
    hasUnsavedChanges: false,
  });

  const initialDataRef = useRef<Record<string, unknown>>({});

  // Check if application is locked (submitted or beyond)
  const isLocked = ['submitted', 'under_review', 'approved', 'rejected'].includes(state.applicationStatus);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  const loadApplication = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await api.get<{
        application: { id: string; current_step: number; status: ApplicationStatus };
        steps: ApplicationStep[];
      }>('/applications/me');

      const stepsMap: Record<number, StepState> = {};
      res.steps.forEach((step) => {
        stepsMap[step.step_number] = { data: step.data || {}, status: step.status };
      });

      initialDataRef.current = stepsMap[res.application.current_step]?.data || {};

      setState((prev) => ({
        ...prev,
        applicationId: res.application.id,
        applicationStatus: res.application.status,
        currentStep: res.application.current_step,
        steps: stepsMap,
        loading: false,
        hasUnsavedChanges: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load application';
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const markDirty = useCallback(() => {
    setState((prev) => ({ ...prev, hasUnsavedChanges: true }));
  }, []);

  const updateLocalStepData = useCallback((stepNumber: number, data: Record<string, unknown>) => {
    setState((prev) => ({
      ...prev,
      steps: {
        ...prev.steps,
        [stepNumber]: { 
          ...prev.steps[stepNumber],
          data: { ...(prev.steps[stepNumber]?.data || {}), ...data },
        },
      },
      hasUnsavedChanges: true,
    }));
  }, []);

  /**
   * Upload a file to Supabase Storage
   * Returns the storage path and signed URL
   */
  const uploadFile = useCallback(async (
    file: File,
    stepNumber: number,
    userId: string
  ): Promise<{ path: string; url: string }> => {
    const folderName = STEP_FOLDER_NAMES[stepNumber] || `step-${stepNumber}`;
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${folderName}/${timestamp}_${sanitizedFileName}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get signed URL (1 year expiry)
    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);

    return {
      path: data.path,
      url: urlData?.signedUrl || '',
    };
  }, []);

  const saveStep = useCallback(
    async (stepNumber: number, data: Record<string, unknown>, completed: boolean = false) => {
      if (!state.applicationId) {
        setState((prev) => ({ ...prev, error: 'No application found' }));
        return;
      }

      setState((prev) => ({ ...prev, saving: true, error: null }));
      
      try {
        // Check if this step has a file that needs uploading
        let processedData = { ...data };
        
        if (UPLOAD_STEPS.includes(stepNumber) && data.file instanceof File) {
          // Get current user ID
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Upload file to storage
          const { path, url } = await uploadFile(data.file as File, stepNumber, user.id);
          
          // Replace file object with storage metadata
          const file = data.file as File;
          processedData = {
            ...data,
            file: undefined, // Remove the File object
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: path,
            storage_url: url,
            uploaded_at: new Date().toISOString(),
          };
        }

        // Remove any File objects from data (can't serialize to JSON)
        const cleanData = Object.fromEntries(
          Object.entries(processedData).filter(([_, v]) => !(v instanceof File))
        );

        await api.post(`/applications/${state.applicationId}/steps`, {
          step_number: stepNumber,
          data: cleanData,
          status: completed ? 'completed' : 'in_progress',
        });

        initialDataRef.current = cleanData;

        setState((prev) => ({
          ...prev,
          steps: {
            ...prev.steps,
            [stepNumber]: { data: cleanData, status: completed ? 'completed' : 'in_progress' },
          },
          saving: false,
          hasUnsavedChanges: false,
        }));
      } catch (err) {
        console.error('Save step error:', err);
        setState((prev) => ({
          ...prev,
          saving: false,
          error: err instanceof Error ? err.message : 'Failed to save step',
        }));
      }
    },
    [state.applicationId, uploadFile]
  );

  const submitApplication = useCallback(async () => {
    if (!state.applicationId) {
      setState((prev) => ({ ...prev, error: 'No application found' }));
      return;
    }

    setState((prev) => ({ ...prev, saving: true, error: null }));
    try {
      await api.post(`/applications/${state.applicationId}/submit`, {});

      setState((prev) => ({
        ...prev,
        applicationStatus: 'submitted',
        saving: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : 'Failed to submit application',
      }));
    }
  }, [state.applicationId]);

  const skipStep = useCallback(
    async (stepNumber: number) => {
      if (!state.applicationId) {
        setState((prev) => ({ ...prev, error: 'No application found' }));
        return;
      }

      setState((prev) => ({ ...prev, saving: true, error: null }));
      try {
        await api.post(`/applications/${state.applicationId}/steps`, {
          step_number: stepNumber,
          data: { skip: true },
          status: 'completed',
        });

        setState((prev) => ({
          ...prev,
          steps: {
            ...prev.steps,
            [stepNumber]: { data: { skip: true }, status: 'completed' },
          },
          saving: false,
          hasUnsavedChanges: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: err instanceof Error ? err.message : 'Failed to skip step',
        }));
      }
    },
    [state.applicationId]
  );

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 22),
      hasUnsavedChanges: false,
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  const getStepData = useCallback(
    (stepNumber: number): Record<string, unknown> => {
      return state.steps[stepNumber]?.data || {};
    },
    [state.steps]
  );

  const isStepCompleted = useCallback(
    (stepNumber: number): boolean => {
      const step = state.steps[stepNumber];
      return step?.status === 'completed';
    },
    [state.steps]
  );

  const completedCount = Object.values(state.steps).filter(
    (s) => s.status === 'completed'
  ).length;

  const confirmLeave = useCallback((): boolean => {
    if (state.hasUnsavedChanges) {
      return window.confirm('You have unsaved changes. Are you sure you want to leave?');
    }
    return true;
  }, [state.hasUnsavedChanges]);

  return {
    ...state,
    isLocked,
    completedCount,
    loadApplication,
    saveStep,
    skipStep,
    submitApplication,
    goToStep,
    nextStep,
    prevStep,
    getStepData,
    isStepCompleted,
    markDirty,
    confirmLeave,
    updateLocalStepData,
  };
}
