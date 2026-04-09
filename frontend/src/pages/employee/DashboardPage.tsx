import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { formatDate, daysUntil } from '../../lib/utils';

interface EmployeeDocument {
  id: string;
  document_type: string;
  name: string;
  filename?: string;
  uploaded_at?: string;
  expiration_date?: string;
  status: 'approved' | 'pending_review' | 'expired';
  version: number;
  source: 'application' | 'documents_table';
  endpoint?: string;
}

interface EmployeeDocumentsResponse {
  employee_id: string;
  employee_name: string;
  documents: EmployeeDocument[];
}

type ExpirationStatus = 'expired' | 'expiring_soon' | 'valid' | 'no_expiration';

function getExpirationStatus(expirationDate?: string): ExpirationStatus {
  if (!expirationDate) return 'no_expiration';
  
  const expDate = new Date(expirationDate);
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  if (expDate < now) return 'expired';
  if (expDate < thirtyDaysFromNow) return 'expiring_soon';
  return 'valid';
}

const statusStyles: Record<ExpirationStatus, { bg: string; text: string; badge: 'error' | 'warning' | 'success' | 'neutral' }> = {
  expired: { bg: 'bg-error/10', text: 'text-error', badge: 'error' },
  expiring_soon: { bg: 'bg-warning/10', text: 'text-warning', badge: 'warning' },
  valid: { bg: 'bg-success/10', text: 'text-success', badge: 'success' },
  no_expiration: { bg: 'bg-gray-100', text: 'text-gray', badge: 'neutral' },
};

const statusLabels: Record<ExpirationStatus, string> = {
  expired: 'Expired',
  expiring_soon: 'Expiring Soon',
  valid: 'Valid',
  no_expiration: 'No Expiration',
};

