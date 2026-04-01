import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { AgreementViewModal } from '../../components/admin/AgreementViewModal';
import { formatDate } from '../../lib/utils';

// Build API URL the same way as lib/api.ts
// BASE_URL is http://localhost:8000 (no /api)
// Endpoints from backend include /admin/... so we add /api prefix
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Applicant {
  id: string;
  user_id: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  submitted_at?: string;
}

interface DocumentSummary {
  application_id: string;
  applicant_name: string;
  status: string;
  documents: {
    generated: Array<{
      type: string;
      name: string;
      endpoint: string;
    }>;
    agreements: Array<{
      type: string;
      name: string;
      signed: boolean;
      signed_date?: string;
      endpoint: string;
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

export default function DocumentsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Agreement view modal state
  const [agreementModal, setAgreementModal] = useState<{
    isOpen: boolean;
    name: string;
    pdfUrl: string | null;
    loading: boolean;
  }>({ isOpen: false, name: '', pdfUrl: null, loading: false });

  // Load applicants on mount
  useEffect(() => {
    loadApplicants();
  }, []);

  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Authorization': `Bearer ${session?.access_token}`,
    };
  }

  async function loadApplicants() {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.get<{ applications: Applicant[] }>('/admin/pipeline');
      setApplicants(data.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments(applicant: Applicant) {
    try {
      setLoadingDocs(true);
      setError(null);
      setSelectedApplicant(applicant);
      
      const data = await api.get<DocumentSummary>(`/admin/applicants/${applicant.id}/documents-summary`);
      setDocumentSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setDocumentSummary(null);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function downloadPdf(endpoint: string, filename: string) {
    try {
      setDownloadingId(endpoint);
      const headers = await getAuthHeaders();
      
      // endpoint is like "/admin/applicants/{id}/pdf/application"
      // BASE_URL is "http://localhost:8000", we add /api prefix
      const res = await fetch(`${BASE_URL}/api${endpoint}`, { headers });
      
      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await res.blob();
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

  async function viewAgreement(endpoint: string, name: string) {
    try {
      setAgreementModal({ isOpen: true, name, pdfUrl: null, loading: true });
      
      const headers = await getAuthHeaders();
      // endpoint is like "/admin/applicants/{id}/pdf/agreement/confidentiality"
      const res = await fetch(`${BASE_URL}/api${endpoint}`, { headers });
      
      if (!res.ok) {
        throw new Error('Failed to load agreement');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      setAgreementModal({ isOpen: true, name, pdfUrl: url, loading: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to view agreement');
      setAgreementModal({ isOpen: false, name: '', pdfUrl: null, loading: false });
    }
  }

  function closeAgreementModal() {
    // Revoke the blob URL to free memory
    if (agreementModal.pdfUrl) {
      window.URL.revokeObjectURL(agreementModal.pdfUrl);
    }
    setAgreementModal({ isOpen: false, name: '', pdfUrl: null, loading: false });
  }

  async function viewDocument(endpoint: string) {
    try {
      setDownloadingId(endpoint);
      
      // Use api.get which handles the URL correctly
      const data = await api.get<{ signed_url: string }>(endpoint);
      if (data.signed_url) {
        window.open(data.signed_url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to view document');
    } finally {
      setDownloadingId(null);
    }
  }

  // Filter applicants based on search
  const filteredApplicants = useMemo(() => {
    if (!searchQuery.trim()) return applicants;
    
    const query = searchQuery.toLowerCase();
    return applicants.filter(app => 
      app.first_name?.toLowerCase().includes(query) ||
      app.last_name?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query)
    );
  }, [applicants, searchQuery]);

  const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
    switch (status) {
      case 'approved':
      case 'hired':
        return 'success';
      case 'submitted':
      case 'under_review':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading applicants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Documents</h1>
        <p className="mt-1 text-sm text-gray">
          View and download applicant documents, agreements, and generated forms.
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Panel: Applicant List */}
        <div className="lg:col-span-1">
          <Card>
            <div className="p-4 border-b border-border">
              <Input
                placeholder="Search applicants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="max-h-[600px] overflow-y-auto">
              {filteredApplicants.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray">
                  {searchQuery ? 'No applicants match your search' : 'No applicants found'}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredApplicants.map((applicant) => (
                    <button
                      key={applicant.id}
                      onClick={() => loadDocuments(applicant)}
                      className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${
                        selectedApplicant?.id === applicant.id ? 'bg-maroon/5 border-l-2 border-maroon' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate">
                            {applicant.first_name} {applicant.last_name}
                          </p>
                          <p className="text-xs text-gray truncate">{applicant.email}</p>
                        </div>
                        <Badge variant={getStatusVariant(applicant.status)} className="text-xs">
                          {applicant.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel: Document Viewer */}
        <div className="lg:col-span-2">
          {!selectedApplicant ? (
            <Card className="flex h-[600px] items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-3 text-sm text-gray">Select an applicant to view their documents</p>
              </div>
            </Card>
          ) : loadingDocs ? (
            <Card className="flex h-[600px] items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="mt-3 text-sm text-gray">Loading documents...</p>
              </div>
            </Card>
          ) : documentSummary ? (
            <div className="space-y-4">
              {/* Header */}
              <Card>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-navy">
                      {documentSummary.applicant_name}
                    </h2>
                    <p className="text-sm text-gray">Application ID: {documentSummary.application_id}</p>
                  </div>
                  <Badge variant={getStatusVariant(documentSummary.status)}>
                    {documentSummary.status}
                  </Badge>
                </div>
              </Card>

              {/* Generated Documents */}
              <Card header="Generated Documents">
                <div className="divide-y divide-border">
                  {documentSummary.documents.generated.map((doc) => (
                    <div key={doc.type} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-slate">{doc.name}</p>
                          <p className="text-xs text-gray">Auto-generated from application data</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadPdf(doc.endpoint, `${documentSummary.applicant_name.replace(/\s+/g, '_')}_${doc.type}.pdf`)}
                        loading={downloadingId === doc.endpoint}
                      >
                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Signed Agreements */}
              <Card header="Signed Agreements">
                {documentSummary.documents.agreements.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray">
                    No agreements signed yet
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {documentSummary.documents.agreements.map((agreement) => (
                      <div key={agreement.type} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            agreement.signed ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {agreement.signed ? (
                              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate">{agreement.name}</p>
                            {agreement.signed && agreement.signed_date && (
                              <p className="text-xs text-gray">
                                Signed on {formatDate(agreement.signed_date)}
                              </p>
                            )}
                          </div>
                        </div>
                        {agreement.signed && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => viewAgreement(agreement.endpoint, agreement.name)}
                            >
                              <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => downloadPdf(agreement.endpoint, `${documentSummary.applicant_name.replace(/\s+/g, '_')}_${agreement.type}.pdf`)}
                              loading={downloadingId === agreement.endpoint}
                            >
                              <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Uploaded Documents */}
              <Card header="Uploaded Documents">
                {documentSummary.documents.uploaded.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray">
                    No documents uploaded yet
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {documentSummary.documents.uploaded.map((doc) => (
                      <div key={doc.step_number} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-maroon/10">
                            <svg className="h-5 w-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-slate">{doc.name}</p>
                            <p className="text-xs text-gray">
                              {doc.filename || 'File uploaded'}
                              {doc.uploaded_at && ` • ${formatDate(doc.uploaded_at)}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewDocument(doc.endpoint)}
                          loading={downloadingId === doc.endpoint}
                        >
                          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <Card className="flex h-[600px] items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="mt-3 text-sm text-gray">Failed to load documents</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Agreement View Modal */}
      <AgreementViewModal
        isOpen={agreementModal.isOpen}
        onClose={closeAgreementModal}
        pdfUrl={agreementModal.pdfUrl}
        agreementName={agreementModal.name}
        loading={agreementModal.loading}
      />
    </div>
  );
}
