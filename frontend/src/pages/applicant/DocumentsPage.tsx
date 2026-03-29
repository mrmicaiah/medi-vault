import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

export function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Documents</h1>
        <p className="mt-1 text-sm text-gray">
          Manage your documents and certifications.
        </p>
      </div>

      <Alert variant="info">
        Document management is available from your Dashboard. 
        You can upload, view, and update your documents there.
      </Alert>

      <Card>
        <div className="py-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 font-medium text-slate">Document Center Coming Soon</h3>
          <p className="mt-2 text-sm text-gray">
            A dedicated document management area is in development.
            For now, manage your documents from the Dashboard.
          </p>
          <Link to="/applicant" className="mt-4 inline-block">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
