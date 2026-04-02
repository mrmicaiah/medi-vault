import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { FileUpload } from '../../components/ui/FileUpload';
import { formatDate, daysUntil } from '../../lib/utils';

interface Employee {
  id: string;
  user_id: string;
  application_id: string;
  employee_number?: string;
  status: string;
  hire_date: string;
  job_title?: string;
  department?: string;
  pay_rate?: number;
  pay_type?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface ComplianceDocument {
  id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  description?: string;
  file_path?: string;
  file_name?: string;
  effective_date: string;
  expiration_date?: string;
  status: string;
  check_result?: string;
  uploaded_by_name?: string;
  created_at?: string;
}

interface ComplianceSummary {
  employee_id: string;
  is_compliant: boolean;
  total_documents: number;
  valid_documents: number;
  expired_documents: number;
  pending_documents: number;
  background_check?: ComplianceDocument;
  oig_exclusion_check?: ComplianceDocument;
  documents: ComplianceDocument[];
  alerts: string[];
}

interface UploadedDoc {
  type: string;
  name: string;
  step_number: number;
  filename?: string;
  uploaded_at?: string;
  endpoint: string;
}

interface AgreementDoc {
  type: string;
  name: string;
  signed: boolean;
  signed_date?: string;
  endpoint: string;
  preview_endpoint?: string;
}

interface GeneratedDoc {
  type: string;
  name: string;
  endpoint: string;
  preview_endpoint?: string;
}

interface DocumentsSummary {
  application_id: string;
  applicant_name: string;
  status: string;
  documents: {
    uploaded: UploadedDoc[];
    onboarding_agreements: AgreementDoc[];
    generated: GeneratedDoc[];
  };
}

interface ClientAssignment {
  id: string;
  employee_id: string;
  client_id: string;
  client_name?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

interface Client {
  id: string;
  nickname: string;
  first_name?: string;
  last_name?: string;
  status: string;
}

interface ClientListResponse {
  items: Client[];
  total: number;
}

const categories = ['Assignments', 'Identification', 'Certification', 'Health', 'Compliance', 'Agreements'];

// Map document types to categories
const DOC_CATEGORY_MAP: Record<string, string> = {
  work_authorization: 'Identification',
  id_front: 'Identification',
  id_back: 'Identification',
  ssn_card: 'Identification',
  credentials: 'Certification',
  cpr: 'Certification',
  tb: 'Health',
};

const COMPLIANCE_DOC_TYPES = [
  { value: 'background_check', label: 'Background Check' },
  { value: 'oig_exclusion_check', label: 'OIG Exclusion Check' },
  { value: 'state_exclusion_check', label: 'State Exclusion Check' },
  { value: 'license', label: 'License' },
  { value: 'certification', label: 'Certification' },
  { value: 'tb_test', label: 'TB Test' },
  { value: 'cpr_certification', label: 'CPR Certification' },
  { value: 'first_aid', label: 'First Aid' },
  { value: 'drug_screening', label: 'Drug Screening' },
  { value: 'physical_exam', label: 'Physical Exam' },
  { value: 'training_record', label: 'Training Record' },
  { value: 'other', label: 'Other' },
];

export function EmployeeDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('Assignments');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Employee data
  const [employee, setEmployee] = useState<Employee | null>(null);
  
