import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
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

  // Selected client slide-in panel
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Compliance data for assigned employees
  const [employeeCompliance, setEmployeeCompliance] = useState<Record<string, ComplianceSummary>>({});

  useEffect(() => {
    loadClients();
  }, [page, statusFilter]);

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

  async function loadClientDetail(clientId: string) {
    try {
      setLoadingDetail(true);
      const data = await api.get<ClientDetail>(`/clients/${clientId}`);
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

  function handleSelectClient(client: Client) {
    loadClientDetail(client.id);
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

  const totalPages = Math.ceil(total / pageSize);

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content - client list */}
        <div className={selectedClient ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Card padding="none">
            {/* Filters */}
            <div className="border-b border-border p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <svg
                  className="h-8 w-8 animate-spin text-maroon"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <svg
                  className="h-12 w-12 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="mt-3 text-sm text-gray">No clients found</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setShowAddModal(true)}
                >
                  Add your first client
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                        Caregivers
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        className={`cursor-pointer border-b border-border last:border-0 hover:bg-gray-50/50 ${
                          selectedClient?.id === client.id ? 'bg-maroon/5' : ''
                        }`}
                        onClick={() => handleSelectClient(client)}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate">{client.nickname}</p>
                          {(client.first_name || client.last_name) && (
                            <p className="text-xs text-gray">
                              {client.first_name} {client.last_name}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray">
                          {client.location_name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadgeVariant[client.status] || 'neutral'}>
                            {client.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {client.active_assignments > 0 ? (
                            <span className="text-sm text-slate">
                              {client.active_assignments} assigned
                            </span>
                          ) : (
                            <span className="text-xs text-gray">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectClient(client);
                            }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-sm text-gray">
                  Showing {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Slide-in panel for selected client */}
        {selectedClient && (
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-navy">
                    {selectedClient.nickname}
                  </h2>
                  {(selectedClient.first_name || selectedClient.last_name) && (
                    <p className="text-sm text-gray">
                      {selectedClient.first_name} {selectedClient.last_name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedClient(null);
                    setEmployeeCompliance({});
                  }}
                  className="rounded-lg p-1 text-gray hover:bg-gray-100"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray">Status</span>
                  <Badge variant={statusBadgeVariant[selectedClient.status] || 'neutral'}>
                    {selectedClient.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray">Location</span>
                  <span className="text-sm text-slate">
                    {selectedClient.location_name || 'Not assigned'}
                  </span>
                </div>

                {selectedClient.created_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray">Added</span>
                    <span className="text-sm text-slate">
                      {formatDate(selectedClient.created_at)}
                    </span>
                  </div>
                )}
              </div>

              {/* Assigned Caregivers with Compliance */}
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-medium text-slate mb-3">
                  Assigned Caregivers ({selectedClient.assignments.filter(a => a.is_active).length})
                </h3>
                
                {loadingDetail ? (
                  <div className="flex justify-center py-4">
                    <svg className="h-5 w-5 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                ) : selectedClient.assignments.filter(a => a.is_active).length === 0 ? (
                  <p className="text-xs text-gray">No caregivers assigned</p>
                ) : (
                  <div className="space-y-3">
                    {selectedClient.assignments
                      .filter(a => a.is_active)
                      .map((assignment) => {
                        const compliance = employeeCompliance[assignment.employee_id];
                        return (
                          <div key={assignment.assignment_id} className="rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link 
                                  to={`/admin/employee/${assignment.employee_id}`}
                                  className="text-sm font-medium text-slate hover:text-maroon"
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
                                <Badge 
                                  variant={compliance.is_compliant ? 'success' : 'error'}
                                  className="text-xs"
                                >
                                  {compliance.is_compliant ? 'Compliant' : 'Non-Compliant'}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Compliance Details */}
                            {compliance && (
                              <div className="mt-2 pt-2 border-t border-border space-y-1">
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

              <div className="mt-6 space-y-2">
                <Button variant="secondary" className="w-full">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Assign Caregiver
                </Button>
                <Button variant="ghost" className="w-full">
                  Edit Details
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Client"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate">
              Client Nickname
            </label>
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
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClient} loading={adding} disabled={!newClientName.trim()}>
              Add Client
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
