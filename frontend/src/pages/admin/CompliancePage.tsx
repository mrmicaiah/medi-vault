import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
import { formatDate, daysUntil } from '../../lib/utils';

interface ComplianceItem {
  id: string;
  employee_id: string;
  employee_name: string;
  document_type: string;
  category: string;
  expires_at?: string;
  status: 'expiring_soon' | 'expired' | 'missing';
}

const mockAlerts: ComplianceItem[] = [
  { id: '1', employee_id: '2', employee_name: 'Thomas Garcia', document_type: 'CPR Certification', category: 'Certification', expires_at: '2026-04-10', status: 'expiring_soon' },
  { id: '2', employee_id: '2', employee_name: 'Thomas Garcia', document_type: 'TB Test Results', category: 'Health', expires_at: '2026-04-05', status: 'expiring_soon' },
  { id: '3', employee_id: '3', employee_name: 'Lisa Park', document_type: 'HHA Certificate', category: 'Certification', expires_at: '2026-03-15', status: 'expired' },
  { id: '4', employee_id: '6', employee_name: 'Carlos Rodriguez', document_type: 'Driver\'s License', category: 'Identification', expires_at: '2026-02-28', status: 'expired' },
  { id: '5', employee_id: '6', employee_name: 'Carlos Rodriguez', document_type: 'CPR Certification', category: 'Certification', status: 'missing' },
  { id: '6', employee_id: '6', employee_name: 'Carlos Rodriguez', document_type: 'TB Test Results', category: 'Health', status: 'missing' },
  { id: '7', employee_id: '8', employee_name: 'Daniel Kim', document_type: 'Work Authorization', category: 'Identification', expires_at: '2026-04-15', status: 'expiring_soon' },
];

const tabFilters = [
  { value: 'all', label: 'All Alerts' },
  { value: 'expiring_soon', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'missing', label: 'Missing' },
];

const statusBadge: Record<string, 'warning' | 'error' | 'neutral'> = {
  expiring_soon: 'warning',
  expired: 'error',
  missing: 'neutral',
};

export function CompliancePage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = mockAlerts.filter((a) => {
    const matchFilter = filter === 'all' || a.status === filter;
    const matchSearch = !search || a.employee_name.toLowerCase().includes(search.toLowerCase()) || a.document_type.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const expiredCount = mockAlerts.filter((a) => a.status === 'expired').length;
  const expiringCount = mockAlerts.filter((a) => a.status === 'expiring_soon').length;
  const missingCount = mockAlerts.filter((a) => a.status === 'missing').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Compliance Tracker</h1>
        <p className="mt-1 text-sm text-gray">Monitor expiring, expired, and missing employee documents.</p>
      </div>

      {expiredCount > 0 && (
        <Alert variant="error" title="Expired Documents">
          {expiredCount} document(s) have expired and need immediate attention.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning-bg p-2">
              <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-navy">{expiringCount}</p>
              <p className="text-xs text-gray">Expiring Soon</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-error-bg p-2">
              <svg className="h-5 w-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-navy">{expiredCount}</p>
              <p className="text-xs text-gray">Expired</p>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <svg className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-navy">{missingCount}</p>
              <p className="text-xs text-gray">Missing</p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="none">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {tabFilters.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setFilter(t.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === t.value ? 'border-maroon bg-maroon-subtle text-maroon' : 'border-border text-gray hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20 sm:max-w-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Document</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Expires</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/employee/${item.employee_id}`} className="text-sm font-medium text-maroon hover:underline">
                      {item.employee_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate">{item.document_type}</td>
                  <td className="px-4 py-3 text-sm text-gray">{item.category}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadge[item.status]}>
                      {item.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray">
                    {item.expires_at ? (
                      <span className={daysUntil(item.expires_at) <= 0 ? 'font-medium text-error' : ''}>
                        {formatDate(item.expires_at)}
                        {daysUntil(item.expires_at) > 0 && (
                          <span className="ml-1 text-xs">({daysUntil(item.expires_at)}d)</span>
                        )}
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">Notify</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray">No compliance alerts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