  // Documents from application
  const [documentsSummary, setDocumentsSummary] = useState<DocumentsSummary | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  
  // Compliance data
  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummary | null>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  
  // Client assignments
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  
  // Assign Client modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [assignmentStartDate, setAssignmentStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  
  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    document_type: 'background_check',
    document_name: '',
    effective_date: new Date().toISOString().split('T')[0],
    expiration_date: '',
    check_result: '',
    notes: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (id) {
      loadEmployee();
      loadComplianceSummary();
      loadAssignments();
    }
  }, [id]);

  useEffect(() => {
    if (employee?.application_id) {
      loadDocumentsSummary(employee.application_id);
    }
  }, [employee?.application_id]);

  useEffect(() => {
    if (id && activeTab === 'Compliance') {
      loadComplianceSummary();
    }
  }, [id, activeTab]);

  async function loadEmployee() {
    try {
      setLoading(true);
      const data = await api.get<Employee>(`/employees/${id}`);
      setEmployee(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }

  async function loadDocumentsSummary(applicationId: string) {
    try {
      setLoadingDocs(true);
      const data = await api.get<DocumentsSummary>(`/admin/applicants/${applicationId}/documents-summary`);
      setDocumentsSummary(data);
    } catch (err) {
      console.error('Failed to load documents summary:', err);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function loadComplianceSummary() {
    if (!id) return;
    try {
      setLoadingCompliance(true);
      const data = await api.get<ComplianceSummary>(`/employees/${id}/compliance-summary`);
      setComplianceSummary(data);
    } catch (err) {
      console.error('Failed to load compliance summary:', err);
    } finally {
      setLoadingCompliance(false);
    }
  }

  async function loadAssignments() {
    if (!id) return;
    try {
      setLoadingAssignments(true);
      const data = await api.get<ClientAssignment[]>(`/employees/${id}/assignments`);
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  }

  async function loadClients() {
    try {
      setLoadingClients(true);
      const data = await api.get<ClientListResponse>('/clients?status=active&page_size=100');
      setClients(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  }

  function handleOpenAssignModal() {
    setShowAssignModal(true);
    setSelectedClientId('');
    setAssignmentStartDate(new Date().toISOString().split('T')[0]);
    setAssignmentNotes('');
    setClientSearch('');
    loadClients();
  }

  async function handleAssignClient() {
    if (!id || !selectedClientId) return;

    try {
      setAssigning(true);
      await api.post(`/employees/${id}/assignments`, {
        client_id: selectedClientId,
        start_date: assignmentStartDate,
        notes: assignmentNotes || null,
      });
      setShowAssignModal(false);
      loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign client');
    } finally {
      setAssigning(false);
    }
  }

  async function handleUploadCompliance() {
    if (!id || !uploadForm.document_name || !uploadForm.effective_date) return;

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('document_type', uploadForm.document_type);
      formData.append('document_name', uploadForm.document_name);
      formData.append('effective_date', uploadForm.effective_date);
      if (uploadForm.expiration_date) {
        formData.append('expiration_date', uploadForm.expiration_date);
      }
      if (uploadForm.check_result) {
        formData.append('check_result', uploadForm.check_result);
      }
      if (uploadForm.notes) {
        formData.append('notes', uploadForm.notes);
      }
      if (uploadFile) {
        formData.append('file', uploadFile);
      }

      await api.postFormData(`/employees/${id}/compliance-documents`, formData);
      
      setShowUploadModal(false);
      setUploadForm({
        document_type: 'background_check',
        document_name: '',
        effective_date: new Date().toISOString().split('T')[0],
        expiration_date: '',
        check_result: '',
        notes: '',
      });
      setUploadFile(null);
      loadComplianceSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  }

  async function handleViewDocument(doc: ComplianceDocument) {
    if (!doc.file_path) return;
    try {
      const data = await api.get<{ signed_url: string }>(
        `/employees/${id}/compliance-documents/${doc.id}/download`
      );
      if (data.signed_url) {
        window.open(data.signed_url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get document URL');
    }
  }

  async function handleViewUploadedDoc(doc: UploadedDoc) {
    try {
      const data = await api.get<{ signed_url: string }>(doc.endpoint);
      if (data.signed_url) {
        window.open(data.signed_url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get document URL');
    }
  }

  async function handleViewAgreement(doc: AgreementDoc) {
    if (doc.preview_endpoint) {
      try {
        const response = await api.getHtml(doc.preview_endpoint);
        const blob = new Blob([response], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agreement');
      }
    }
  }

  async function handleDownloadAgreement(doc: AgreementDoc) {
    try {
      const response = await api.getBlob(doc.endpoint);
      const url = URL.createObjectURL(response);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download agreement');
    }
  }

  async function handleViewGenerated(doc: GeneratedDoc) {
    if (doc.preview_endpoint) {
      try {
        const response = await api.getHtml(doc.preview_endpoint);
        const blob = new Blob([response], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      }
    } else {
      handleDownloadGenerated(doc);
    }
  }

  async function handleDownloadGenerated(doc: GeneratedDoc) {
    try {
      const response = await api.getBlob(doc.endpoint);
      const url = URL.createObjectURL(response);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  }

  const getUploadedDocsForCategory = (category: string): UploadedDoc[] => {
    if (!documentsSummary) return [];
    return documentsSummary.documents.uploaded.filter(
      (doc) => DOC_CATEGORY_MAP[doc.type] === category
    );
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c) => {
      const name = `${c.first_name || ''} ${c.last_name || ''} ${c.nickname}`.toLowerCase();
      return name.includes(q);
    });
  }, [clients, clientSearch]);

  const assignedClientIds = useMemo(() => {
    return new Set(assignments.filter(a => a.is_active).map(a => a.client_id));
  }, [assignments]);

  const complianceBadge: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    valid: 'success', pending: 'warning', expired: 'error', rejected: 'error',
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray">Employee not found</p>
        <Link to="/admin/employees" className="text-maroon hover:underline mt-2 inline-block">
          Back to Employees
        </Link>
      </div>
    );
  }

  const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown';

  const getCategoryCount = (category: string): number => {
    if (category === 'Assignments') {
      return assignments.filter(a => a.is_active).length;
    }
    if (category === 'Compliance') {
      return complianceSummary?.total_documents || 0;
    }
    if (category === 'Agreements') {
      return (documentsSummary?.documents.onboarding_agreements.length || 0) + 
             (documentsSummary?.documents.generated.length || 0);
    }
    return getUploadedDocsForCategory(category).length;
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/employees" className="rounded-lg p-1 hover:bg-gray-100">
            <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">{employeeName}</h1>
            <p className="mt-1 text-sm text-gray">
              {employee.job_title || 'Employee'} - {employee.employee_number || 'No ID'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {complianceSummary && (
            <Badge variant={complianceSummary.is_compliant ? 'success' : 'error'}>
              {complianceSummary.is_compliant ? 'Compliant' : 'Non-Compliant'}
            </Badge>
          )}
          <Badge variant={employee.status === 'active' ? 'success' : 'neutral'}>
            {employee.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card header="Employee Information" className="lg:col-span-1">
          <div className="space-y-3">
            {[
              ['Email', employee.email || '—'],
              ['Department', employee.department || '—'],
              ['Pay Rate', employee.pay_rate ? `$${employee.pay_rate}/${employee.pay_type || 'hr'}` : '—'],
              ['Hire Date', formatDate(employee.hire_date)],
              ['Employee ID', employee.employee_number || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-medium uppercase text-gray">{label}</p>
                <p className="mt-0.5 text-sm text-slate">{value}</p>
              </div>
            ))}
          </div>

          {complianceSummary && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-slate mb-3">Compliance Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray">Background Check</span>
                  {complianceSummary.background_check ? (
                    <Badge variant={complianceBadge[complianceSummary.background_check.status] || 'neutral'} className="text-xs">
                      {complianceSummary.background_check.status}
                    </Badge>
                  ) : (
                    <Badge variant="error" className="text-xs">Missing</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray">OIG Check</span>
                  {complianceSummary.oig_exclusion_check ? (
                    <Badge variant={complianceBadge[complianceSummary.oig_exclusion_check.status] || 'neutral'} className="text-xs">
                      {complianceSummary.oig_exclusion_check.check_result || complianceSummary.oig_exclusion_check.status}
                    </Badge>
                  ) : (
                    <Badge variant="error" className="text-xs">Missing</Badge>
                  )}
                </div>
              </div>

              {complianceSummary.alerts.length > 0 && (
                <div className="mt-3 space-y-1">
                  {complianceSummary.alerts.map((alert, i) => (
                    <p key={i} className="text-xs text-warning flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {alert}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        <Card padding="none" className="lg:col-span-2">
          <div className="border-b border-border">
            <div className="flex overflow-x-auto px-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === cat
                      ? 'border-maroon text-maroon'
                      : 'border-transparent text-gray hover:text-slate'
                  }`}
                >
                  {cat}
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                    cat === 'Compliance' && complianceSummary
                      ? complianceSummary.is_compliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      : 'bg-gray-100'
                  }`}>
                    {getCategoryCount(cat)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Assignments Tab */}
          {activeTab === 'Assignments' ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray">
                  {assignments.filter(a => a.is_active).length} active client assignments
                </p>
                <Button size="sm" onClick={handleOpenAssignModal}>
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Assign Client
                </Button>
              </div>

              {loadingAssignments ? (
                <div className="flex justify-center py-8">
                  <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : assignments.filter(a => a.is_active).length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="mt-3 text-sm text-gray">No clients assigned yet</p>
                  <Button size="sm" variant="secondary" className="mt-3" onClick={handleOpenAssignModal}>
                    Assign First Client
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.filter(a => a.is_active).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-maroon-subtle p-2">
                          <svg className="h-5 w-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate">{assignment.client_name || 'Unknown Client'}</p>
                          <p className="text-xs text-gray">
                            Since {assignment.start_date ? formatDate(assignment.start_date) : 'N/A'}
                            {assignment.notes && ` • ${assignment.notes}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'Compliance' ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  {complianceSummary && (
                    <p className="text-sm text-gray">
                      {complianceSummary.valid_documents} valid, {complianceSummary.expired_documents} expired, {complianceSummary.pending_documents} pending
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={() => setShowUploadModal(true)}>
                  <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Document
                </Button>
              </div>

              {loadingCompliance ? (
                <div className="flex justify-center py-8">
                  <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : complianceSummary?.documents.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="mt-3 text-sm text-gray">No compliance documents uploaded yet</p>
                  <Button size="sm" variant="secondary" className="mt-3" onClick={() => setShowUploadModal(true)}>
                    Upload First Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {complianceSummary?.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${
                          doc.status === 'valid' ? 'bg-green-50' : 
                          doc.status === 'expired' ? 'bg-red-50' : 'bg-yellow-50'
                        }`}>
                          <svg className={`h-5 w-5 ${
                            doc.status === 'valid' ? 'text-green-600' :
                            doc.status === 'expired' ? 'text-red-600' : 'text-yellow-600'
                          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate">{doc.document_name}</p>
                          <p className="text-xs text-gray">
                            {COMPLIANCE_DOC_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                            {' '} - Effective {formatDate(doc.effective_date)}
                            {doc.expiration_date && (
                              <span className={daysUntil(doc.expiration_date) <= 30 ? ' text-warning font-medium' : ''}>
                                {' '} - Expires {formatDate(doc.expiration_date)}
                              </span>
                            )}
                          </p>
                          {doc.check_result && (
                            <p className="text-xs mt-0.5">
                              Result: <span className={doc.check_result === 'clear' ? 'text-green-600' : 'text-red-600'}>
                                {doc.check_result}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={complianceBadge[doc.status] || 'neutral'}>{doc.status}</Badge>
                        {doc.file_path && (
                          <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)}>
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'Agreements' ? (
            <div className="p-4 space-y-4">
              {loadingDocs ? (
                <div className="flex justify-center py-8">
                  <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : (
                <>
                  {documentsSummary?.documents.generated && documentsSummary.documents.generated.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate mb-2">Generated Documents</h3>
                      <div className="space-y-2">
                        {documentsSummary.documents.generated.map((doc) => (
                          <div key={doc.type} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="flex items-center gap-3">
                              <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-slate">{doc.name}</p>
                                <p className="text-xs text-gray">Auto-generated from application</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="success">Complete</Badge>
                              {doc.preview_endpoint && (
                                <Button variant="ghost" size="sm" onClick={() => handleViewGenerated(doc)}>View</Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadGenerated(doc)}>Download</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {documentsSummary?.documents.onboarding_agreements && documentsSummary.documents.onboarding_agreements.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate mb-2">Signed Agreements</h3>
                      <div className="space-y-2">
                        {documentsSummary.documents.onboarding_agreements.map((doc) => (
                          <div key={doc.type} className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div className="flex items-center gap-3">
                              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-slate">{doc.name}</p>
                                <p className="text-xs text-gray">Signed {doc.signed_date ? formatDate(doc.signed_date) : 'on file'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="success">Signed</Badge>
                              <Button variant="ghost" size="sm" onClick={() => handleViewAgreement(doc)}>View</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadAgreement(doc)}>Download</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!documentsSummary?.documents.generated?.length && !documentsSummary?.documents.onboarding_agreements?.length) && (
                    <p className="py-8 text-center text-sm text-gray">No agreements on file.</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {loadingDocs ? (
                <div className="flex justify-center py-8">
                  <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              ) : getUploadedDocsForCategory(activeTab).length === 0 ? (
                <p className="py-8 text-center text-sm text-gray">No documents in this category.</p>
              ) : (
                getUploadedDocsForCategory(activeTab).map((doc) => (
                  <div key={doc.step_number} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-slate">{doc.name}</p>
                        <p className="text-xs text-gray">
                          {doc.filename || 'Uploaded'} {doc.uploaded_at && ` - ${formatDate(doc.uploaded_at)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Uploaded</Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleViewUploadedDoc(doc)}>View</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Upload Compliance Document Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload Compliance Document">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Document Type</label>
            <select value={uploadForm.document_type} onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon">
              {COMPLIANCE_DOC_TYPES.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Document Name</label>
            <Input placeholder="e.g., Background Check - April 2026" value={uploadForm.document_name} onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate">Effective Date</label>
              <Input type="date" value={uploadForm.effective_date} onChange={(e) => setUploadForm({ ...uploadForm, effective_date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate">Expiration Date</label>
              <Input type="date" value={uploadForm.expiration_date} onChange={(e) => setUploadForm({ ...uploadForm, expiration_date: e.target.value })} />
              <p className="mt-1 text-xs text-gray">Leave blank if no expiration</p>
            </div>
          </div>
          {(uploadForm.document_type === 'background_check' || uploadForm.document_type === 'oig_exclusion_check' || uploadForm.document_type === 'state_exclusion_check') && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate">Check Result</label>
              <select value={uploadForm.check_result} onChange={(e) => setUploadForm({ ...uploadForm, check_result: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon">
                <option value="">Select result...</option>
                <option value="clear">Clear</option>
                <option value="match_found">Match Found</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Document File</label>
            <FileUpload onFileSelect={(file) => setUploadFile(file)} accept=".pdf,.jpg,.jpeg,.png" maxSize={10 * 1024 * 1024} />
            {uploadFile && <p className="mt-1 text-xs text-gray">Selected: {uploadFile.name}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Notes</label>
            <textarea value={uploadForm.notes} onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" placeholder="Any additional notes..." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowUploadModal(false)}>Cancel</Button>
            <Button onClick={handleUploadCompliance} loading={uploading} disabled={!uploadForm.document_name || !uploadForm.effective_date}>Upload Document</Button>
          </div>
        </div>
      </Modal>

      {/* Assign Client Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Client to ${employeeName}`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Search Clients</label>
            <Input placeholder="Search by name..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Select Client</label>
            {loadingClients ? (
              <div className="flex justify-center py-4">
                <svg className="h-5 w-5 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                {filteredClients.length === 0 ? (
                  <p className="p-3 text-sm text-gray text-center">No clients found</p>
                ) : (
                  filteredClients.map((client) => {
                    const isAssigned = assignedClientIds.has(client.id);
                    return (
                      <button
                        key={client.id}
                        type="button"
                        disabled={isAssigned}
                        onClick={() => setSelectedClientId(client.id)}
                        className={`w-full flex items-center justify-between p-3 text-left border-b border-border last:border-0 transition-colors ${
                          selectedClientId === client.id ? 'bg-maroon/10' : isAssigned ? 'bg-gray-50 opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-slate">{client.nickname}</p>
                          {(client.first_name || client.last_name) && (
                            <p className="text-xs text-gray">{client.first_name} {client.last_name}</p>
                          )}
                        </div>
                        {isAssigned ? (
                          <Badge variant="neutral" className="text-xs">Already assigned</Badge>
                        ) : selectedClientId === client.id ? (
                          <svg className="h-5 w-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Start Date</label>
            <Input type="date" value={assignmentStartDate} onChange={(e) => setAssignmentStartDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Notes (optional)</label>
            <textarea value={assignmentNotes} onChange={(e) => setAssignmentNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon" placeholder="Any notes about this assignment..." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssignClient} loading={assigning} disabled={!selectedClientId}>Assign Client</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
