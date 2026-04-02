import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/utils';

interface Employee {
  id: string;
  user_id: string;
  employee_number?: string;
  status: string;
  hire_date: string;
  job_title?: string;
  department?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface EmployeeListResponse {
  items: Employee[];
  total: number;
  page: number;
  page_size: number;
}

interface ClientAssignment {
  id: string;
  client_id: string;
  client_name: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  assigned_by?: string;
  notes?: string;
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

interface ComplianceSummary {
  employee_id: string;
  is_compliant: boolean;
  alerts: string[];
  background_check?: { status: string; effective_date: string };
  oig_exclusion_check?: { status: string; check_result?: string; effective_date: string };
}

// Assignment history types
interface AuditLogEntry {
  id: string;
  action: string;
  performed_by_name?: string;
  performed_at: string;
  employee_compliant?: boolean;
  background_check_status?: string;
  oig_check_status?: string;
  end_reason?: string;
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
  assigned_by_name?: string;
  created_at?: string;
  was_compliant_at_assignment?: boolean;
  background_check_at_assignment?: string;
  oig_check_at_assignment?: string;
  ended_by_name?: string;
  ended_at?: string;
  end_reason?: string;
  audit_log: AuditLogEntry[];
}

interface EmployeeAssignmentHistory {
  employee_id: string;
  employee_name: string;
  employee_number?: string;
  total_assignments: number;
  active_assignments: number;
  assignments: AssignmentHistoryEntry[];
}

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warning',
  terminated: 'error',
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  // Slide-out panel state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);

