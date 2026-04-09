import { useState, useEffect } from 'react';
import { api, API_URL } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { AgreementViewModal } from './AgreementViewModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DocumentSummary {
  application_id: string;
  applicant_name: string;
  status: string;
  documents: {
    generated: Array<{
      type: string;
      name: string;
      endpoint: string;
      preview_endpoint?: string | null;
    }>;
    onboarding_agreements: Array<{
      type: string;
      name: string;
      signed: boolean;
      signed_date?: string;
      endpoint: string;
      preview_endpoint?: string;
    }>;
    uploaded: Array<{
      type: string;
      name: string;
      step_number: number;
      filename?: string;
      uploaded_at?: string;
      endpoint: string;
    }>;
  };
}

interface EmployeeDocuments {
  employee_id: string;
  employee_name: string;
  application_id: string | null;
  documents: {
    uploaded: Array<{
      id: string;
      type: string;
      filename: string;
      uploaded_at: string;
      expires_at?: string;
      storage_path: string;
    }>;
    agreements: Array<{
      type: string;
      name: string;
      signed: boolean;
      signed_date?: string;
      endpoint: string;
    }>;
    generated: Array<{
      type: string;
      name: string;
      endpoint: string;
    }>;
  };
}

// Step names for missing uploads display
const UPLOAD_STEP_NAMES: Record<number, string> = {
  11: 'Work Authorization',
  12: 'ID Front',
  13: 'ID Back',
  14: 'Social Security Card',
  15: 'Credentials',
  16: 'CPR Certification',
  17: 'TB Test',
};

const ALL_UPLOAD_STEPS = [11, 12, 13, 14, 15, 16, 17];

interface DocumentTabsProps {
  // For applicants - use applicationId
  applicationId?: string;
  // For employees - use employeeId
  employeeId?: string;
  // Name for PDF downloads (supports both applicantName and personName for backwards compatibility)
  applicantName?: string;
  personName?: string;
  activeTab: 'uploads' | 'agreements' | 'application';
  onTabChange: (tab: 'uploads' | 'agreements' | 'application') => void;
  // Optional: hide tab nav if parent is managing it
  hideTabNav?: boolean;
}

