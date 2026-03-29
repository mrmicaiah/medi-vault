import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { ApplicationStep, TOTAL_STEPS } from '../types';

interface ApplicationState {
  applicationId: string | null;
  currentStep: number;
  steps: Record<number, { data: Record<string, unknown>; status: string }>;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export function useApplication() {
  const [state, setState] = useState<ApplicationState>({
    applicationId: null,
    currentStep: 1,
    steps: {},
    loading: false,
    saving: false,
    error: null,
  });

  const loadApplication = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await api.get<{
        application: { id: string; current_step: number };
        steps: ApplicationStep[];
      }>('/applications/me');

      const stepsMap: Record<number, { data: Record<string, unknown>; status: string }> = {};
      res.steps.forEach((step) => {
        stepsMap[step.step_number] = { data: step.data, status: step.status };
      });

      setState((prev) => ({
        ...prev,
        applicationId: res.application.id,
        currentStep: res.application.current_step,
        steps: stepsMap,
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load application',
      }));
    }
  }, []);

  const saveStep = useCallback(
    async (stepNumber: number, data: Record<string, unknown>, completed: boolean = false) => {
      setState((prev) => ({ ...prev, saving: true, error: null }));
      try {
        await api.post(`/applications/${state.applicationId}/steps`, {
          step_number: stepNumber,
          data,
          status: completed ? 'completed' : 'in_progress',
        });

        setState((prev) => ({
          ...prev,
          steps: {
            ...prev.steps,
            [stepNumber]: { data, status: completed ? 'completed' : 'in_progress' },
          },
          saving: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          saving: false,
          error: err instanceof Error ? err.message : 'Failed to save step',
        }));
      }
    },
    [state.applicationId]
  );

  const skipStep = useCallback(
    async (stepNumber: number) => {
      setState((prev) => ({ ...prev, saving: true, error: null }));
      try {
        await api.post(`/applications/${state.applicationId}/steps`, {
          step_number: stepNumber,
          data: {},
          status: 'skipped',
        });

        setState((prev) => ({
          ...prev,
          steps: {
            ...prev.steps,
            [stepNumber]: { data: {}, status: 'skipped' },
          },
          saving: false,
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
      return step?.status === 'completed' || step?.status === 'skipped';
    },
    [state.steps]
  );

  const completedCount = Object.values(state.steps).filter(
    (s) => s.status === 'completed' || s.status === 'skipped'
  ).length;

  return {
    ...state,
    completedCount,
    loadApplication,
    saveStep,
    skipStep,
    goToStep,
    nextStep,
    prevStep,
    getStepData,
    isStepCompleted,
  };
}
