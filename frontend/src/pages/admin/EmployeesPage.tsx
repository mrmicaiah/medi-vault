import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { DocumentTabs } from '../../components/admin/DocumentTabs';
import { DocumentUploadModal } from '../../components/admin/DocumentUploadModal';

interface Employee {
  id: string;
  user_id: string;
  employee_number?: string;
  status: 'active' | 'inactive' | 'terminated';
  position?: string;
  hire_date?: string;
  termination_date?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  location_id?: string;
  location_name?: string;
}

interface EmployeeDetail extends Employee {
  assignments?: ClientAssignment[];
  compliance?: ComplianceStatus;
}

interface EmployeePreferences {
  position_applied?: string;
  employment_type?: string;
  desired_hourly_rate?: string;
  desired_start_date?: string;
  speaks_other_languages?: string;
  other_languages?: string;
  how_heard?: string;
  city?: string;
  state?: string;
  address_line1?: string;
  zip?: string;
  available_days?: string[];
  shift_preferences?: string[];
  hours_per_week?: string;
  has_transportation?: string;
  max_travel_miles?: string;
  comfortable_with_pets?: string;
  comfortable_with_smokers?: string;
  credential_type?: string;
}

interface ClientAssignment {
  id: string;
  client_id: string;
  client_name: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
}

interface AssignmentHistoryEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number?: string;
  client_id: string;
  client_name: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  assigned_by?: string;
  assigned_by_name?: string;
  created_at?: string;
  was_compliant_at_assignment?: boolean;
  background_check_at_assignment?: string;
  oig_check_at_assignment?: string;
  ended_by?: string;
  ended_by_name?: string;
  ended_at?: string;
  end_reason?: string;
}

interface EndableAssignment {
  id: string;
  client_name: string;
  start_date?: string;
}

interface ComplianceStatus {
  background_check?: {
    status: string;
    checked_at?: string;
    expires_at?: string;
  };
  oig_check?: {
    status: string;
    checked_at?: string;
  };
  documents?: Array<{
    type: string;
    status: string;
    expires_at?: string;
  }>;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  nickname?: string;
  status: string;
}

interface ClientListResponse {
  clients: Client[];
  total: number;
  page: number;
  page_size: number;
}

