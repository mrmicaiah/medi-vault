import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { formatDate, daysUntil } from '../../lib/utils';

interface Employee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  position: string;
  status: string;
  hire_date: string;
}

interface DocumentAlert {
  id: string;
  employee_id: string;
  employee_name: string;
  document_type: string;
  category: string;
  expires_at?: string;
  status: 'expiring_soon' | 'expired' | 'missing';
}

// Document types we track for each employee
const TRACKED_DOCUMENTS = [
  { type: 'CPR Certification', category: 'Certification' },
  { type: 'TB Test Results', category: 'Health' },
  { type: 'HHA Certificate', category: 'Certification' },
  { type: 'Driver\'s License', category: 'Identification' },
  { type: 'Work Authorization', category: 'Identification' },
];

const statusConfig: Record<string, { variant: 'warning' | 'error' | 'neutral'; label: string }> = {
  expiring_soon: { variant: 'warning', label: 'Expiring Soon' },
  expired: { variant: 'error', label: 'Expired' },
  missing: { variant: 'neutral', label: 'Missing' },
};

export function CompliancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'expiring_soon' | 'expired' | 'missing'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'expires'>('expires');

  // For now, generate alerts based on employees (will be replaced with real document data)
  const [alerts, setAlerts] = useState<DocumentAlert[]>([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ employees: Employee[] }>('/admin/employees');
      setEmployees(res.employees || []);
      
      // Generate sample alerts based on employees
      // In production, this would come from the documents table
      const sampleAlerts: DocumentAlert[] = [];
      (res.employees || []).forEach((emp, idx) => {
        // Add some variety - not every employee has issues
        if (idx % 3 === 0) {
          sampleAlerts.push({
            id: `${emp.id}-cpr`,
            employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            document_type: 'CPR Certification',
            category: 'Certification',
            expires_at: new Date(Date.now() + (7 + idx) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'expiring_soon',
          });
        }
        if (idx % 4 === 0) {
          sampleAlerts.push({
            id: `${emp.id}-tb`,
            employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            document_type: 'TB Test Results',
            category: 'Health',
            expires_at: new Date(Date.now() - (idx + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'expired',
          });
        }
        if (idx % 5 === 0) {
          sampleAlerts.push({
            id: `${emp.id}-dl`,
            employee_id: emp.id,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            document_type: 'Driver\'s License',
            category: 'Identification',
            status: 'missing',
          });
        }
      });
      setAlerts(sampleAlerts);
    } catch (err) {
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort
  const filteredAlerts = alerts
    .filter(a => {
      const matchFilter = filter === 'all' || a.status === filter;
      const matchSearch = !search || 
        a.employee_name.toLowerCase().includes(search.toLowerCase()) || 
        a.document_type.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.employee_name.localeCompare(b.employee_name);
      }
      // Sort by expiration (missing docs last, then expired, then expiring soon)
      if (!a.expires_at && !b.expires_at) return 0;
      if (!a.expires_at) return 1;
      if (!b.expires_at) return -1;
      return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    });

  // Counts for filter badges
  const counts = {
    all: alerts.length,
    expiring_soon: alerts.filter(a => a.status === 'expiring_soon').length,
    expired: alerts.filter(a => a.status === 'expired').length,
    missing: alerts.filter(a => a.status === 'missing').length,
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
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Documents</h1>
        <p className="mt-1 text-sm text-gray">Track employee certifications and compliance documents</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort */}
        <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
          <span className="text-xs text-gray font-medium">Sort:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as 'name' | 'expires')}
            className="text-sm text-navy bg-transparent border-none focus:outline-none cursor-pointer"
          >
            <option value="expires">By Expiration</option>
            <option value="name">By Name</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
          {(['all', 'expiring_soon', 'expired', 'missing'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-navy text-white'
                  : 'text-gray hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? 'All' : statusConfig[status].label}
              {counts[status] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  filter === status 
                    ? 'bg-white/20' 
                    : status === 'expired' 
                      ? 'bg-error/10 text-error' 
                      : status === 'expiring_soon'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-gray-100'
                }`}>
                  {counts[status]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-xs">
          <input
            type="text"
            placeholder="Search employee or document..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Employee</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Document</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Category</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Expires</th>
              <th className="text-right text-xs font-semibold text-gray uppercase tracking-wider px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray">
                  {alerts.length === 0 ? 'No document alerts' : 'No alerts match the current filters'}
                </td>
              </tr>
            ) : (
              filteredAlerts.map((item) => {
                const days = item.expires_at ? daysUntil(item.expires_at) : null;
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link 
                        to={`/admin/employee/${item.employee_id}`} 
                        className="text-sm font-semibold text-maroon hover:underline"
                      >
                        {item.employee_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate">{item.document_type}</td>
                    <td className="px-6 py-4 text-sm text-gray">{item.category}</td>
                    <td className="px-6 py-4">
                      <Badge variant={statusConfig[item.status].variant}>
                        {statusConfig[item.status].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.expires_at ? (
                        <span className={days !== null && days <= 0 ? 'font-medium text-error' : 'text-gray'}>
                          {formatDate(item.expires_at)}
                          {days !== null && days > 0 && (
                            <span className="ml-1 text-xs text-gray">({days}d)</span>
                          )}
                          {days !== null && days <= 0 && (
                            <span className="ml-1 text-xs">({Math.abs(days)}d ago)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">
                        Notify
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-[10px] text-gray-400">Powered by MediSVault</p>
      </div>
    </div>
  );
}
