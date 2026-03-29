import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatDate } from '../../lib/utils';

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  position: string;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date: string;
  expiring_docs: number;
}

const mockEmployees: EmployeeRow[] = [
  { id: '1', name: 'Emily Chen', email: 'emily@example.com', position: 'RN', status: 'active', hire_date: '2025-06-15', expiring_docs: 0 },
  { id: '2', name: 'Thomas Garcia', email: 'thomas@example.com', position: 'PCA', status: 'active', hire_date: '2025-08-01', expiring_docs: 2 },
  { id: '3', name: 'Lisa Park', email: 'lisa@example.com', position: 'HHA', status: 'active', hire_date: '2025-09-10', expiring_docs: 1 },
  { id: '4', name: 'Michael Reed', email: 'michael@example.com', position: 'CNA', status: 'on_leave', hire_date: '2025-04-20', expiring_docs: 0 },
  { id: '5', name: 'Jennifer White', email: 'jennifer@example.com', position: 'PCA', status: 'active', hire_date: '2025-11-01', expiring_docs: 0 },
  { id: '6', name: 'Carlos Rodriguez', email: 'carlos@example.com', position: 'LPN', status: 'inactive', hire_date: '2024-12-15', expiring_docs: 3 },
  { id: '7', name: 'Amanda Foster', email: 'amanda@example.com', position: 'PCA', status: 'active', hire_date: '2026-01-10', expiring_docs: 0 },
  { id: '8', name: 'Daniel Kim', email: 'daniel@example.com', position: 'HHA', status: 'active', hire_date: '2026-02-01', expiring_docs: 1 },
];

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  on_leave: 'warning',
};

type SortField = 'name' | 'position' | 'status' | 'hire_date';

export function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = mockEmployees
    .filter((e) => {
      const matchSearch =
        !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'position') cmp = a.position.localeCompare(b.position);
      else if (sortField === 'hire_date') cmp = a.hire_date.localeCompare(b.hire_date);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <svg className={`ml-1 inline h-3 w-3 ${sortField === field ? 'text-maroon' : 'text-gray-light'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDir === 'asc' && sortField === field ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
    </svg>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Employees</h1>
          <p className="mt-1 text-sm text-gray">Manage your active employees and their records.</p>
        </div>
        <span className="text-sm text-gray">{filtered.length} employees</span>
      </div>

      <Card padding="none">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'on_leave', 'inactive'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === s ? 'border-maroon bg-maroon-subtle text-maroon' : 'border-border text-gray hover:bg-gray-50'
                  }`}
                >
                  {s === 'all' ? 'All' : s === 'on_leave' ? 'On Leave' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('name')}>Employee <SortIcon field="name" /></th>
                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('position')}>Position <SortIcon field="position" /></th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Status</th>
                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('hire_date')}>Hire Date <SortIcon field="hire_date" /></th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Docs Alert</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => (
                <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate">{emp.name}</p>
                      <p className="text-xs text-gray">{emp.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate">{emp.position}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant[emp.status]}>
                      {emp.status === 'on_leave' ? 'On Leave' : emp.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray">{formatDate(emp.hire_date)}</td>
                  <td className="px-4 py-3">
                    {emp.expiring_docs > 0 ? (
                      <Badge variant="warning">{emp.expiring_docs} expiring</Badge>
                    ) : (
                      <span className="text-xs text-gray">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/employee/${emp.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