interface AssignmentHistoryResponse {
  employee_id: string;
  employee_name: string;
  employee_number?: string;
  total_assignments: number;
  active_assignments: number;
  assignments: AssignmentHistoryEntry[];
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

const getPositionLabel = (position?: string) => {
  if (!position) return '—';
  const config = getPositionConfig(position);
  return config?.label || position.toUpperCase();
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

const END_REASONS = [
  { value: 'client_discharged', label: 'Client Discharged' },
  { value: 'client_request', label: 'Client Request' },
  { value: 'caregiver_resigned', label: 'Caregiver Resigned' },
  { value: 'caregiver_terminated', label: 'Caregiver Terminated' },
  { value: 'schedule_conflict', label: 'Schedule Conflict' },
  { value: 'reassignment', label: 'Reassigned to Another Caregiver' },
  { value: 'temporary_assignment_ended', label: 'Temporary Assignment Ended' },
  { value: 'other', label: 'Other' },
];

// Helper functions for formatting preferences
const formatAvailability = (days?: string[]) => {
  if (!days || days.length === 0) return '—';
  if (days.length === 7) return 'Any Day';
  if (days.length >= 5) return 'Most Days';
  return days.slice(0, 3).map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ') + (days.length > 3 ? '...' : '');
};

const formatHours = (hours?: string) => {
  const map: Record<string, string> = { 
    'part_time': 'Part Time', 
    'full_time': 'Full Time', 
    'fill_in': 'Fill In',
    'live_in': 'Live-In',
    '10-20': '10–20 hrs', 
    '20-30': '20–30 hrs', 
    '30-40': '30–40 hrs', 
    '40+': '40+ hrs' 
  };
  return map[hours || ''] || hours || '—';
};

const formatSmokerPref = (pref?: string) => {
  const map: Record<string, string> = { 
    yes: 'OK with', 
    no: 'Not OK', 
    prefer_no_smoking: 'Prefer No',
    no_preference: 'No pref' 
  };
  return map[pref || ''] || pref || '—';
};

const formatTransportation = (hasTransport?: string, maxMiles?: string) => {
  if (hasTransport === 'yes') {
    return maxMiles ? `Yes (${maxMiles} mi)` : 'Yes';
  }
  return hasTransport === 'no' ? 'No' : '—';
};

// Panel tab type
type PanelTab = 'overview' | 'uploads' | 'agreements' | 'application';

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pool collapse state
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
  const [recentExpanded, setRecentExpanded] = useState(false);
  const [inactiveExpanded, setInactiveExpanded] = useState(false);
  const [terminatedExpanded, setTerminatedExpanded] = useState(false);
  const [unassignedExpanded, setUnassignedExpanded] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Panel tab state
  const [panelTab, setPanelTab] = useState<PanelTab>('overview');
  
  // Preferences state
  const [preferences, setPreferences] = useState<EmployeePreferences | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  // Assignment state
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistoryEntry[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [showHistorySection, setShowHistorySection] = useState(false);

  // Assign/Reassign Client modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isReassignment, setIsReassignment] = useState(false);
  const [reassigningFrom, setReassigningFrom] = useState<ClientAssignment | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [assignmentStartDate, setAssignmentStartDate] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [reassignReason, setReassignReason] = useState('reassignment');
  const [assigning, setAssigning] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSearchDebounced, setClientSearchDebounced] = useState('');
  const [clientPage, setClientPage] = useState(1);
  const [clientTotal, setClientTotal] = useState(0);
  const clientPageSize = 20;

  // End Assignment modal
  const [showEndModal, setShowEndModal] = useState(false);
  const [endingAssignment, setEndingAssignment] = useState<EndableAssignment | null>(null);
  const [endReason, setEndReason] = useState('');
  const [endNotes, setEndNotes] = useState('');
  const [ending, setEnding] = useState(false);

  // Document Upload modal (from Overview tab)
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  // Key to force DocumentTabs remount after upload
  const [documentTabsKey, setDocumentTabsKey] = useState(0);

  const [searchParams] = useSearchParams();

  // Debounce client search
  useEffect(() => {
    const timer = setTimeout(() => {
      setClientSearchDebounced(clientSearch);
      setClientPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // Load clients when modal opens or search changes
  useEffect(() => {
    if (showAssignModal) {
      loadClients();
    }
  }, [showAssignModal, clientSearchDebounced, clientPage]);

  useEffect(() => {
    loadEmployees();
  }, []);

  // Handle URL params for pre-selecting employee
  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (selectedId && employees.length > 0) {
      const emp = employees.find(e => e.id === selectedId);
      if (emp) {
        selectEmployee(emp);
      }
    }
  }, [searchParams, employees]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ employees: Employee[] }>('/admin/employees');
      setEmployees(res.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const params = new URLSearchParams();
      params.set('page', clientPage.toString());
      params.set('page_size', clientPageSize.toString());
      if (clientSearchDebounced.trim()) {
        params.set('search', clientSearchDebounced.trim());
      }
      const data = await api.get<ClientListResponse>(`/clients?${params}`);
      setClients(data.clients || []);
      setClientTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  // Filter and organize employees
  const { recentHires, positionPools, unassignedEmployees, inactiveEmployees, terminatedEmployees } = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Separate by status
    const active = employees.filter(e => e.status === 'active');
    const inactive = employees.filter(e => e.status === 'inactive');
    const terminated = employees.filter(e => e.status === 'terminated');
    
    // Apply search
    let filtered = active;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.first_name?.toLowerCase().includes(query) ||
        e.last_name?.toLowerCase().includes(query) ||
        e.email?.toLowerCase().includes(query) ||
        e.location_name?.toLowerCase().includes(query) ||
        e.employee_number?.toLowerCase().includes(query)
      );
    }
    
    // Sort by hire_date desc (most recent first)
    filtered.sort((a, b) => {
      const dateA = a.hire_date ? new Date(a.hire_date).getTime() : 0;
      const dateB = b.hire_date ? new Date(b.hire_date).getTime() : 0;
      return dateB - dateA;
    });
    
    // Recent = hired in past 7 days
    const recent = filtered.filter(e => e.hire_date && new Date(e.hire_date) >= oneWeekAgo);
    
    // Group active by position
    const pools: Record<string, Employee[]> = {};
    const unassigned: Employee[] = [];
    
    filtered.forEach(e => {
      const pos = e.position?.toLowerCase();
      if (pos && POSITION_CONFIG[pos]) {
        if (!pools[pos]) pools[pos] = [];
        pools[pos].push(e);
      } else {
        unassigned.push(e);
      }
    });
    
    return {
      recentHires: recent,
      positionPools: pools,
      unassignedEmployees: unassigned,
      inactiveEmployees: inactive,
      terminatedEmployees: terminated,
    };
  }, [employees, searchQuery]);

