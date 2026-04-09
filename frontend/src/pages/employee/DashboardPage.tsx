import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { EmployeeDocumentUpdateModal } from '../../components/employee/EmployeeDocumentUpdateModal';
import { formatDate, daysUntil } from '../../lib/utils';
import { api } from '../../lib/api';

interface EmployeeDocument {
  id: string;
  document_type: string;
  name: string;
  filename: string;
  uploaded_at: string;
  expiration_date: string | null;
  status: 'approved' | 'pending_review' | 'rejected';
  version: number;
  source: 'application' | 'documents_table';
  endpoint: string | null;
}

interface DocumentsResponse {
  employee_id: string;
  employee_name: string;
  documents: EmployeeDocument[];
}

type ExpirationStatus = 'expired' | 'expiring' | 'valid' | null;

function getExpirationStatus(expirationDate: string | null): ExpirationStatus {
  if (!expirationDate) return null;
  const expDate = new Date(expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (expDate < today) return 'expired';
  
  const daysLeft = daysUntil(expirationDate);
  if (daysLeft <= 30) return 'expiring';
  
  return 'valid';
}

export function EmployeeDashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [employeeName, setEmployeeName] = useState('');
  
  // Upload modal state
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    document: EmployeeDocument | null;
  }>({ isOpen: false, document: null });

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await api.get<DocumentsResponse>('/employee/documents');
      setDocuments(res.documents || []);
      setEmployeeName(res.employee_name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleViewDocument = async (doc: EmployeeDocument) => {
    if (!doc.endpoint) return;
    
    try {
      const res = await api.get<{ url: string }>(doc.endpoint);
      if (res.url) {
        window.open(res.url, '_blank');
      }
    } catch (err) {
      console.error('Error fetching document URL:', err);
    }
  };

  const handleUpdateClick = (doc: EmployeeDocument) => {
    setUploadModal({ isOpen: true, document: doc });
  };

  const handleUploadSuccess = () => {
    setUploadModal({ isOpen: false, document: null });
    loadDocuments();
  };

  // Categorize documents
  const expiredDocs = documents.filter(d => 
    d.status === 'approved' && getExpirationStatus(d.expiration_date) === 'expired'
  );
  const expiringDocs = documents.filter(d => 
    d.status === 'approved' && getExpirationStatus(d.expiration_date) === 'expiring'
  );
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
          Manage your documents and keep your credentials up to date.
        </p>
      </div>

      {error && (
        <Alert variant="error" dismissible>
          {error}
        </Alert>
      )}

      {/* Alerts */}
      {expiredDocs.length > 0 && (
        <Alert variant="error" title="Expired Documents">
          You have {expiredDocs.length} expired document(s) that need to be updated immediately.
        </Alert>
      )}

      {expiringDocs.length > 0 && (
        <Alert variant="warning" title="Documents Expiring Soon">
          You have {expiringDocs.length} document(s) expiring within 30 days. Please update them to stay compliant.
        </Alert>
      )}

      {pendingDocs.length > 0 && (
        <Alert variant="info" title="Pending Review">
          You have {pendingDocs.length} document(s) awaiting manager approval.
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-sm text-gray">Total Documents</p>
          <p className="text-2xl font-bold text-navy">{documents.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-sm text-gray">Up to Date</p>
          <p className="text-2xl font-bold text-green-600">
            {documents.filter(d => d.status === 'approved' && getExpirationStatus(d.expiration_date) === 'valid').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-sm text-gray">Expiring Soon</p>
          <p className="text-2xl font-bold text-orange-500">{expiringDocs.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-sm text-gray">Expired</p>
          <p className="text-2xl font-bold text-red-600">{expiredDocs.length}</p>
        </div>
      </div>

      {/* Documents List */}
      <Card header="My Documents">
        {documents.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-3 text-sm text-gray">No documents found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const expStatus = getExpirationStatus(doc.expiration_date);
              const isExpired = expStatus === 'expired';
              const isExpiring = expStatus === 'expiring';
              const isPending = doc.status === 'pending_review';
              const isRejected = doc.status === 'rejected';
              
              return (
                <div
                  key={doc.id}
                  className={`rounded-lg border p-4 ${
                    isExpired ? 'border-red-200 bg-red-50' :
                    isExpiring ? 'border-orange-200 bg-orange-50' :
                    isPending ? 'border-blue-200 bg-blue-50' :
                    isRejected ? 'border-red-200 bg-red-50' :
                    'border-border bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate">{doc.name}</h4>
                        
                        {/* Status Badge */}
                        {isPending && (
                          <Badge variant="warning">Pending Review</Badge>
                        )}
                        {isRejected && (
                          <Badge variant="error">Rejected</Badge>
                        )}
                        {!isPending && !isRejected && isExpired && (
                          <Badge variant="error">Expired</Badge>
                        )}
                        {!isPending && !isRejected && isExpiring && (
                          <Badge variant="warning">Expiring Soon</Badge>
                        )}
                        {!isPending && !isRejected && !isExpired && !isExpiring && doc.status === 'approved' && (
                          <Badge variant="success">Valid</Badge>
                        )}
                        
                        {doc.version > 1 && (
                          <span className="text-xs text-gray">v{doc.version}</span>
                        )}
                      </div>
                      
                      <p className="mt-1 text-sm text-gray">{doc.filename}</p>
                      
                      {/* Expiration Date */}
                      {doc.expiration_date && (
                        <p className={`mt-1 text-sm ${
                          isExpired ? 'text-red-600 font-medium' :
                          isExpiring ? 'text-orange-600 font-medium' :
                          'text-gray'
                        }`}>
                          {isExpired ? '⚠️ Expired: ' : isExpiring ? '⏰ Expires: ' : 'Expires: '}
                          {formatDate(doc.expiration_date)}
                          {isExpiring && ` (${daysUntil(doc.expiration_date)} days)`}
                        </p>
                      )}
                      {!doc.expiration_date && doc.status === 'approved' && (
                        <p className="mt-1 text-sm text-gray">No expiration</p>
                      )}

                      {isPending && (
                        <p className="mt-1 text-sm text-blue-600">
                          Uploaded {formatDate(doc.uploaded_at)} — awaiting manager approval
                        </p>
                      )}
                      {isRejected && (
                        <p className="mt-1 text-sm text-red-600">
                          Your upload was rejected. Please upload a new document.
                        </p>
                      )}
                    </div>
                    
                    <div className="ml-4 flex gap-2">
                      {doc.endpoint && doc.status !== 'pending_review' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDocument(doc)}
                        >
                          View
                        </Button>
                      )}
                      
                      {/* Show Update button for expired, expiring, or rejected docs */}
                      {(isExpired || isExpiring || isRejected || doc.status === 'approved') && (
                        <Button
                          size="sm"
                          variant={isExpired || isExpiring || isRejected ? 'primary' : 'secondary'}
                          onClick={() => handleUpdateClick(doc)}
                        >
                          {isExpired || isRejected ? 'Upload New' : 'Update'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <p className="mt-4 text-xs text-gray">
          Keep your documents current to maintain compliance. When you upload a new version, 
          it will be reviewed by your manager before becoming active.
        </p>
      </Card>

      {/* Upload Modal */}
      <EmployeeDocumentUpdateModal
        isOpen={uploadModal.isOpen}
        onClose={() => setUploadModal({ isOpen: false, document: null })}
        onSuccess={handleUploadSuccess}
        document={uploadModal.document}
      />
    </div>
  );
}
