import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { formatDate } from '../../lib/utils';

interface Client {
  id: string;
  nickname: string;
  status: string;
  location_name?: string;
  active_assignments: number;
  first_name?: string;
  last_name?: string;
  created_at?: string;
}

interface ClientAssignment {
  assignment_id: string;
  employee_id: string;
  employee_name: string;
  employee_number?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

interface ClientDetail extends Client {
  assignments: ClientAssignment[];
}

interface Employee {
  id: string;
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  status: string;
}

interface EmployeeListResponse {
  items: Employee[];
  total: number;
}

interface ComplianceSummary {
  employee_id: string;
  is_compliant: boolean;
  alerts: string[];
  background_check?: { status: string; effective_date: string };
  oig_exclusion_check?: { status: string; check_result?: string; effective_date: string };
}

interface ClientListResponse {
  items: Client[];
  total: number;
  page: number;
  page_size: number;
}

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  discharged: 'error',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  // Add client modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [adding, setAdding] = useState(false);

  // Slide-out panel state (matching ApplicantsPage pattern)
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  
  // Compliance data for assigned employees
  const [employeeCompliance, setEmployeeCompliance] = useState<Record<string, ComplianceSummary>>({});

  // Assign Caregiver modal - with server-side search
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assignmentStartDate, setAssignmentStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSearchDebounced, setEmployeeSearchDebounced] = useState('');
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const employeePageSize = 20;

  useEffect(() => {
    loadClients();
  }, [page, statusFilter]);

  // Debounce employee search
  useEffect(() => {
    const timer = setTimeout(() => {
      setEmployeeSearchDebounced(employeeSearch);
      setEmployeePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [employeeSearch]);

  // Load employees when modal opens or search changes
  useEffect(() => {
    if (showAssignModal) {
      loadEmployees();
    }
  }, [showAssignModal, employeeSearchDebounced, employeePage]);

  async function loadClients() {
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

      const data = await api.get<ClientListResponse>(`/clients?${params}`);
      setClients(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  async function selectClient(client: Client) {
    setPanelOpen(true);
    setLoadingDetail(true);
    setEmployeeCompliance({});
    
    try {
      const data = await api.get<ClientDetail>(`/clients/${client.id}`);
      setSelectedClient(data);
      
      // Load compliance for each assigned employee
      const complianceMap: Record<string, ComplianceSummary> = {};
      for (const assignment of data.assignments.filter(a => a.is_active)) {
        try {
          const compliance = await api.get<ComplianceSummary>(
            `/employees/${assignment.employee_id}/compliance-summary`
          );
          complianceMap[assignment.employee_id] = compliance;
        } catch {
          // If compliance fails to load, skip
        }
      }
      setEmployeeCompliance(complianceMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load client details');
    } finally {
      setLoadingDetail(false);
    }
  }

  function closePanel() {
    setPanelOpen(false);
    setEmployeeCompliance({});
    setTimeout(() => {
      setSelectedClient(null);
    }, 250);
  }

  async function loadEmployees() {
    try {
      setLoadingEmployees(true);
      const params = new URLSearchParams({
        status: 'active',
        page: employeePage.toString(),
        page_size: employeePageSize.toString(),
      });
      if (employeeSearchDebounced.trim()) {
        params.set('search', employeeSearchDebounced.trim());
      }
      const data = await api.get<EmployeeListResponse>(`/employees?${params}`);
      setEmployees(data.items);
      setEmployeeTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadClients();
  }

  async function handleAddClient() {
    if (!newClientName.trim()) return;

    try {
      setAdding(true);
      await api.post('/clients', { nickname: newClientName.trim() });
      setNewClientName('');
      setShowAddModal(false);
      loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client');
    } finally {
      setAdding(false);
    }
  }

  function handleOpenAssignModal() {
    setShowAssignModal(true);
    setSelectedEmployeeId('');
    setAssignmentStartDate(new Date().toISOString().split('T')[0]);
    setAssignmentNotes('');
    setEmployeeSearch('');
    setEmployeeSearchDebounced('');
    setEmployeePage(1);
    setEmployees([]);
  }

  async function handleAssignCaregiver() {
    if (!selectedClient || !selectedEmployeeId) return;

    try {
      setAssigning(true);
      await api.post(`/employees/${selectedEmployeeId}/assignments`, {
        client_id: selectedClient.id,
        start_date: assignmentStartDate,
        notes: assignmentNotes || null,
      });
      setShowAssignModal(false);
      // Reload client detail to show new assignment
      selectClient(selectedClient);
      loadClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign caregiver');
    } finally {
      setAssigning(false);
    }
  }

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.nickname.toLowerCase().includes(q) ||
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // Get IDs of already assigned employees
  const assignedEmployeeIds = useMemo(() => {
    if (!selectedClient) return new Set<string>();
    return new Set(selectedClient.assignments.filter(a => a.is_active).map(a => a.employee_id));
  }, [selectedClient]);

  const totalPages = Math.ceil(total / pageSize);
  const employeeTotalPages = Math.ceil(employeeTotal / employeePageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Clients</h1>
          <p className="mt-1 text-sm text-gray">
            Manage care recipients and their caregiver assignments.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Button>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="w-full sm:max-w-xs">
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <div className="flex gap-2">
          {['all', 'active', 'inactive', 'discharged'].map((s) => (
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
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Client</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Location</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Caregivers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <svg className="h-8 w-8 animate-spin text-maroon mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </td>
              </tr>
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray">
                  {clients.length === 0 ? 'No clients yet' : 'No clients match the current filters'}
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => selectClient(client)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-navy">{client.nickname}</p>
                    {(client.first_name || client.last_name) && (
                      <p className="text-xs text-gray">
                        {client.first_name} {client.last_name}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate">
                    {client.location_name || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusBadgeVariant[client.status] || 'neutral'}>
                      {client.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {client.active_assignments > 0 ? (
                      <span className="text-sm text-slate">
                        {client.active_assignments} assigned
                      </span>
                    ) : (
                      <span className="text-xs text-gray">None</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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
      </div>

      {/* Slide-out Panel (matching ApplicantsPage pattern) */}
      {selectedClient && (
        <>
          <div
            className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-250 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={closePanel}
          />
          <div className={`fixed top-0 right-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-250 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="px-6 py-5 bg-navy flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedClient.nickname}</h2>
                {(selectedClient.first_name || selectedClient.last_name) && (
                  <p className="text-sm text-white/70">{selectedClient.first_name} {selectedClient.last_name}</p>
                )}
              </div>
              <button onClick={closePanel} className="text-white/60 hover:text-white text-2xl leading-none p-1">×</button>
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
              ) : (
                <>
                  {/* Client Info */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {[
                      { label: 'Status', value: <Badge variant={statusBadgeVariant[selectedClient.status] || 'neutral'}>{selectedClient.status}</Badge> },
                      { label: 'Location', value: selectedClient.location_name || 'Not assigned' },
                      { label: 'Added', value: selectedClient.created_at ? formatDate(selectedClient.created_at) : '—' },
                    ].map((row, i, arr) => (
                      <div key={i} className={`grid grid-cols-[110px_1fr] px-4 py-3 items-center ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <span className="text-xs font-semibold text-navy">{row.label}</span>
                        <span className="text-sm text-slate">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Assigned Caregivers */}
                  <div className="bg-white rounded-lg shadow-sm p-4 mt-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-gray uppercase tracking-wide">
                        Assigned Caregivers ({selectedClient.assignments.filter(a => a.is_active).length})
                      </span>
                    </div>

                    {selectedClient.assignments.filter(a => a.is_active).length === 0 ? (
                      <p className="text-xs text-gray">No caregivers assigned</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedClient.assignments.filter(a => a.is_active).map((assignment) => {
                          const compliance = employeeCompliance[assignment.employee_id];
                          return (
                            <div key={assignment.assignment_id} className="rounded-lg border border-gray-100 p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <Link
                                    to={`/admin/employee/${assignment.employee_id}`}
                                    className="text-sm font-medium text-navy hover:text-maroon"
                                  >
                                    {assignment.employee_name}
                                  </Link>
                                  {assignment.employee_number && (
                                    <p className="text-xs text-gray">{assignment.employee_number}</p>
                                  )}
                                  <p className="text-xs text-gray mt-0.5">
                                    Since {formatDate(assignment.start_date)}
                                  </p>
                                </div>
                                {compliance && (
                                  <Badge variant={compliance.is_compliant ? 'success' : 'error'} className="text-xs">
                                    {compliance.is_compliant ? 'Compliant' : 'Non-Compliant'}
                                  </Badge>
                                )}
                              </div>

                              {compliance && (
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray">Background</span>
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
                                  {compliance.alerts.length > 0 && (
                                    <div className="mt-1">
                                      {compliance.alerts.slice(0, 2).map((alert, i) => (
                                        <p key={i} className="text-xs text-warning flex items-center gap-1">
                                          <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                          </svg>
                                          <span className="truncate">{alert}</span>
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                      Assign Caregiver
                    </button>
                    <button className="py-3 bg-white border border-border text-navy text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                      Edit Details
                    </button>
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

      {/* Add Client Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Client">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Client Nickname</label>
            <Input
              placeholder="e.g., Mrs. Johnson, Smith Family"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              autoFocus
            />
            <p className="mt-1.5 text-xs text-gray">
              A short identifier for this client. You can add more details later.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddClient} loading={adding} disabled={!newClientName.trim()}>Add Client</Button>
          </div>
        </div>
      </Modal>

      {/* Assign Caregiver Modal */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title={`Assign Caregiver to ${selectedClient?.nickname || 'Client'}`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Search Employees</label>
            <Input
              placeholder="Type to search by name or employee number..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              autoFocus
            />
            <p className="mt-1 text-xs text-gray">
              {employeeTotal > 0 ? `${employeeTotal} employees found` : 'Start typing to search'}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">Select Employee</label>
            {loadingEmployees ? (
              <div className="flex justify-center py-4 border border-border rounded-lg">
                <svg className="h-5 w-5 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="border border-border rounded-lg">
                <div className="max-h-64 overflow-y-auto">
                  {employees.length === 0 ? (
                    <p className="p-3 text-sm text-gray text-center">
                      {employeeSearch.trim() ? 'No employees found' : 'Type to search employees'}
                    </p>
                  ) : (
                    employees.map((emp) => {
                      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
                      const isAssigned = assignedEmployeeIds.has(emp.id);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          disabled={isAssigned}
                          onClick={() => setSelectedEmployeeId(emp.id)}
                          className={`w-full flex items-center justify-between p-3 text-left border-b border-border last:border-0 transition-colors ${
                            selectedEmployeeId === emp.id
                              ? 'bg-maroon/10'
                              : isAssigned
                              ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium text-slate">{name}</p>
                            <p className="text-xs text-gray">
                              {emp.employee_number || 'No ID'} • {emp.job_title || 'Employee'}
                            </p>
                          </div>
                          {isAssigned ? (
                            <Badge variant="neutral" className="text-xs">Already assigned</Badge>
                          ) : selectedEmployeeId === emp.id ? (
                            <svg className="h-5 w-5 text-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>

                {employeeTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-3 py-2 bg-gray-50">
                    <p className="text-xs text-gray">Page {employeePage} of {employeeTotalPages}</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={employeePage === 1}
                        onClick={() => setEmployeePage((p) => p - 1)}
                        className="px-2 py-1 text-xs rounded border border-border bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        disabled={employeePage === employeeTotalPages}
                        onClick={() => setEmployeePage((p) => p + 1)}
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
              placeholder="Any notes about this assignment..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssignCaregiver} loading={assigning} disabled={!selectedEmployeeId}>Assign Caregiver</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