export function DocumentTabs({ 
  applicationId, 
  employeeId, 
  applicantName,
  personName, 
  activeTab, 
  onTabChange,
  hideTabNav = false 
}: DocumentTabsProps) {
  // Support both applicantName (old) and personName (new) for backwards compatibility
  const displayName = personName || applicantName || 'Person';
  
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [employeeDocuments, setEmployeeDocuments] = useState<EmployeeDocuments | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // HTML preview modal state (for agreements and generated docs)
  const [htmlPreviewModal, setHtmlPreviewModal] = useState<{
    isOpen: boolean;
    name: string;
    htmlContent: string | null;
    loading: boolean;
    pdfEndpoint: string | null;
  }>({ isOpen: false, name: '', htmlContent: null, loading: false, pdfEndpoint: null });

  // Document preview modal state (for uploads)
  const [documentModal, setDocumentModal] = useState<{
    isOpen: boolean;
    name: string;
    url: string | null;
    fileName?: string;
    loading: boolean;
  }>({ isOpen: false, name: '', url: null, loading: false });

  const isEmployee = !!employeeId;
  const id = applicationId || employeeId || '';

  // Load documents when tab becomes active (lazy loading)
  useEffect(() => {
    if (!hasLoaded && id) {
      loadDocuments();
    }
  }, [id, hasLoaded]);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError(null);
      
      if (isEmployee) {
        const data = await api.get<EmployeeDocuments>(`/admin/employees/${employeeId}/documents`);
        setEmployeeDocuments(data);
      } else {
        const data = await api.get<DocumentSummary>(`/admin/applicants/${applicationId}/documents-summary`);
        setDocumentSummary(data);
      }
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf(endpoint: string, filename: string) {
    try {
      setDownloadingId(endpoint);
      const blob = await api.fetchBlob(endpoint);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  }

  async function viewHtmlPreview(previewEndpoint: string, pdfEndpoint: string, name: string) {
    try {
      setHtmlPreviewModal({ isOpen: true, name, htmlContent: null, loading: true, pdfEndpoint });
      
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_URL}${previewEndpoint}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!res.ok) throw new Error('Failed to load preview');
      
      const htmlContent = await res.text();
      setHtmlPreviewModal({ isOpen: true, name, htmlContent, loading: false, pdfEndpoint });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to view document');
      setHtmlPreviewModal({ isOpen: false, name: '', htmlContent: null, loading: false, pdfEndpoint: null });
    }
  }

  function closeHtmlPreviewModal() {
    setHtmlPreviewModal({ isOpen: false, name: '', htmlContent: null, loading: false, pdfEndpoint: null });
  }

  async function viewDocument(endpoint: string, name: string, fileName?: string) {
    try {
      setDocumentModal({ isOpen: true, name, url: null, fileName, loading: true });
      
      const data = await api.get<{ signed_url: string; file_name?: string }>(endpoint);
      
      if (data.signed_url) {
        setDocumentModal({ 
          isOpen: true, 
          name, 
          url: data.signed_url, 
          fileName: data.file_name || fileName,
          loading: false 
        });
      } else {
        throw new Error('No URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to view document');
      setDocumentModal({ isOpen: false, name: '', url: null, loading: false });
    }
  }

  function closeDocumentModal() {
    setDocumentModal({ isOpen: false, name: '', url: null, loading: false });
  }

  // Get counts for applicants
  const getApplicantCounts = () => {
    if (!documentSummary) return { uploads: 0, agreements: 0, application: 0, missingUploads: 0 };
    
    const uploadedSteps = new Set(documentSummary.documents.uploaded.map(d => d.step_number));
    const missingUploads = ALL_UPLOAD_STEPS.filter(step => !uploadedSteps.has(step)).length;
    
    return {
      uploads: documentSummary.documents.uploaded.length,
      agreements: documentSummary.documents.onboarding_agreements.filter(a => a.signed).length,
      application: documentSummary.documents.generated.length,
      missingUploads,
    };
  };

  // Get counts for employees
  const getEmployeeCounts = () => {
    if (!employeeDocuments) return { uploads: 0, agreements: 0, application: 0, missingUploads: 0 };
    
    return {
      uploads: employeeDocuments.documents.uploaded.length,
      agreements: employeeDocuments.documents.agreements.filter(a => a.signed).length,
      application: employeeDocuments.documents.generated.length,
      missingUploads: 0, // Employees don't track missing uploads
    };
  };

  const counts = isEmployee ? getEmployeeCounts() : getApplicantCounts();

  // Get missing uploads (applicants only)
  const getMissingUploads = () => {
    if (isEmployee || !documentSummary) return [];
    const uploadedSteps = new Set(documentSummary.documents.uploaded.map(d => d.step_number));
    return ALL_UPLOAD_STEPS
      .filter(step => !uploadedSteps.has(step))
      .map(step => ({ step, name: UPLOAD_STEP_NAMES[step] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 border border-error/30 rounded-lg p-4 text-center">
        <p className="text-sm text-error">{error}</p>
        <button onClick={loadDocuments} className="mt-2 text-xs text-maroon hover:underline">
          Try Again
        </button>
      </div>
    );
  }

  if (!documentSummary && !employeeDocuments) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray">No documents available</p>
      </div>
    );
  }

  // Get documents based on source type
  const uploadedDocs = isEmployee 
    ? employeeDocuments?.documents.uploaded || []
    : documentSummary?.documents.uploaded || [];
  
  const agreementDocs = isEmployee
    ? employeeDocuments?.documents.agreements || []
    : documentSummary?.documents.onboarding_agreements || [];
  
  const generatedDocs = isEmployee
    ? employeeDocuments?.documents.generated || []
    : documentSummary?.documents.generated || [];

  // For employees, we need the application_id for preview endpoints
  const appIdForPreview = isEmployee 
    ? employeeDocuments?.application_id 
    : applicationId;

  return (
    <>
      {/* Tab Navigation (optional - can be hidden if parent manages it) */}
      {!hideTabNav && (
        <div className="flex border-b border-border bg-white -mx-5 px-5">
          <button
            onClick={() => onTabChange('uploads')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'uploads' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
            }`}
          >
            Uploads
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${counts.missingUploads > 0 ? 'bg-warning/20 text-warning' : 'bg-gray-100'}`}>
              {counts.uploads}{!isEmployee && `/${ALL_UPLOAD_STEPS.length}`}
            </span>
          </button>
          <button
            onClick={() => onTabChange('agreements')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'agreements' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
            }`}
          >
            Agreements
            <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">{counts.agreements}</span>
          </button>
          <button
            onClick={() => onTabChange('application')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'application' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
            }`}
          >
            Application
            <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">{counts.application}</span>
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className={hideTabNav ? '' : 'mt-4'}>
        {activeTab === 'uploads' && (
          <div className="space-y-3">
            {/* Missing uploads warning (applicants only) */}
            {!isEmployee && getMissingUploads().length > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium text-warning text-sm">Missing Uploads</span>
                </div>
                <ul className="text-xs text-warning/80 space-y-1">
                  {getMissingUploads().map(({ step, name }) => (
                    <li key={step}>• {name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {uploadedDocs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="text-3xl mb-2">📎</div>
                <p className="text-sm text-gray">No documents uploaded yet</p>
              </div>
            ) : (
              isEmployee ? (
                // Employee uploads (from documents table)
                (uploadedDocs as EmployeeDocuments['documents']['uploaded']).map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-maroon/10">
                          <svg className="h-5 w-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-slate text-sm">{doc.type}</p>
                          <p className="text-xs text-gray">
                            {doc.filename || 'File uploaded'}
                            {doc.uploaded_at && ` • ${formatDate(doc.uploaded_at)}`}
                          </p>
                          {doc.expires_at && (
                            <p className="text-xs text-warning">
                              Expires {formatDate(doc.expires_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray">View in profile</span>
                    </div>
                  </div>
                ))
              ) : (
                // Applicant uploads (from application steps)
                (uploadedDocs as DocumentSummary['documents']['uploaded']).map((doc) => (
                  <div key={doc.step_number} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-maroon/10">
                          <svg className="h-5 w-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-slate text-sm">{doc.name}</p>
                          <p className="text-xs text-gray">
                            {doc.filename || 'File uploaded'}
                            {doc.uploaded_at && ` • ${formatDate(doc.uploaded_at)}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => viewDocument(doc.endpoint, doc.name, doc.filename)}
                        className="px-3 py-1.5 text-sm font-medium text-maroon hover:bg-maroon/5 rounded-lg transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}

        {activeTab === 'agreements' && (
          <div className="space-y-3">
            {agreementDocs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-sm text-gray">No agreements signed yet</p>
              </div>
            ) : (
              agreementDocs.map((agreement) => (
                <div key={agreement.type} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        agreement.signed ? 'bg-success/10' : 'bg-gray-100'
                      }`}>
                        {agreement.signed ? (
                          <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate text-sm">{agreement.name}</p>
                        {agreement.signed && agreement.signed_date ? (
                          <p className="text-xs text-gray">Signed {formatDate(agreement.signed_date)}</p>
                        ) : (
                          <p className="text-xs text-warning">Pending signature</p>
                        )}
                      </div>
                    </div>
                    {agreement.signed && (
                      <div className="flex gap-2">
                        {appIdForPreview && (
                          <button
                            onClick={() => viewHtmlPreview(
                              `/admin/applicants/${appIdForPreview}/agreement/${agreement.type}/preview`,
                              agreement.endpoint,
                              agreement.name
                            )}
                            className="px-3 py-1.5 text-sm font-medium text-maroon hover:bg-maroon/5 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        )}
                        <button
                          onClick={() => downloadPdf(agreement.endpoint, `${displayName.replace(/\s+/g, '_')}_${agreement.type}.pdf`)}
                          disabled={downloadingId === agreement.endpoint}
                          className="px-3 py-1.5 text-sm font-medium text-gray hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {downloadingId === agreement.endpoint ? '...' : 'PDF'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'application' && (
          <div className="space-y-3">
            {generatedDocs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <div className="text-3xl mb-2">📄</div>
                <p className="text-sm text-gray">No generated documents yet</p>
              </div>
            ) : (
              generatedDocs.map((doc) => {
                // Build preview endpoint based on doc type
                const previewEndpoint = appIdForPreview && doc.type === 'application' 
                  ? `/admin/applicants/${appIdForPreview}/application/preview`
                  : (doc as DocumentSummary['documents']['generated'][0]).preview_endpoint || null;
                
                return (
                  <div key={doc.type} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-slate text-sm">{doc.name}</p>
                          <p className="text-xs text-gray">Generated from application</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {previewEndpoint && (
                          <button
                            onClick={() => viewHtmlPreview(previewEndpoint, doc.endpoint, doc.name)}
                            className="px-3 py-1.5 text-sm font-medium text-maroon hover:bg-maroon/5 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        )}
                        <button
                          onClick={() => downloadPdf(doc.endpoint, `${displayName.replace(/\s+/g, '_')}_${doc.type}.pdf`)}
                          disabled={downloadingId === doc.endpoint}
                          className="px-3 py-1.5 text-sm font-medium text-gray hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {downloadingId === doc.endpoint ? '...' : 'PDF'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* HTML Preview Modal */}
      <AgreementViewModal
        isOpen={htmlPreviewModal.isOpen}
        onClose={closeHtmlPreviewModal}
        htmlContent={htmlPreviewModal.htmlContent}
        agreementName={htmlPreviewModal.name}
        loading={htmlPreviewModal.loading}
        onDownload={htmlPreviewModal.pdfEndpoint ? () => {
          if (htmlPreviewModal.pdfEndpoint) {
            downloadPdf(
              htmlPreviewModal.pdfEndpoint,
              `${displayName.replace(/\s+/g, '_')}_document.pdf`
            );
          }
        } : undefined}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={documentModal.isOpen}
        onClose={closeDocumentModal}
        documentUrl={documentModal.url}
        documentName={documentModal.name}
        fileName={documentModal.fileName}
        loading={documentModal.loading}
      />
    </>
  );
}
