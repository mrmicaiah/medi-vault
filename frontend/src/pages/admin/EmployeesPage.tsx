import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
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

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warning',
  terminated: 'error',
};

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

  useEffect(() => {
    loadEmployees();
  }, [page, statusFilter]);

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadEmployees();
  }

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
        ) : filtered.length === 0 ? (
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <p className="mt-3 text-sm text-gray">No employees found</p>
            <p className="mt-1 text-xs text-gray">
              Hire applicants to add them as employees
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray"
                    onClick={() => toggleSort('name')}
                  >
                    Employee <SortIcon field="name" />
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray"
                    onClick={() => toggleSort('job_title')}
                  >
                    Position <SortIcon field="job_title" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                    Status
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray"
                    onClick={() => toggleSort('hire_date')}
                  >
                    Hire Date <SortIcon field="hire_date" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">
                    Employee ID
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
                  return (
                    <tr
                      key={emp.id}
                      className="border-b border-border last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate">{name}</p>
                          <p className="text-xs text-gray">{emp.email || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate">
                        {emp.job_title || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant[emp.status] || 'neutral'}>
                          {emp.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray">
                        {emp.hire_date ? formatDate(emp.hire_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray">
                        {emp.employee_number || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/admin/employee/${emp.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
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
  );
}