  // Assignment history (for audits)
  const [assignmentHistory, setAssignmentHistory] = useState<EmployeeAssignmentHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryTab, setShowHistoryTab] = useState(false);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);

  // Assign/Reassign Client modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isReassignment, setIsReassignment] = useState(false);
  const [reassigningFrom, setReassigningFrom] = useState<ClientAssignment | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [assignmentStartDate, setAssignmentStartDate] = useState(new Date().toISOString().split('T')[0]);
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

  useEffect(() => {
    loadEmployees();
  }, [page, statusFilter]);

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

  async function loadEmployees() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const data = await api.get<EmployeeListResponse>(`/employees?${params}`);
      setEmployees(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  async function selectEmployee(employee: Employee) {
    setPanelOpen(true);
    setLoadingDetail(true);
    setSelectedEmployee(employee);
    setAssignments([]);
    setCompliance(null);
    setShowHistoryTab(false);
    setAssignmentHistory(null);
    setExpandedAssignment(null);

    try {
      // Load assignments
      const assignmentsData = await api.get<ClientAssignment[]>(`/employees/${employee.id}/assignments`);
      setAssignments(assignmentsData);

      // Load compliance
      try {
        const complianceData = await api.get<ComplianceSummary>(`/employees/${employee.id}/compliance-summary`);
        setCompliance(complianceData);
      } catch {
        // Compliance might not exist yet
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee details');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadAssignmentHistory(employeeId: string) {
    try {
      setLoadingHistory(true);
      const data = await api.get<EmployeeAssignmentHistory>(`/assignments/employee/${employeeId}/history`);
      setAssignmentHistory(data);
    } catch (err) {
      console.error('Failed to load assignment history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignment history');
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleShowHistory() {
    if (!selectedEmployee) return;
    setShowHistoryTab(true);
    if (!assignmentHistory) {
      loadAssignmentHistory(selectedEmployee.id);
    }
  }

  function closePanel() {
    setPanelOpen(false);
    setShowHistoryTab(false);
    setAssignmentHistory(null);
    setTimeout(() => {
      setSelectedEmployee(null);
      setAssignments([]);
      setCompliance(null);
    }, 250);
  }

  async function loadClients() {
    try {
      setLoadingClients(true);
      const params = new URLSearchParams({
        status: 'active',
        page: clientPage.toString(),
        page_size: clientPageSize.toString(),
      });
      if (clientSearchDebounced.trim()) {
        params.set('search', clientSearchDebounced.trim());
      }
      const data = await api.get<ClientListResponse>(`/clients?${params}`);
      setClients(data.items);
      setClientTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadEmployees();
  }

  // Open modal for new assignment
  function handleOpenAssignModal() {
    setShowAssignModal(true);
    setIsReassignment(false);
    setReassigningFrom(null);
    setSelectedClientId('');
    setAssignmentStartDate(new Date().toISOString().split('T')[0]);
    setAssignmentNotes('');
    setReassignReason('reassignment');
    setClientSearch('');
    setClientSearchDebounced('');
    setClientPage(1);
    setClients([]);
  }

  // Open modal for reassignment (changing which client)
  function handleOpenReassignModal(currentAssignment: ClientAssignment) {
    setShowAssignModal(true);
    setIsReassignment(true);
    setReassigningFrom(currentAssignment);
    setSelectedClientId('');
    setAssignmentStartDate(new Date().toISOString().split('T')[0]);
    setAssignmentNotes('');
    setReassignReason('reassignment');
    setClientSearch('');
    setClientSearchDebounced('');
    setClientPage(1);
    setClients([]);
  }

  async function handleAssignClient() {
    if (!selectedEmployee || !selectedClientId) return;

    try {
      setAssigning(true);

      // If this is a reassignment, first end the current assignment
      if (isReassignment && reassigningFrom) {
        await api.post(`/assignments/${reassigningFrom.id}/end`, {
          end_reason: reassignReason,
          notes: `Reassigned to new client. ${assignmentNotes}`.trim(),
        });
      }

      // Create the new assignment
      await api.post(`/employees/${selectedEmployee.id}/assignments`, {
        client_id: selectedClientId,
        start_date: assignmentStartDate,
        notes: isReassignment
          ? `Reassigned from ${reassigningFrom?.client_name}. ${assignmentNotes}`.trim()
          : assignmentNotes || null,
      });

      setShowAssignModal(false);
      // Reload employee detail and history
      selectEmployee(selectedEmployee);
      setAssignmentHistory(null);
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

  const activeAssignments = useMemo(() => {
    return assignments.filter(a => a.is_active);
  }, [assignments]);

  const filtered = employees
    .filter((e) => {
      if (!search) return true;
      const name = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
      const email = (e.email || '').toLowerCase();
      const q = search.toLowerCase();
      return name.includes(q) || email.includes(q);
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`;
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`;
        cmp = nameA.localeCompare(nameB);
      } else if (sortField === 'job_title') {
        cmp = (a.job_title || '').localeCompare(b.job_title || '');
      } else if (sortField === 'hire_date') {
        cmp = (a.hire_date || '').localeCompare(b.hire_date || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <svg
      className={`ml-1 inline h-3 w-3 ${sortField === field ? 'text-maroon' : 'text-gray-light'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={sortDir === 'asc' && sortField === field ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
      />
    </svg>
  );

  const totalPages = Math.ceil(total / pageSize);
  const clientTotalPages = Math.ceil(clientTotal / clientPageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Employees</h1>
          <p className="mt-1 text-sm text-gray">Manage your active employees and their records.</p>
        </div>
        <span className="text-sm text-gray">{total} employees</span>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card padding="none">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearch} className="w-full sm:max-w-xs">
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
            <div className="flex gap-2">
              {['all', 'active', 'suspended', 'inactive', 'terminated'].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? 'border-maroon bg-maroon-subtle text-maroon'
                      : 'border-border text-gray hover:bg-gray-50'
                  }`}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="mt-3 text-sm text-gray">No employees found</p>
            <p className="mt-1 text-xs text-gray">Hire applicants to add them as employees</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('name')}>
                    Employee <SortIcon field="name" />
                  </th>
                  <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('job_title')}>
                    Position <SortIcon field="job_title" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Status</th>
                  <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('hire_date')}>
                    Hire Date <SortIcon field="hire_date" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Employee ID</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => selectEmployee(emp)}
                      className="border-b border-border last:border-0 hover:bg-gray-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate">{name}</p>
                          <p className="text-xs text-gray">{emp.email || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate">{emp.job_title || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant[emp.status] || 'neutral'}>{emp.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray">{emp.hire_date ? formatDate(emp.hire_date) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray">{emp.employee_number || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-gray">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Slide-out Panel */}
      {selectedEmployee && (
        <>
          <div
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-250 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closePanel}
          />
          <div className={`fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="px-6 py-5 bg-navy flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedEmployee.first_name} {selectedEmployee.last_name}
                </h2>
                <p className="text-sm text-white/70">{selectedEmployee.job_title || 'Employee'}</p>
              </div>
              <button onClick={closePanel} className="text-white/60 hover:text-white text-2xl leading-none p-1">×</button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-border bg-white flex-shrink-0">
              <button
                onClick={() => setShowHistoryTab(false)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  !showHistoryTab ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Overview
              </button>
              <button
                onClick={handleShowHistory}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  showHistoryTab ? 'text-maroon border-b-2 border-maroon' : 'text-gray hover:text-slate'
                }`}
              >
                Assignment History
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : showHistoryTab ? (
                /* Assignment History Tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray uppercase font-semibold tracking-wide">
                      Full Assignment History (for audits)
                    </p>
                    {assignmentHistory && (
                      <span className="text-xs text-gray">
                        {assignmentHistory.total_assignments} total, {assignmentHistory.active_assignments} active
                      </span>
                    )}
                  </div>

                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  ) : !assignmentHistory || assignmentHistory.assignments.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                      <p className="text-sm text-gray">No assignment history</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignmentHistory.assignments.map((assignment) => (
                        <div key={assignment.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                          {/* Assignment Header */}
                          <div
                            className="p-4 cursor-pointer hover:bg-gray-50"
                            onClick={() => setExpandedAssignment(expandedAssignment === assignment.id ? null : assignment.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-navy">{assignment.client_name}</span>
                                  <Badge variant={assignment.is_active ? 'success' : 'neutral'} className="text-xs">
                                    {assignment.is_active ? 'Active' : 'Ended'}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray mt-1">
                                  {assignment.start_date ? formatDate(assignment.start_date) : 'N/A'}
                                  {assignment.end_date ? ` — ${formatDate(assignment.end_date)}` : ' — Present'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {assignment.was_compliant_at_assignment !== undefined && (
                                  <Badge variant={assignment.was_compliant_at_assignment ? 'success' : 'error'} className="text-xs">
                                    {assignment.was_compliant_at_assignment ? 'Compliant' : 'Non-Compliant'}
                                  </Badge>
                                )}
                                <svg
                                  className={`h-4 w-4 text-gray transition-transform ${expandedAssignment === assignment.id ? 'rotate-180' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {expandedAssignment === assignment.id && (
                            <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                              {/* Assignment Details */}
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-gray">Assigned by:</span>
                                  <p className="font-medium text-slate">{assignment.assigned_by_name || 'Unknown'}</p>
                                </div>
                                <div>
                                  <span className="text-gray">Created:</span>
                                  <p className="font-medium text-slate">
                                    {assignment.created_at ? new Date(assignment.created_at).toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                              </div>

                              {/* Compliance at Assignment */}
                              <div className="bg-white rounded border border-gray-200 p-3">
                                <p className="text-xs font-semibold text-gray uppercase mb-2">Compliance at Assignment Time</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray">Background Check:</span>
                                    <span className={assignment.background_check_at_assignment === 'valid' || assignment.background_check_at_assignment === 'clear' ? 'text-green-600' : 'text-red-600'}>
                                      {assignment.background_check_at_assignment || 'Missing'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-gray">OIG Check:</span>
                                    <span className={assignment.oig_check_at_assignment === 'clear' ? 'text-green-600' : 'text-red-600'}>
                                      {assignment.oig_check_at_assignment || 'Missing'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* End Details (if ended) */}
                              {!assignment.is_active && (
                                <div className="bg-red-50 rounded border border-red-100 p-3">
                                  <p className="text-xs font-semibold text-red-800 uppercase mb-2">Assignment Ended</p>
                                  <div className="text-xs space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-red-600">Reason:</span>
                                      <span className="font-medium text-red-800">
                                        {END_REASONS.find(r => r.value === assignment.end_reason)?.label || assignment.end_reason || 'Not specified'}
                                      </span>
                                    </div>
                                    {assignment.ended_by_name && (
                                      <div className="flex justify-between">
                                        <span className="text-red-600">Ended by:</span>
                                        <span className="font-medium text-red-800">{assignment.ended_by_name}</span>
                                      </div>
                                    )}
                                    {assignment.ended_at && (
                                      <div className="flex justify-between">
                                        <span className="text-red-600">Ended on:</span>
                                        <span className="font-medium text-red-800">{new Date(assignment.ended_at).toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Audit Log */}
                              {assignment.audit_log.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray uppercase mb-2">Audit Trail</p>
                                  <div className="space-y-2">
                                    {assignment.audit_log.map((entry) => (
                                      <div key={entry.id} className="flex items-start gap-2 text-xs">
                                        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                                          entry.action === 'created' ? 'bg-green-500' :
                                          entry.action === 'ended' ? 'bg-red-500' : 'bg-yellow-500'
                                        }`} />
                                        <div className="flex-1">
                                          <p className="text-slate">
                                            <span className="font-medium capitalize">{entry.action}</span>
                                            {entry.performed_by_name && ` by ${entry.performed_by_name}`}
                                          </p>
                                          <p className="text-gray">{new Date(entry.performed_at).toLocaleString()}</p>
                                          {entry.notes && <p className="text-gray mt-0.5">Note: {entry.notes}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* End Assignment Button (if active) */}
                              {assignment.is_active && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEndModal(assignment);
                                  }}
                                  className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  End Assignment
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Overview Tab */
                <>
                  {/* Employee Info */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {[
                      { label: 'Status', value: <Badge variant={statusBadgeVariant[selectedEmployee.status] || 'neutral'}>{selectedEmployee.status}</Badge> },
                      { label: 'Employee ID', value: selectedEmployee.employee_number || 'Not assigned' },
                      { label: 'Email', value: selectedEmployee.email || '—' },
                      { label: 'Department', value: selectedEmployee.department || '—' },
                      { label: 'Hire Date', value: selectedEmployee.hire_date ? formatDate(selectedEmployee.hire_date) : '—' },
                    ].map((row, i, arr) => (
                      <div key={i} className={`grid grid-cols-[110px_1fr] px-4 py-3 items-center ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <span className="text-xs font-semibold text-navy">{row.label}</span>
                        <span className="text-sm text-slate">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Compliance Summary */}
                  <div className="bg-white rounded-lg shadow-sm p-4 mt-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray uppercase tracking-wide">Compliance Status</span>
                      {compliance && (
                        <Badge variant={compliance.is_compliant ? 'success' : 'error'}>
                          {compliance.is_compliant ? 'Compliant' : 'Non-Compliant'}
                        </Badge>
                      )}
                    </div>
                    {compliance ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray">Background Check</span>
                          {compliance.background_check ? (
                            <span className={`text-xs ${compliance.background_check.status === 'valid' ? 'text-green-600' : 'text-red-600'}`}>
                              {compliance.background_check.status}
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">Missing</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray">OIG Check</span>
                          {compliance.oig_exclusion_check ? (
                            <span className={`text-xs ${compliance.oig_exclusion_check.check_result === 'clear' ? 'text-green-600' : 'text-red-600'}`}>
                              {compliance.oig_exclusion_check.check_result || compliance.oig_exclusion_check.status}
                            </span>
                          ) : (
                            <span className="text-xs text-red-600">Missing</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray">No compliance data available</p>
                    )}
                  </div>

                  {/* Active Client Assignments */}
                  <div className="bg-white rounded-lg shadow-sm p-4 mt-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray uppercase tracking-wide">
                        Active Clients ({activeAssignments.length})
                      </span>
                    </div>

                    {activeAssignments.length === 0 ? (
                      <p className="text-xs text-gray">No clients assigned</p>
                    ) : (
                      <div className="space-y-3">
                        {activeAssignments.map((assignment) => (
                          <div key={assignment.id} className="rounded-lg border border-gray-100 p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-navy">{assignment.client_name}</p>
                                <p className="text-xs text-gray mt-0.5">
                                  Since {assignment.start_date ? formatDate(assignment.start_date) : 'N/A'}
                                </p>
                              </div>
                              <button
                                onClick={() => handleOpenReassignModal(assignment)}
                                className="text-xs text-maroon hover:underline"
                                title="Change client"
                              >
                                Change
                              </button>
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
                      className="py-3 bg-white border border-border text-navy text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
                    >
                      View Full Profile
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <p className="text-[10px] text-gray-400 text-center">Powered by MediVault</p>
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
                          type="button"
                          disabled={isAssigned || isCurrentClient}
                          onClick={() => setSelectedClientId(client.id)}
                          className={`w-full flex items-center justify-between p-3 text-left border-b border-border last:border-0 transition-colors ${
                            selectedClientId === client.id
                              ? 'bg-maroon/10'
                              : isAssigned || isCurrentClient
                              ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-slate">{name}</p>
                            <p className="text-xs text-gray capitalize">{client.status}</p>
                          </div>
                          {isCurrentClient ? (
                            <Badge variant="warning" className="text-xs">Current</Badge>
                          ) : isAssigned ? (
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

                {clientTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-3 py-2 bg-gray-50">
                    <p className="text-xs text-gray">Page {clientPage} of {clientTotalPages}</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={clientPage === 1}
                        onClick={() => setClientPage((p) => p - 1)}
                        className="px-2 py-1 text-xs rounded border border-border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={clientPage === clientTotalPages}
                        onClick={() => setClientPage((p) => p + 1)}
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
      <Modal isOpen={showEndModal} onClose={() => setShowEndModal(false)} title="End Assignment">
        <div className="space-y-4">
          {endingAssignment && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-slate">{endingAssignment.client_name}</p>
              <p className="text-xs text-gray">
                Assigned since {endingAssignment.start_date ? formatDate(endingAssignment.start_date) : 'N/A'}
              </p>
            </div>
          )}

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