export function EmployeeDashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  
  // Upload modal state
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    document?: EmployeeDocument;
  }>({ isOpen: false });
  
  // View modal state
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    documentName: string;
    url: string | null;
    loading: boolean;
  }>({ isOpen: false, documentName: '', url: null, loading: false });
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<EmployeeDocumentsResponse>('/employee/documents');
      setDocuments(res.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function handleViewDocument(doc: EmployeeDocument) {
    if (!doc.endpoint) return;
    
    try {
      setViewModal({ isOpen: true, documentName: doc.name, url: null, loading: true });
      const data = await api.get<{ signed_url: string }>(doc.endpoint);
      setViewModal({ isOpen: true, documentName: doc.name, url: data.signed_url, loading: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
      setViewModal({ isOpen: false, documentName: '', url: null, loading: false });
    }
  }

  function handleUpdateClick(doc: EmployeeDocument) {
    setUploadModal({ isOpen: true, document: doc });
    setSelectedFile(null);
    setUploadError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Please upload a PDF or image file (JPEG, PNG, WebP, HEIC)');
        return;
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size must be under 10MB');
        return;
      }
      setUploadError(null);
      setSelectedFile(file);
    }
  }

  async function handleUploadSubmit() {
    if (!selectedFile || !uploadModal.document) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', uploadModal.document.document_type);
      if (uploadModal.document.id) {
        formData.append('previous_document_id', uploadModal.document.id);
      }
      
      await api.postFormData('/employee/documents/upload', formData);
      
      // Close modal and refresh
      setUploadModal({ isOpen: false });
      setSelectedFile(null);
      loadDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  // Categorize documents
  const expiredDocs = documents.filter(d => getExpirationStatus(d.expiration_date) === 'expired');
  const expiringDocs = documents.filter(d => getExpirationStatus(d.expiration_date) === 'expiring_soon');
  const pendingDocs = documents.filter(d => d.status === 'pending_review');

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">
          Welcome, {profile?.first_name || 'Employee'}
        </h1>
        <p className="mt-1 text-sm text-gray">
          Manage your documents and keep your certifications up to date.
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Alerts for expired/expiring documents */}
      {expiredDocs.length > 0 && (
        <Alert variant="error" title="Expired Documents">
          You have {expiredDocs.length} expired document(s) that need to be updated immediately.
        </Alert>
      )}

      {expiringDocs.length > 0 && (
        <Alert variant="warning" title="Documents Expiring Soon">
          You have {expiringDocs.length} document(s) expiring within 30 days. Please upload updated versions.
        </Alert>
      )}

      {pendingDocs.length > 0 && (
        <Alert variant="info" title="Pending Review">
          You have {pendingDocs.length} document(s) pending manager review.
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-navy">{documents.length}</p>
          <p className="text-xs text-gray">Total Documents</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-success">{documents.filter(d => getExpirationStatus(d.expiration_date) === 'valid').length}</p>
          <p className="text-xs text-gray">Valid</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-warning">{expiringDocs.length}</p>
          <p className="text-xs text-gray">Expiring Soon</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-error">{expiredDocs.length}</p>
          <p className="text-xs text-gray">Expired</p>
        </div>
      </div>

      {/* Documents List */}
      <Card header="My Documents">
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-gray">No documents found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const expStatus = getExpirationStatus(doc.expiration_date);
              const styles = statusStyles[expStatus];
              const isPending = doc.status === 'pending_review';
              
              return (
                <div
                  key={doc.id}
                  className={`rounded-lg border p-4 ${expStatus === 'expired' ? 'border-error/30 bg-error/5' : expStatus === 'expiring_soon' ? 'border-warning/30 bg-warning/5' : 'border-border bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${styles.bg}`}>
                        <svg className={`h-5 w-5 ${styles.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-slate">{doc.name}</h4>
                          <Badge variant={styles.badge}>
                            {isPending ? 'Pending Review' : statusLabels[expStatus]}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray mt-1">
                          {doc.filename || 'Document uploaded'}
                          {doc.version > 1 && ` • Version ${doc.version}`}
                        </p>
                        {doc.expiration_date && (
                          <p className={`text-xs mt-1 ${styles.text}`}>
                            {expStatus === 'expired' ? 'Expired' : 'Expires'}: {formatDate(doc.expiration_date)}
                            {expStatus === 'expiring_soon' && (
                              <span className="font-medium"> ({daysUntil(doc.expiration_date)} days)</span>
                            )}
                          </p>
                        )}
                        {!doc.expiration_date && (
                          <p className="text-xs text-gray mt-1">No expiration date set</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-shrink-0">
                      {doc.endpoint && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDocument(doc)}
                        >
                          View
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={expStatus === 'expired' || expStatus === 'expiring_soon' ? 'primary' : 'secondary'}
                        onClick={() => handleUpdateClick(doc)}
                        disabled={isPending}
                      >
                        {isPending ? 'Pending' : 'Update'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <p className="mt-4 text-xs text-gray">
          When you upload a new document, it will be sent to your manager for review. 
          They will verify and set the new expiration date.
        </p>
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal({ isOpen: false })}
        title={`Update ${uploadModal.document?.name || 'Document'}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray">
            Upload a new version of this document. Your manager will review it and update the expiration date.
          </p>

          {uploadError && (
            <div className="bg-error/10 border border-error/30 rounded-lg p-3">
              <p className="text-sm text-error">{uploadError}</p>
            </div>
          )}

          {/* Current document info */}
          {uploadModal.document && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray uppercase font-semibold">Current Document</p>
              <p className="text-sm text-slate mt-1">{uploadModal.document.filename || 'No file name'}</p>
              {uploadModal.document.expiration_date && (
                <p className="text-xs text-gray mt-1">
                  Expires: {formatDate(uploadModal.document.expiration_date)}
                </p>
              )}
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">New Document *</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
              onChange={handleFileChange}
              className="w-full text-sm text-gray file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-maroon/10 file:text-maroon hover:file:bg-maroon/20 cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray">PDF, JPEG, PNG, WebP, or HEIC (max 10MB)</p>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 bg-success/10 rounded-lg p-3">
              <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-slate">{selectedFile.name}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setUploadModal({ isOpen: false })}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadSubmit}
              loading={uploading}
              disabled={!selectedFile}
            >
              Upload Document
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Document Modal */}
      <Modal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, documentName: '', url: null, loading: false })}
        title={viewModal.documentName}
      >
        <div className="space-y-4">
          {viewModal.loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : viewModal.url ? (
            <div className="space-y-4">
              {viewModal.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || viewModal.url.includes('image') ? (
                <img src={viewModal.url} alt={viewModal.documentName} className="max-w-full rounded-lg" />
              ) : (
                <iframe
                  src={viewModal.url}
                  className="w-full h-96 rounded-lg border border-border"
                  title={viewModal.documentName}
                />
              )}
              <div className="flex justify-end">
                <a
                  href={viewModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-maroon hover:underline"
                >
                  Open in new tab
                </a>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray py-8">Unable to load document</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
