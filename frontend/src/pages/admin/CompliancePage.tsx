import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';

interface Applicant {
  id: string;
  user_id: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface DocumentItem {
  type: string;
  name: string;
  endpoint?: string;
  step_number?: number;
  filename?: string;
  uploaded_at?: string;
  signed?: boolean;
  signed_date?: string;
}

interface DocumentsSummary {
  application_id: string;
  applicant_name: string;
  status: string;
  documents: {
    uploaded: DocumentItem[];
    agreements: DocumentItem[];
    generated: DocumentItem[];
  };
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://medi-vault-api.onrender.com';

export function CompliancePage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [documentsSummary, setDocumentsSummary] = useState<DocumentsSummary | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadApplicants();
  }, []);

  const loadApplicants = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ applications: Applicant[] }>('/admin/pipeline');
      // Only show submitted or later applicants
      const filtered = (res.applications || []).filter(a => 
        ['submitted', 'under_review', 'approved', 'hired'].includes(a.status)
      );
      setApplicants(filtered);
    } catch (err) {
      console.error('Error loading applicants:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setLoadingDocs(true);
    setDocumentsSummary(null);
    
    try {
      const res = await api.get<DocumentsSummary>(`/admin/applicants/${applicant.id}/documents-summary`);
      setDocumentsSummary(res);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  const downloadPdf = async (endpoint: string, filename: string) => {
    setDownloading(endpoint);
    try {
      const token = localStorage.getItem('supabase_token') || sessionStorage.getItem('supabase_token');
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const viewUploadedDoc = async (endpoint: string) => {
    try {
      const res = await api.get<{ signed_url: string }>(endpoint);
      if (res.signed_url) {
        window.open(res.signed_url, '_blank');
      }
    } catch (err) {
      console.error('Error getting document URL:', err);
      setError(err instanceof Error ? err.message : 'Failed to get document');
    }
  };

  const filteredApplicants = applicants.filter(a => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      a.first_name?.toLowerCase().includes(searchLower) ||
      a.last_name?.toLowerCase().includes(searchLower) ||
      a.email?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'bg-warning/10 text-warning',
      under_review: 'bg-maroon/10 text-maroon',
      approved: 'bg-success/10 text-success',
      hired: 'bg-info/10 text-info',
    };
    const labels: Record<string, string> = {
      submitted: 'Submitted',
      under_review: 'Under Review',
      approved: 'Approved',
      hired: 'Hired',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Documents</h1>
        <p className="mt-1 text-sm text-gray">View and download applicant documents, agreements, and forms</p>
      </div>

      {error && <Alert variant="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Applicant List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <input
                type="text"
                placeholder="Search applicants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
              />
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {filteredApplicants.length === 0 ? (
                <div className="p-6 text-center text-gray text-sm">
                  No applicants with documents
                </div>
              ) : (
                filteredApplicants.map((applicant) => (
                  <button
                    key={applicant.id}
                    onClick={() => loadDocuments(applicant)}
                    className={`w-full px-4 py-3 text-left border-b border-border last:border-0 hover:bg-gray-50 transition-colors ${
                      selectedApplicant?.id === applicant.id ? 'bg-maroon/5 border-l-2 border-l-maroon' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-navy">
                          {applicant.first_name} {applicant.last_name}
                        </p>
                        <p className="text-xs text-gray">{applicant.email}</p>
                      </div>
                      {getStatusBadge(applicant.status)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Document Details */}
        <div className="lg:col-span-2">
          {!selectedApplicant ? (
            <div className="bg-white rounded-xl border border-border p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray">Select an applicant to view their documents</p>
            </div>
          ) : loadingDocs ? (
            <div className="bg-white rounded-xl border border-border p-12 flex items-center justify-center">
              <svg className="h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : documentsSummary ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-navy">{documentsSummary.applicant_name}</h2>
                    <p className="text-sm text-gray">Application #{documentsSummary.application_id.slice(0, 8)}</p>
                  </div>
                  {getStatusBadge(documentsSummary.status)}
                </div>
              </div>

              {/* Generated PDFs */}
              <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-gray-50">
                  <h3 className="text-sm font-semibold text-navy">Generated Documents</h3>
                  <p className="text-xs text-gray mt-0.5">Printable application and forms</p>
                </div>
                <div className="divide-y divide-border">
                  {documentsSummary.documents.generated.map((doc) => (
                    <div key={doc.type} className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-maroon/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-navy">{doc.name}</p>
                          <p className="text-xs text-gray">PDF</p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadPdf(doc.endpoint!, `${documentsSummary.applicant_name.replace(/\s+/g, '_')}_${doc.type}.pdf`)}
                        disabled={downloading === doc.endpoint}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-maroon bg-maroon/10 rounded-lg hover:bg-maroon/20 transition-colors disabled:opacity-50"
                      >
                        {downloading === doc.endpoint ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signed Agreements */}
              {documentsSummary.documents.agreements.length > 0 && (
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-gray-50">
                    <h3 className="text-sm font-semibold text-navy">Signed Agreements</h3>
                    <p className="text-xs text-gray mt-0.5">Consent forms and acknowledgments</p>
                  </div>
                  <div className="divide-y divide-border">
                    {documentsSummary.documents.agreements.map((doc) => (
                      <div key={doc.type} className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-navy">{doc.name}</p>
                            <p className="text-xs text-gray">
                              {doc.signed ? `Signed ${formatDate(doc.signed_date)}` : 'Pending'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadPdf(doc.endpoint!, `${documentsSummary.applicant_name.replace(/\s+/g, '_')}_${doc.type}.pdf`)}
                          disabled={downloading === doc.endpoint}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-maroon bg-maroon/10 rounded-lg hover:bg-maroon/20 transition-colors disabled:opacity-50"
                        >
                          {downloading === doc.endpoint ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          )}
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Documents */}
              {documentsSummary.documents.uploaded.length > 0 && (
                <div className="bg-white rounded-xl border border-border overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-gray-50">
                    <h3 className="text-sm font-semibold text-navy">Uploaded Documents</h3>
                    <p className="text-xs text-gray mt-0.5">ID, credentials, and certifications</p>
                  </div>
                  <div className="divide-y divide-border">
                    {documentsSummary.documents.uploaded.map((doc) => (
                      <div key={doc.type} className="px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-navy">{doc.name}</p>
                            <p className="text-xs text-gray">
                              {doc.filename || 'Uploaded'} • {formatDate(doc.uploaded_at)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => viewUploadedDoc(doc.endpoint!)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-info bg-info/10 rounded-lg hover:bg-info/20 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {documentsSummary.documents.agreements.length === 0 && 
               documentsSummary.documents.uploaded.length === 0 && (
                <div className="bg-white rounded-xl border border-border p-8 text-center">
                  <p className="text-gray text-sm">No additional documents uploaded yet</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[10px] text-gray-400">Powered by MediSVault</p>
      </div>
    </div>
  );
}
