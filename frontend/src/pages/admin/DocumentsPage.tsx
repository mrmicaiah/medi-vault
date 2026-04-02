import { useState, useEffect, useMemo } from 'react';
import { api, API_URL } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { AgreementViewModal } from '../../components/admin/AgreementViewModal';
import { DocumentPreviewModal } from '../../components/admin/DocumentPreviewModal';
import { formatDate } from '../../lib/utils';

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

export default function DocumentsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Slide-out panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'generated' | 'agreements' | 'uploaded'>('generated');
  
  // HTML preview modal state (for agreements and employment application)
  const [htmlPreviewModal, setHtmlPreviewModal] = useState<{
    isOpen: boolean;
    name: string;
    htmlContent: string | null;
    loading: boolean;
    pdfEndpoint: string | null;
  }>({ isOpen: false, name: '', htmlContent: null, loading: false, pdfEndpoint: null });

  // Document preview modal state - shows images/PDFs
  const [documentModal, setDocumentModal] = useState<{
    isOpen: boolean;
    name: string;
    url: string | null;
    fileName?: string;
    loading: boolean;
  }>({ isOpen: false, name: '', url: null, loading: false });

  // Load applicants on mount
  useEffect(() => {
    loadApplicants();
  }, []);

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
      setPanelOpen(true);
      setActiveTab('generated');
      
      const data = await api.get<DocumentSummary>(`/admin/applicants/${applicant.id}/documents-summary`);
      setDocumentSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      setDocumentSummary(null);
    } finally {
      setLoadingDocs(false);
    }
  }

  function closePanel() {
    setPanelOpen(false);
    setTimeout(() => {
      setSelectedApplicant(null);
      setDocumentSummary(null);
    }, 250);
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
      setError(err instanceof Error ? err.message : 'Failed to download PDF. This feature requires the production server.');
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
      
      if (!res.ok) {
        throw new Error('Failed to load preview');
      }
      
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

  // Filter applicants based on search and status
  const filteredApplicants = useMemo(() => {
    return applicants.filter(app => {
      const matchesSearch = !searchQuery.trim() || 
        app.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [applicants, searchQuery, statusFilter]);

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

  // Count documents
  const getDocumentCounts = () => {
    if (!documentSummary) return { generated: 0, agreements: 0, uploaded: 0 };
    return {
      generated: documentSummary.documents.generated.length,
      agreements: documentSummary.documents.onboarding_agreements.length,
      uploaded: documentSummary.documents.uploaded.length,
    };
  };

  const counts = getDocumentCounts();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Documents</h1>
          <p className="mt-1 text-sm text-gray">
            View and download applicant documents, agreements, and generated forms.
          </p>
        </div>
        <span className="text-sm text-gray">{applicants.length} applicants</span>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card padding="none">
        {/* Filters */}
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={(e) => e.preventDefault()} className="w-full sm:max-w-xs">
              <Input
                placeholder="Search applicants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
            <div className="flex gap-2">
              {['all', 'submitted', 'under_review', 'approved', 'hired', 'rejected'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? 'border-maroon bg-maroon-subtle text-maroon'
                      : 'border-border text-gray hover:bg-gray-50'
                  }`}
                >
                  {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredApplicants.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-3 text-sm text-gray">
              {searchQuery || statusFilter !== 'all' ? 'No applicants match your filters' : 'No applicants found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Submitted</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplicants.map((applicant) => (
                  <tr
                    key={applicant.id}
                    onClick={() => loadDocuments(applicant)}
                    className={`border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-gray-50/50 ${
                      selectedApplicant?.id === applicant.id && panelOpen ? 'bg-maroon/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate">
                          {applicant.first_name} {applicant.last_name}
                        </p>
                        <p className="text-xs text-gray truncate">{applicant.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(applicant.status)} className="text-xs">
                        {applicant.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray">
                      {applicant.submitted_at ? formatDate(applicant.submitted_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadDocuments(applicant);
                        }}
                      >
                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Documents
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Slide-out Panel */}
      {selectedApplicant && (
        <>
          <div
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-250 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closePanel}
          />
          <div className={`fixed top-0 right-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="px-6 py-5 bg-navy flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedApplicant.first_name} {selectedApplicant.last_name}
                </h2>
                <p className="text-sm text-white/70">{selectedApplicant.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getStatusVariant(selectedApplicant.status)} className="text-xs">
                  {selectedApplicant.status.replace('_', ' ')}
                </Badge>
                <button onClick={closePanel} className="text-white/60 hover:text-white text-2xl leading-none p-1">×</button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border bg-white flex-shrink-0">
              <button
                onClick={() => setActiveTab('generated')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'generated' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Application
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">{counts.generated}</span>
              </button>
              <button
                onClick={() => setActiveTab('agreements')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'agreements' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Agreements
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">{counts.agreements}</span>
              </button>
              <button
                onClick={() => setActiveTab('uploaded')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'uploaded' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Uploads
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">{counts.uploaded}</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {loadingDocs ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : !documentSummary ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray">Failed to load documents</p>
                </div>
              ) : activeTab === 'generated' ? (
                /* Generated Documents Tab */
                <div className="space-y-3">
                  {documentSummary.documents.generated.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                      <p className="text-sm text-gray">No generated documents yet</p>
                    </div>
                  ) : (
                    documentSummary.documents.generated.map((doc) => (
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
                            {doc.preview_endpoint && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => viewHtmlPreview(doc.preview_endpoint!, doc.endpoint, doc.name)}
                              >
                                View
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => downloadPdf(doc.endpoint, `${documentSummary.applicant_name.replace(/\s+/g, '_')}_${doc.type}.pdf`)}
                              loading={downloadingId === doc.endpoint}
                            >
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'agreements' ? (
                /* Agreements Tab */
                <div className="space-y-3">
                  {documentSummary.documents.onboarding_agreements.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                      <p className="text-sm text-gray">No agreements signed yet</p>
                    </div>
                  ) : (
                    documentSummary.documents.onboarding_agreements.map((agreement) => (
                      <div key={agreement.type} className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between">
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => viewHtmlPreview(
                                  agreement.preview_endpoint || agreement.endpoint.replace('/pdf/agreement/', '/agreement/') + '/preview',
                                  agreement.endpoint,
                                  agreement.name
                                )}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => downloadPdf(agreement.endpoint, `${documentSummary.applicant_name.replace(/\s+/g, '_')}_${agreement.type}.pdf`)}
                                loading={downloadingId === agreement.endpoint}
                              >
                                Download
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Uploaded Documents Tab */
                <div className="space-y-3">
                  {documentSummary.documents.uploaded.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                      <p className="text-sm text-gray">No documents uploaded yet</p>
                    </div>
                  ) : (
                    documentSummary.documents.uploaded.map((doc) => (
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => viewDocument(doc.endpoint, doc.name, doc.filename)}
                            loading={downloadingId === doc.endpoint}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* HTML Preview Modal - for agreements and employment application */}
      <AgreementViewModal
        isOpen={htmlPreviewModal.isOpen}
        onClose={closeHtmlPreviewModal}
        htmlContent={htmlPreviewModal.htmlContent}
        agreementName={htmlPreviewModal.name}
        loading={htmlPreviewModal.loading}
        onDownload={htmlPreviewModal.pdfEndpoint ? () => {
          if (htmlPreviewModal.pdfEndpoint && documentSummary) {
            downloadPdf(
              htmlPreviewModal.pdfEndpoint,
              `${documentSummary.applicant_name.replace(/\s+/g, '_')}_document.pdf`
            );
          }
        } : undefined}
      />

      {/* Document Preview Modal - shows images/PDFs */}
      <DocumentPreviewModal
        isOpen={documentModal.isOpen}
        onClose={closeDocumentModal}
        documentUrl={documentModal.url}
        documentName={documentModal.name}
        fileName={documentModal.fileName}
        loading={documentModal.loading}
      />
    </div>
  );
}
