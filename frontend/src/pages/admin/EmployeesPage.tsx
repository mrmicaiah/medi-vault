import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';

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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

type SortField = 'name' | 'job_title' | 'status' | 'hire_date';

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

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
  const [endingAssignment, setEndingAssignment] = useState<AssignmentHistoryEntry | null>(null);
  const [endReason, setEndReason] = useState('');
  const [endNotes, setEndNotes] = useState('');
  const [ending, setEnding] = useState(false);

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

  const selectEmployee = useCallback(async (employee: Employee) => {
    setSelectedEmployee(employee as EmployeeDetail);
    setPanelOpen(true);
    setShowHistorySection(false);
    setLoadingDetail(true);

    try {
      // Load assignments
      const assignRes = await api.get<ClientAssignment[]>(`/employees/${employee.id}/assignments`);
      setAssignments(assignRes || []);
      setSelectedEmployee(prev => prev ? { ...prev, assignments: assignRes || [] } : null);
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

  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => {
      setSelectedEmployee(null);
      setAssignments([]);
      setAssignmentHistory([]);
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
      // If reassigning, first end the current assignment
      if (isReassignment && reassigningFrom) {
        await api.post(`/assignments/${reassigningFrom.id}/end`, {
          end_reason: reassignReason,
          notes: `Reassigned to new client. ${assignmentNotes}`.trim(),
        });
      }

      // Create new assignment
      await api.post(`/employees/${selectedEmployee.id}/assignments`, {
        client_id: selectedClientId,
        start_date: assignmentStartDate || null,
        notes: isReassignment
          ? `Reassigned from ${reassigningFrom?.client_name}. ${assignmentNotes}`.trim()
          : assignmentNotes || null,
      });

      setShowAssignModal(false);
      // Reload assignments
      selectEmployee(selectedEmployee);
      loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign client');
    } finally {
      setAssigning(false);
    }
  }

  function handleOpenEndModal(assignment: AssignmentHistoryEntry) {
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
      // Reload history
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

  // Get IDs of already assigned clients (excluding the one being reassigned)
  const assignedClientIds = useMemo(() => {
    return new Set(
      assignments
        .filter(a => a.is_active && (!isReassignment || a.id !== reassigningFrom?.id))
        .map(a => a.client_id)
    );
  }, [assignments, isReassignment, reassigningFrom]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.employee_number && e.employee_number.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          break;
        case 'job_title':
          cmp = (a.position || '').localeCompare(b.position || '');
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'hire_date':
          cmp = (a.hire_date || '').localeCompare(b.hire_date || '');
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [employees, search, statusFilter, sortField, sortDir]);

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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Employees</h1>
          <p className="text-sm text-gray mt-1">Manage your team members</p>
        </div>
      </div>

      {error && <Alert variant="error" dismissible onDismiss={() => setError(null)}>{error}</Alert>}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-md">
          <Input
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
          <span className="text-xs text-gray font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm text-navy bg-transparent border-none focus:outline-none cursor-pointer"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
          <span className="text-xs text-gray font-medium">Sort:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="text-sm text-navy bg-transparent border-none focus:outline-none cursor-pointer"
          >
            <option value="name">Name</option>
            <option value="job_title">Position</option>
            <option value="status">Status</option>
            <option value="hire_date">Hire Date</option>
          </select>
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="text-gray hover:text-navy"
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Position</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Hire Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray">
                  {employees.length === 0 ? 'No employees yet' : 'No employees match the current filters'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  onClick={() => selectEmployee(employee)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy text-white text-sm font-medium">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy">{employee.first_name} {employee.last_name}</p>
                        <p className="text-xs text-gray">{employee.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate">{employee.position || '—'}</td>
                  <td className="px-6 py-4">{getStatusBadge(employee.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray">
                    {employee.hire_date ? formatDate(employee.hire_date) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Side Panel */}
      {selectedEmployee && (
        <>
          <div
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-250 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closePanel}
          />
          <div className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="px-6 py-5 bg-navy flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </h2>
                <p className="text-sm text-white/70">{selectedEmployee.position || 'No position'}</p>
              </div>
              <button onClick={closePanel} className="text-white/60 hover:text-white text-2xl leading-none p-1">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : (
                <>
                  {/* Basic Info */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <button
                      onClick={handleOpenAssignModal}
                      className="py-3 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      {activeAssignments.length > 0 ? 'Add Client' : 'Assign Client'}
                    </button>
                    <Link
                      to={`/admin/employee/${selectedEmployee.id}`}
                      className="py-3 bg-white border border-border text-navy text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                      Full Profile
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
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <p className="text-[10px] text-gray-400 text-center">Powered by MediSVault</p>
            </div>
          </div>
        </>
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
          {/* Show current client being replaced */}
          {isReassignment && reassigningFrom && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-yellow-800 uppercase mb-1">Replacing Current Client</p>
              <p className="text-sm text-yellow-900">{reassigningFrom.client_name}</p>
              <p className="text-xs text-yellow-700">
                Assigned since {reassigningFrom.start_date ? formatDate(reassigningFrom.start_date) : 'N/A'}
              </p>
            </div>
          )}

          {/* Reason for reassignment */}
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
