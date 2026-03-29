import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { STEP_NAMES, TOTAL_STEPS, ApplicationStatus } from '../../types';

interface StepData {
  data: Record<string, unknown>;
  status: string;
}

interface ReadOnlyApplicationProps {
  steps: Record<number, StepData>;
  applicationStatus: ApplicationStatus;
}

const STEP_CATEGORIES = {
  'Personal Information': [1, 2, 3],
  'Background': [4, 5, 6, 7, 8],
  'Agreements': [9, 10],
  'Documents': [11, 12, 13, 14, 15, 16, 17],
  'Final Steps': [18, 19, 20, 21, 22],
};

export function ReadOnlyApplication({ steps, applicationStatus }: ReadOnlyApplicationProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Personal Information');

  const getStatusBadge = () => {
    switch (applicationStatus) {
      case 'submitted':
      case 'under_review':
        return <Badge variant="warning">Under Review</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="error">Not Approved</Badge>;
      default:
        return <Badge variant="neutral">{applicationStatus}</Badge>;
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '--';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const renderStepData = (stepNumber: number) => {
    const step = steps[stepNumber];
    if (!step || !step.data) return <p className="text-sm text-gray">No data</p>;

    const data = step.data;
    
    // Skip internal fields
    const displayData = Object.entries(data).filter(
      ([key]) => !['skip', 'file', 'file_size'].includes(key)
    );

    if (displayData.length === 0) {
      if (data.skip) {
        return <p className="text-sm text-warning">Skipped - needs to be uploaded</p>;
      }
      return <p className="text-sm text-gray">Completed</p>;
    }

    return (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {displayData.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs text-gray capitalize">
              {key.replace(/_/g, ' ')}
            </dt>
            <dd className="text-sm text-slate">
              {formatValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">
            Your Application
          </h1>
          <p className="mt-1 text-sm text-gray">
            Review your submitted application information.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <Link to="/applicant">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      {applicationStatus === 'submitted' || applicationStatus === 'under_review' ? (
        <Alert variant="info" title="Application Under Review">
          Your application is being reviewed by our team. You'll be notified when there's an update.
          You can still upload any missing documents from your Dashboard.
        </Alert>
      ) : applicationStatus === 'approved' ? (
        <Alert variant="success" title="Congratulations!">
          Your application has been approved. Check your email for next steps.
        </Alert>
      ) : applicationStatus === 'rejected' ? (
        <Alert variant="error" title="Application Not Approved">
          Unfortunately, your application was not approved at this time. 
          Please contact us for more information.
        </Alert>
      ) : null}

      {Object.entries(STEP_CATEGORIES).map(([category, stepNumbers]) => (
        <Card key={category}>
          <button
            onClick={() => setExpandedCategory(
              expandedCategory === category ? null : category
            )}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="font-display text-lg font-semibold text-navy">
              {category}
            </h2>
            <svg
              className={`h-5 w-5 text-gray transition-transform ${
                expandedCategory === category ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedCategory === category && (
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              {stepNumbers.map((stepNum) => {
                const step = steps[stepNum];
                const isCompleted = step?.status === 'completed';
                const isSkipped = step?.data?.skip === true;

                return (
                  <div
                    key={stepNum}
                    className={`rounded-lg border p-4 ${
                      isSkipped 
                        ? 'border-warning bg-warning-bg' 
                        : isCompleted 
                          ? 'border-border bg-white' 
                          : 'border-border bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-slate">
                        {STEP_NAMES[stepNum] || `Step ${stepNum}`}
                      </h3>
                      {isSkipped ? (
                        <Badge variant="warning">Needs Upload</Badge>
                      ) : isCompleted ? (
                        <Badge variant="success">Complete</Badge>
                      ) : (
                        <Badge variant="neutral">Pending</Badge>
                      )}
                    </div>
                    {renderStepData(stepNum)}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