  const totalActive = useMemo(() => {
    return employees.filter(e => e.status === 'active').length;
  }, [employees]);

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

  const selectEmployee = useCallback(async (employee: Employee) => {
    setSelectedEmployee(employee as EmployeeDetail);
    setPanelOpen(true);
    setPanelTab('overview');
    setShowHistorySection(false);
    setLoadingDetail(true);
    setPreferences(null);

    try {
      const assignRes = await api.get<ClientAssignment[]>(`/employees/${employee.id}/assignments`);
      setAssignments(assignRes || []);
      setSelectedEmployee(prev => prev ? { ...prev, assignments: assignRes || [] } : null);
      
      setLoadingPreferences(true);
      try {
        const prefRes = await api.get<{ preferences: EmployeePreferences; has_application: boolean }>(`/employees/${employee.id}/preferences`);
        if (prefRes.has_application && prefRes.preferences) {
          setPreferences(prefRes.preferences);
        }
      } catch (prefErr) {
        console.error('Failed to load preferences:', prefErr);
      } finally {
        setLoadingPreferences(false);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadAssignmentHistory = async (employeeId: string) => {
    setLoadingAssignments(true);
    try {
      const res = await api.get<AssignmentHistoryResponse>(`/assignments/employee/${employeeId}`);
      setAssignmentHistory(res.assignments || []);
    } catch (err) {
      console.error('Failed to load assignment history:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setPanelTab('overview');
    setTimeout(() => {
      setSelectedEmployee(null);
      setAssignments([]);
      setAssignmentHistory([]);
      setPreferences(null);
    }, 250);
  };

  function handleOpenAssignModal() {
    setShowAssignModal(true);
    setIsReassignment(false);
    setReassigningFrom(null);
    setSelectedClientId('');
    setAssignmentStartDate(new Date().toISOString().split('T')[0]);
    setAssignmentNotes('');
    setReassignReason('reassignment');
    setClientSearch('');
    setClientPage(1);
  }

  function handleOpenReassignModal(currentAssignment: ClientAssignment) {
    setShowAssignModal(true);
    setIsReassignment(true);
    setReassigningFrom(currentAssignment);
    setSelectedClientId('');
    setAssignmentStartDate(new Date().toISOString().split('T')[0]);
    setReassignReason('reassignment');
    setAssignmentNotes('');
    setClientSearch('');
    setClientPage(1);
  }

  async function handleAssignClient() {
    if (!selectedEmployee || !selectedClientId) return;

    try {
      setAssigning(true);
      if (isReassignment && reassigningFrom) {
        await api.post(`/assignments/${reassigningFrom.id}/end`, {
          end_reason: reassignReason,
          notes: `Reassigned to new client. ${assignmentNotes}`.trim(),
        });
      }

      await api.post(`/employees/${selectedEmployee.id}/assignments`, {
        client_id: selectedClientId,
        start_date: assignmentStartDate || null,
        notes: isReassignment
          ? `Reassigned from ${reassigningFrom?.client_name}. ${assignmentNotes}`.trim()
          : assignmentNotes || null,
      });

      setShowAssignModal(false);
      selectEmployee(selectedEmployee);
      loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign client');
    } finally {
      setAssigning(false);
    }
  }

  function handleOpenEndModal(assignment: EndableAssignment) {
    setEndingAssignment(assignment);
    setEndReason('');
    setEndNotes('');
    setShowEndModal(true);
  }

  async function handleEndAssignment() {
    if (!endingAssignment || !endReason) return;

    try {
      setEnding(true);
      await api.post(`/assignments/${endingAssignment.id}/end`, {
        end_reason: endReason,
        notes: endNotes || null,
      });
      setShowEndModal(false);
      setEndingAssignment(null);
      if (selectedEmployee) {
        loadAssignmentHistory(selectedEmployee.id);
        selectEmployee(selectedEmployee);
      }
      loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end assignment');
    } finally {
      setEnding(false);
    }
  }

  // Handle document upload success - refresh document tabs
  function handleDocumentUploadSuccess() {
    setShowDocumentUploadModal(false);
    // Increment key to force DocumentTabs to remount and refetch
    setDocumentTabsKey(prev => prev + 1);
    // Switch to uploads tab to show the new document
    setPanelTab('uploads');
  }

  const assignedClientIds = useMemo(() => {
    return new Set(
      assignments
        .filter(a => a.is_active && (!isReassignment || a.id !== reassigningFrom?.id))
        .map(a => a.client_id)
    );
  }, [assignments, isReassignment, reassigningFrom]);

  const activeAssignments = useMemo(() => {
    return assignments.filter(a => a.is_active);
  }, [assignments]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-success/10 text-success',
      inactive: 'bg-warning/10 text-warning',
      terminated: 'bg-error/10 text-error',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Employee Row Component - matches ApplicantsPage style
  const EmployeeRow = ({ employee, showStatus = true }: { employee: Employee; showStatus?: boolean }) => {
    const config = getPositionConfig(employee.position);
    return (
      <div
        onClick={() => selectEmployee(employee)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
      >
        {/* Position badge */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white ${config?.color || 'bg-gray-400'}`}>
          {config?.label || '—'}
        </div>
        
        {/* Name and email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy truncate">
            {employee.first_name} {employee.last_name}
          </p>
          <p className="text-xs text-gray truncate">{employee.email}</p>
        </div>
        
        {/* Status and location */}
        {showStatus && (
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs text-gray">{employee.location_name || '—'}</span>
            {getStatusBadge(employee.status)}
          </div>
        )}
        
        {!showStatus && (
          <span className="hidden sm:block text-xs text-gray">{employee.location_name || '—'}</span>
        )}
        
        <span className="text-xs text-gray-400 flex-shrink-0">
          {employee.hire_date ? formatTimeAgo(employee.hire_date) : '—'}
        </span>
        
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    );
  };

  // Pool Section Component - matches ApplicantsPage style
  const PoolSection = ({ 
    id, 
    title, 
    icon, 
    color, 
    employees: poolEmployees,
    showStatus = true,
  }: { 
    id: string;
    title: string; 
    icon: string; 
    color: string;
    employees: Employee[];
    showStatus?: boolean;
  }) => {
    const isExpanded = expandedPools.has(id);
    const count = poolEmployees.length;
    
    if (count === 0) return null;
    
    return (
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => togglePool(id)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <span className="font-semibold text-navy">{title}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${color}`}>{count}</span>
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
            {poolEmployees.map(e => (
              <EmployeeRow key={e.id} employee={e} showStatus={showStatus} />
            ))}
          </div>
        )}
      </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Employees</h1>
          <p className="text-sm text-gray mt-1">
            {employees.length} total • {totalActive} active • {recentHires.length} new this week
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
              placeholder="Search by name, email, ID, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:border-maroon focus:ring-1 focus:ring-maroon/20 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Recently Hired */}
      {recentHires.length > 0 && (
        <div className="bg-gradient-to-r from-success/5 to-transparent rounded-xl border border-success/20 overflow-hidden">
          <button
            onClick={() => setRecentExpanded(!recentExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-success/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🆕</span>
              <span className="font-semibold text-navy">Recently Hired</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-success">{recentHires.length}</span>
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
            <div className="border-t border-success/20 bg-white">
              {recentHires.map(e => (
                <EmployeeRow key={e.id} employee={e} showStatus={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Position Pools */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray uppercase tracking-wide px-1">By Position</h2>
        
        {POSITION_ORDER.map(pos => {
          const config = POSITION_CONFIG[pos];
          const poolEmployees = positionPools[pos] || [];
          return (
            <PoolSection
              key={pos}
              id={pos}
              title={config.label}
              icon={config.icon}
              color={config.color}
              employees={poolEmployees}
              showStatus={false}
            />
          );
        })}
        
        {/* Uncategorized / No Position */}
        {unassignedEmployees.length > 0 && (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setUnassignedExpanded(!unassignedExpanded)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">📋</span>
                <span className="font-semibold text-navy">No Position Assigned</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gray-400">{unassignedEmployees.length}</span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray transition-transform ${unassignedExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {unassignedExpanded && (
              <div className="border-t border-border">
                {unassignedEmployees.map(e => (
                  <EmployeeRow key={e.id} employee={e} showStatus={false} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inactive Employees */}
      {inactiveEmployees.length > 0 && (
        <div className="bg-white rounded-xl border border-warning/30 overflow-hidden">
          <button
            onClick={() => setInactiveExpanded(!inactiveExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-warning/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">⏸️</span>
              <span className="font-semibold text-navy">Inactive</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-warning">{inactiveEmployees.length}</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray transition-transform ${inactiveExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {inactiveExpanded && (
            <div className="border-t border-warning/30 bg-white">
              {inactiveEmployees.map(e => (
                <EmployeeRow key={e.id} employee={e} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Terminated Employees */}
      {terminatedEmployees.length > 0 && (
        <div className="bg-white rounded-xl border border-error/30 overflow-hidden">
          <button
            onClick={() => setTerminatedExpanded(!terminatedExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-error/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🚫</span>
              <span className="font-semibold text-navy">Terminated</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-error">{terminatedEmployees.length}</span>
            </div>
            <svg 
              className={`w-5 h-5 text-gray transition-transform ${terminatedExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {terminatedExpanded && (
            <div className="border-t border-error/30 bg-white">
              {terminatedEmployees.map(e => (
                <EmployeeRow key={e.id} employee={e} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {employees.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray">No employees yet</p>
          <p className="text-sm text-gray mt-1">Hire applicants to see them here</p>
        </div>
      )}

      {/* Side Panel */}
      {selectedEmployee && (
        <>
          <div
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-250 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closePanel}
          />
          <div className={`fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="px-6 py-5 bg-navy flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h2>
                  <p className="text-sm text-white/70">{selectedEmployee.position || 'No position'}</p>
                </div>
                {(preferences?.position_applied || selectedEmployee.position) && (
                  <span className="text-sm font-bold text-white bg-white/20 px-2 py-0.5 rounded">
                    {getPositionLabel(preferences?.position_applied || selectedEmployee.position)}
                  </span>
                )}
              </div>
              <button onClick={closePanel} className="text-white/60 hover:text-white text-2xl leading-none p-1">×</button>
            </div>

            {/* Panel Tab Navigation */}
            <div className="flex border-b border-border bg-white flex-shrink-0">
              <button
                onClick={() => setPanelTab('overview')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  panelTab === 'overview' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setPanelTab('uploads')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  panelTab === 'uploads' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Uploads
              </button>
              <button
                onClick={() => setPanelTab('agreements')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  panelTab === 'agreements' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Agreements
              </button>
              <button
                onClick={() => setPanelTab('application')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  panelTab === 'application' ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Application
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : panelTab === 'overview' ? (
                /* Overview Tab */
                <>
                  {/* Work Preferences */}
                  {preferences && (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-5">
                      {[
                        { label: 'City', value: preferences.city || '—' },
                        { label: 'Position', value: getPositionLabel(preferences.position_applied) },
                        { label: 'Credential', value: preferences.credential_type ? preferences.credential_type.toUpperCase() : '—' },
                        { label: 'Hours', value: formatHours(preferences.hours_per_week) },
                        { label: 'Transport', value: formatTransportation(preferences.has_transportation, preferences.max_travel_miles) },
                        { label: 'Availability', value: formatAvailability(preferences.available_days) },
                        { label: 'Smokers?', value: formatSmokerPref(preferences.comfortable_with_smokers) },
                      ].map((row, i, arr) => (
                        <div key={i} className={`grid grid-cols-[110px_1fr] px-4 py-3 items-center ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <span className="text-xs font-semibold text-navy">{row.label}</span>
                          <span className="text-sm text-slate">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {loadingPreferences && (
                    <div className="bg-white rounded-lg shadow-sm p-4 mb-5 text-center">
                      <svg className="h-5 w-5 animate-spin text-maroon mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-xs text-gray mt-2">Loading preferences...</p>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray uppercase tracking-wide">Contact Info</span>
                    </div>
                    {[
                      { label: 'Email', value: selectedEmployee.email },
                      { label: 'Phone', value: selectedEmployee.phone || '—' },
                      { label: 'Status', value: selectedEmployee.status.charAt(0).toUpperCase() + selectedEmployee.status.slice(1) },
                      { label: 'Hire Date', value: selectedEmployee.hire_date ? formatDate(selectedEmployee.hire_date) : '—' },
                      { label: 'Location', value: selectedEmployee.location_name || '—' },
                    ].map((row, i, arr) => (
                      <div key={i} className={`grid grid-cols-[110px_1fr] px-4 py-3 items-center ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <span className="text-xs font-semibold text-navy">{row.label}</span>
                        <span className="text-sm text-slate">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Current Assignments */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-navy">Current Clients</h3>
                      <span className="text-xs text-gray">{activeAssignments.length} assigned</span>
                    </div>
                    {activeAssignments.length === 0 ? (
                      <div className="bg-white rounded-lg shadow-sm p-4 text-center">
                        <p className="text-sm text-gray">No clients assigned</p>
                        <p className="text-xs text-gray mt-1">Assign a client to start scheduling</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeAssignments.map((assignment) => (
                          <div key={assignment.id} className="bg-white rounded-lg shadow-sm p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-navy">{assignment.client_name}</p>
                                <p className="text-xs text-gray mt-0.5">
                                  Since {assignment.start_date ? formatDate(assignment.start_date) : 'N/A'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleOpenReassignModal(assignment)}
                                  className="text-xs text-maroon hover:underline"
                                  title="Change to different client"
                                >
                                  Change
                                </button>
                                <button
                                  onClick={() => handleOpenEndModal(assignment)}
                                  className="text-xs text-gray hover:text-error hover:underline"
                                  title="Remove from this client"
                                >
                                  Unassign
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions - 3 column grid now */}
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <button
                      onClick={handleOpenAssignModal}
                      className="py-3 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 transition-colors flex items-center justify-center gap-1"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span className="hidden sm:inline">{activeAssignments.length > 0 ? 'Add' : 'Assign'}</span>
                    </button>
                    <button
                      onClick={() => setShowDocumentUploadModal(true)}
                      className="py-3 bg-maroon text-white text-sm font-semibold rounded-lg hover:bg-maroon/90 transition-colors flex items-center justify-center gap-1"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="hidden sm:inline">Upload</span>
                    </button>
                    <Link
                      to={`/admin/employee/${selectedEmployee.id}`}
                      className="py-3 bg-white border border-border text-navy text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                      Profile
                    </Link>
                  </div>

                  {/* Assignment History Toggle */}
                  <div className="mt-5">
                    <button
                      onClick={() => {
                        if (!showHistorySection) {
                          loadAssignmentHistory(selectedEmployee.id);
                        }
                        setShowHistorySection(!showHistorySection);
                      }}
                      className="w-full py-2 text-sm text-maroon hover:underline flex items-center justify-center gap-1"
                    >
                      {showHistorySection ? 'Hide' : 'Show'} Assignment History
                      <svg className={`h-4 w-4 transition-transform ${showHistorySection ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showHistorySection && (
                      <div className="mt-3 space-y-2">
                        {loadingAssignments ? (
                          <div className="flex justify-center py-4">
                            <svg className="h-5 w-5 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        ) : assignmentHistory.length === 0 ? (
                          <p className="text-sm text-gray text-center py-4">No assignment history</p>
                        ) : (
                          assignmentHistory.map((assignment) => (
                            <div key={assignment.id} className={`bg-white rounded-lg shadow-sm p-3 ${!assignment.is_active ? 'opacity-60' : ''}`}>
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-medium text-navy">{assignment.client_name}</p>
                                  <p className="text-xs text-gray mt-0.5">
                                    {assignment.start_date ? formatDate(assignment.start_date) : 'N/A'}
                                    {assignment.end_date && ` — ${formatDate(assignment.end_date)}`}
                                  </p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${assignment.is_active ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray'}`}>
                                  {assignment.is_active ? 'Active' : 'Ended'}
                                </span>
                              </div>
                              {!assignment.is_active && assignment.end_reason && (
                                <p className="text-xs text-gray mt-2 pt-2 border-t border-gray-100">
                                  Reason: {END_REASONS.find(r => r.value === assignment.end_reason)?.label || assignment.end_reason || 'Not specified'}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Document Tabs (uploads, agreements, application) */
                <DocumentTabs
                  key={documentTabsKey}
                  employeeId={selectedEmployee.id}
                  personName={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                  activeTab={panelTab as 'uploads' | 'agreements' | 'application'}
                  onTabChange={(tab) => setPanelTab(tab)}
                  hideTabNav={true}
                />
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <p className="text-[10px] text-gray-400 text-center">Powered by MediVault</p>
            </div>
          </div>
        </>
      )}

      {/* Document Upload Modal (from Overview tab) */}
      {selectedEmployee && (
        <DocumentUploadModal
          isOpen={showDocumentUploadModal}
          onClose={() => setShowDocumentUploadModal(false)}
          employeeId={selectedEmployee.id}
          employeeName={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
          onSuccess={handleDocumentUploadSuccess}
        />
      )}

      {/* Assign/Reassign Client Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={isReassignment
          ? `Reassign Client for ${selectedEmployee?.first_name || 'Employee'}`
          : `Assign Client to ${selectedEmployee?.first_name || 'Employee'}`
        }
      >
        <div className="space-y-4">
          {isReassignment && reassigningFrom && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-yellow-800 uppercase mb-1">Replacing Current Client</p>
              <p className="text-sm text-yellow-900">{reassigningFrom.client_name}</p>
              <p className="text-xs text-yellow-700">
                Assigned since {reassigningFrom.start_date ? formatDate(reassigningFrom.start_date) : 'N/A'}
              </p>
            </div>
          )}

          {isReassignment && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate">Reason for Change *</label>
              <select
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
              >
                {END_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray">This will be logged in the audit trail</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Search Clients</label>
            <Input
              placeholder="Type to search by name..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              autoFocus={!isReassignment}
            />
            <p className="mt-1 text-xs text-gray">
              {clientTotal > 0 ? `${clientTotal} clients found` : 'Start typing to search'}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Select Client</label>
            {loadingClients ? (
              <div className="flex justify-center py-4 border border-border rounded-lg">
                <svg className="h-5 w-5 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="border border-border rounded-lg">
                <div className="max-h-48 overflow-y-auto">
                  {clients.length === 0 ? (
                    <p className="p-3 text-sm text-gray text-center">
                      {clientSearch.trim() ? 'No clients found' : 'Type to search clients'}
                    </p>
                  ) : (
                    clients.map((client) => {
                      const name = client.nickname || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown';
                      const isAssigned = assignedClientIds.has(client.id);
                      const isCurrentClient = reassigningFrom?.client_id === client.id;

                      return (
                        <button
                          key={client.id}
                          onClick={() => !isAssigned && !isCurrentClient && setSelectedClientId(client.id)}
                          disabled={isAssigned || isCurrentClient}
                          className={`w-full text-left px-3 py-2.5 border-b border-border last:border-b-0 flex items-center justify-between transition-colors ${
                            selectedClientId === client.id
                              ? 'bg-maroon/5 border-l-2 border-l-maroon'
                              : isAssigned || isCurrentClient
                                ? 'bg-gray-50 cursor-not-allowed opacity-60'
                                : 'hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-navy">{name}</p>
                            <p className="text-xs text-gray capitalize">{client.status}</p>
                          </div>
                          {isCurrentClient && (
                            <span className="text-xs text-warning">Current</span>
                          )}
                          {isAssigned && !isCurrentClient && (
                            <span className="text-xs text-gray">Already assigned</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                {clientTotal > clientPageSize && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-gray-50">
                    <span className="text-xs text-gray">
                      Page {clientPage} of {Math.ceil(clientTotal / clientPageSize)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setClientPage(p => Math.max(1, p - 1))}
                        disabled={clientPage === 1}
                        className="px-2 py-1 text-xs rounded border border-border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setClientPage(p => p + 1)}
                        disabled={clientPage >= Math.ceil(clientTotal / clientPageSize)}
                        className="px-2 py-1 text-xs rounded border border-border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
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
            <textarea
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
              placeholder={isReassignment ? "Additional notes about this change..." : "Any notes about this assignment..."}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssignClient} loading={assigning} disabled={!selectedClientId}>
              {isReassignment ? 'Reassign Client' : 'Assign Client'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* End Assignment Modal */}
      <Modal isOpen={showEndModal} onClose={() => setShowEndModal(false)} title="Unassign from Client">
        <div className="space-y-4">
          {endingAssignment && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-slate">{endingAssignment.client_name}</p>
              <p className="text-xs text-gray">
                Assigned since {endingAssignment.start_date ? formatDate(endingAssignment.start_date) : 'N/A'}
              </p>
            </div>
          )}

          <p className="text-sm text-gray">
            This will remove the employee from this client. They will appear in the "Employees Needing Clients" queue on the dashboard.
          </p>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Reason for Ending *</label>
            <select
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
            >
              <option value="">Select a reason...</option>
              {END_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray">Required for audit compliance</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Additional Notes</label>
            <textarea
              value={endNotes}
              onChange={(e) => setEndNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
              placeholder="Any additional details about ending this assignment..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEndModal(false)}>Cancel</Button>
            <Button onClick={handleEndAssignment} loading={ending} disabled={!endReason} variant="primary">
              End Assignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
