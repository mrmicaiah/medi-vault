import { useState, useEffect, useMemo } from 'react';
import { api, API_URL } from '../../lib/api';
import { supabase } from '../../lib/supabase';
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
  position?: string;
  location_name?: string;
  submitted_at?: string;
  created_at: string;
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

// Position configuration - same as ApplicantsPage
const POSITION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  cna: { label: 'CNA', color: 'bg-purple-500', icon: '🩺' },
  hha: { label: 'HHA', color: 'bg-teal-500', icon: '🏠' },
  pca: { label: 'PCA', color: 'bg-blue-500', icon: '👤' },
  lpn: { label: 'LPN', color: 'bg-amber-500', icon: '💉' },
  rn: { label: 'RN', color: 'bg-rose-500', icon: '⚕️' },
};

const POSITION_ORDER = ['cna', 'hha', 'pca', 'lpn', 'rn'];

const getPositionConfig = (position?: string) => {
  if (!position) return null;
  return POSITION_CONFIG[position.toLowerCase()] || null;
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Document completion status
type DocStatus = 'complete' | 'partial' | 'missing';

interface ApplicantWithDocs extends Applicant {
  docStatus?: DocStatus;
  uploadedCount?: number;
  totalRequired?: number;
}

export default function DocumentsPage() {
  const [applicants, setApplicants] = useState<ApplicantWithDocs[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantWithDocs | null>(null);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Pool collapse state
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [completeExpanded, setCompleteExpanded] = useState(false);
  const [partialExpanded, setPartialExpanded] = useState(false);
  const [missingExpanded, setMissingExpanded] = useState(false);
  
  // Slide-out panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'generated' | 'agreements' | 'uploaded'>('uploaded');
  
  // HTML preview modal state
  const [htmlPreviewModal, setHtmlPreviewModal] = useState<{
    isOpen: boolean;
    name: string;
    htmlContent: string | null;
    loading: boolean;
    pdfEndpoint: string | null;
  }>({ isOpen: false, name: '', htmlContent: null, loading: false, pdfEndpoint: null });

  // Document preview modal state
  const [documentModal, setDocumentModal] = useState<{
    isOpen: boolean;
    name: string;
    url: string | null;
    fileName?: string;
    loading: boolean;
  }>({ isOpen: false, name: '', url: null, loading: false });

  useEffect(() => {
    loadApplicants();
  }, []);

  async function loadApplicants() {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.get<{ applications: Applicant[] }>('/admin/pipeline');
      // Filter to only show submitted+ applicants (those who have documents to review)
      const submitted = (data.applications || []).filter(a => 
        ['submitted', 'under_review', 'approved', 'hired'].includes(a.status)
      );
      setApplicants(submitted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applicants');
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments(applicant: ApplicantWithDocs) {
    try {
      setLoadingDocs(true);
      setError(null);
      setSelectedApplicant(applicant);
      setPanelOpen(true);
      setActiveTab('uploaded');
      
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

  // Filter and organize applicants
  const { recentSubmissions, byPosition, completeApplicants, partialApplicants, missingApplicants } = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Apply search
    let filtered = applicants;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.first_name?.toLowerCase().includes(query) ||
        a.last_name?.toLowerCase().includes(query) ||
        a.email?.toLowerCase().includes(query) ||
        a.location_name?.toLowerCase().includes(query)
      );
    }
    
    // Sort by submitted_at desc
    filtered.sort((a, b) => {
      const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return dateB - dateA;
    });
    
    // Recent = submitted in past 7 days
    const recent = filtered.filter(a => a.submitted_at && new Date(a.submitted_at) >= oneWeekAgo);
    
    // Group by position
    const pools: Record<string, ApplicantWithDocs[]> = {};
    filtered.forEach(a => {
      const pos = a.position?.toLowerCase();
      if (pos && POSITION_CONFIG[pos]) {
        if (!pools[pos]) pools[pos] = [];
        pools[pos].push(a);
      }
    });
    
    // For now, we'll categorize by status as proxy for document completion
    // In production, you'd want to actually check document counts
    const complete = filtered.filter(a => a.status === 'approved' || a.status === 'hired');
    const partial = filtered.filter(a => a.status === 'under_review');
    const missing = filtered.filter(a => a.status === 'submitted');
    
    return {
      recentSubmissions: recent,
      byPosition: pools,
      completeApplicants: complete,
      partialApplicants: partial,
      missingApplicants: missing,
    };
  }, [applicants, searchQuery]);

  const togglePool = (poolId: string) => {
    setExpandedPools(prev => {
      const next = new Set(prev);
      if (next.has(poolId)) {
        next.delete(poolId);
      } else {
        next.add(poolId);
      }
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'bg-amber-100 text-amber-700',
      under_review: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      hired: 'bg-success text-white',
    };
    const labels: Record<string, string> = {
      submitted: 'Submitted',
      under_review: 'Reviewing',
      approved: 'Approved',
      hired: 'Hired',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDocStatusBadge = (status: string) => {
    if (status === 'approved' || status === 'hired') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          Complete
        </span>
      );
    }
    if (status === 'under_review') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">
          <span className="w-1.5 h-1.5 rounded-full bg-warning" />
          Partial
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-error/10 text-error">
        <span className="w-1.5 h-1.5 rounded-full bg-error" />
        Missing
      </span>
    );
  };

  // Applicant Row Component
  const ApplicantRow = ({ applicant }: { applicant: ApplicantWithDocs }) => {
    const config = getPositionConfig(applicant.position);
    return (
      <div
        onClick={() => loadDocuments(applicant)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
      >
        {/* Position badge */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white ${config?.color || 'bg-gray-400'}`}>
          {config?.label || '—'}
        </div>
        
        {/* Name and email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy truncate">
            {applicant.first_name} {applicant.last_name}
          </p>
          <p className="text-xs text-gray truncate">{applicant.email}</p>
        </div>
        
        {/* Doc status and location */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="text-xs text-gray">{applicant.location_name || '—'}</span>
          {getDocStatusBadge(applicant.status)}
        </div>
        
        <span className="text-xs text-gray-400 flex-shrink-0">
          {applicant.submitted_at ? formatTimeAgo(applicant.submitted_at) : '—'}
        </span>
        
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  };

  // Pool Section Component
  const PoolSection = ({ 
    id, 
    title, 
    icon, 
    color, 
    applicants: poolApplicants,
    expanded,
    onToggle,
    borderColor = 'border-border',
    bgGradient = '',
  }: { 
    id: string;
    title: string; 
    icon: string; 
    color: string;
    applicants: ApplicantWithDocs[];
    expanded: boolean;
    onToggle: () => void;
    borderColor?: string;
    bgGradient?: string;
  }) => {
    const count = poolApplicants.length;
    
    if (count === 0) return null;
    
    return (
      <div className={`bg-white rounded-xl border ${borderColor} overflow-hidden ${bgGradient}`}>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <span className="font-semibold text-navy">{title}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${color}`}>{count}</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray transition-transform ${expanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {expanded && (
          <div className="border-t border-gray-100 bg-white">
            {poolApplicants.map(a => (
              <ApplicantRow key={a.id} applicant={a} />
            ))}
          </div>
        )}
      </div>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Documents</h1>
          <p className="text-sm text-gray mt-1">
            {applicants.length} applicants • {recentSubmissions.length} submitted this week
          </p>
        </div>
      </div>

      {error && <Alert variant="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Recently Submitted */}
      {recentSubmissions.length > 0 && (
        <div className="bg-gradient-to-r from-maroon/5 to-transparent rounded-xl border border-maroon/20 overflow-hidden">
          <button
            onClick={() => setRecentExpanded(!recentExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-maroon/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📄</span>
              <span className="font-semibold text-navy">Recently Submitted</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-maroon">{recentSubmissions.length}</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray transition-transform ${recentExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {recentExpanded && (
            <div className="border-t border-maroon/20 bg-white">
              {recentSubmissions.map(a => (
                <ApplicantRow key={a.id} applicant={a} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* By Document Status */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray uppercase tracking-wide px-1">By Document Status</h2>
        
        {/* Needs Review (Submitted) */}
        <PoolSection
          id="missing"
          title="Needs Review"
          icon="📋"
          color="bg-amber-500"
          applicants={missingApplicants}
          expanded={missingExpanded}
          onToggle={() => setMissingExpanded(!missingExpanded)}
          borderColor="border-amber-200"
        />
        
        {/* Under Review (Partial) */}
        <PoolSection
          id="partial"
          title="Under Review"
          icon="🔍"
          color="bg-purple-500"
          applicants={partialApplicants}
          expanded={partialExpanded}
          onToggle={() => setPartialExpanded(!partialExpanded)}
          borderColor="border-purple-200"
        />
        
        {/* Complete (Approved/Hired) */}
        <PoolSection
          id="complete"
          title="Documents Complete"
          icon="✅"
          color="bg-success"
          applicants={completeApplicants}
          expanded={completeExpanded}
          onToggle={() => setCompleteExpanded(!completeExpanded)}
          borderColor="border-success/30"
        />
      </div>

      {/* By Position */}
      {Object.keys(byPosition).length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray uppercase tracking-wide px-1">By Position</h2>
          
          {POSITION_ORDER.map(pos => {
            const config = POSITION_CONFIG[pos];
            const poolApplicants = byPosition[pos] || [];
            if (poolApplicants.length === 0) return null;
            
            const isExpanded = expandedPools.has(pos);
            
            return (
              <div key={pos} className="bg-white rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => togglePool(pos)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{config.icon}</span>
                    <span className="font-semibold text-navy">{config.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${config.color}`}>{poolApplicants.length}</span>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isExpanded && (
                  <div className="border-t border-border">
                    {poolApplicants.map(a => (
                      <ApplicantRow key={a.id} applicant={a} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {applicants.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray">No submitted applications yet</p>
          <p className="text-sm text-gray mt-1">Documents will appear here once applicants submit their applications</p>
        </div>
      )}

      {/* Side Panel */}
      {selectedApplicant && (
        <>
          <div
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-250 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closePanel}
          />
          <div className={`fixed top-0 right-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="px-6 py-5 bg-navy flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedApplicant.first_name} {selectedApplicant.last_name}
                  </h2>
                  <p className="text-sm text-white/70">{selectedApplicant.email}</p>
                </div>
                {selectedApplicant.position && (
                  <span className="text-sm font-bold text-white bg-white/20 px-2 py-0.5 rounded">
                    {getPositionConfig(selectedApplicant.position)?.label || selectedApplicant.position.toUpperCase()}
                  </span>
                )}
              </div>
              <button onClick={closePanel} className="text-white/60 hover:text-white text-2xl leading-none p-1">×</button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border bg-white flex-shrink-0">
              <button
                onClick={() => setActiveTab('uploaded')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'uploaded' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Uploads
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">{counts.uploaded}</span>
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
                onClick={() => setActiveTab('generated')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'generated' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Application
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs">{counts.generated}</span>
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
              ) : activeTab === 'uploaded' ? (
                /* Uploaded Documents Tab */
                <div className="space-y-3">
                  {documentSummary.documents.uploaded.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                      <div className="text-3xl mb-2">📎</div>
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
                          <button
                            onClick={() => viewDocument(doc.endpoint, doc.name, doc.filename)}
                            className="px-3 py-1.5 text-sm font-medium text-maroon hover:bg-maroon/5 rounded-lg transition-colors"
                          >
                            View
                          </button>
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
                      <div className="text-3xl mb-2">📝</div>
                      <p className="text-sm text-gray">No agreements signed yet</p>
                    </div>
                  ) : (
                    documentSummary.documents.onboarding_agreements.map((agreement) => (
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
                              <button
                                onClick={() => viewHtmlPreview(
                                  agreement.preview_endpoint || agreement.endpoint.replace('/pdf/agreement/', '/agreement/') + '/preview',
                                  agreement.endpoint,
                                  agreement.name
                                )}
                                className="px-3 py-1.5 text-sm font-medium text-maroon hover:bg-maroon/5 rounded-lg transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() => downloadPdf(agreement.endpoint, `${documentSummary.applicant_name.replace(/\s+/g, '_')}_${agreement.type}.pdf`)}
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
              ) : (
                /* Generated Documents Tab */
                <div className="space-y-3">
                  {documentSummary.documents.generated.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                      <div className="text-3xl mb-2">📄</div>
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
                              <button
                                onClick={() => viewHtmlPreview(doc.preview_endpoint!, doc.endpoint, doc.name)}
                                className="px-3 py-1.5 text-sm font-medium text-maroon hover:bg-maroon/5 rounded-lg transition-colors"
                              >
                                View
                              </button>
                            )}
                            <button
                              onClick={() => downloadPdf(doc.endpoint, `${documentSummary.applicant_name.replace(/\s+/g, '_')}_${doc.type}.pdf`)}
                              disabled={downloadingId === doc.endpoint}
                              className="px-3 py-1.5 text-sm font-medium text-gray hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {downloadingId === doc.endpoint ? '...' : 'PDF'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <p className="text-[10px] text-gray-400 text-center">Powered by MediVault</p>
            </div>
          </div>
        </>
      )}

      {/* HTML Preview Modal */}
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

      {/* Document Preview Modal */}
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
