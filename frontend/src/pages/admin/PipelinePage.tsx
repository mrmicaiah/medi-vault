import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { ApplicationStatus } from '../../types';
import { formatDate } from '../../lib/utils';

interface Applicant {
  id: string;
  name: string;
  email: string;
  position: string;
  status: ApplicationStatus;
  progress: number;
  submitted_at?: string;
  created_at: string;
}

const mockApplicants: Applicant[] = [
  { id: '1', name: 'Maria Johnson', email: 'maria@example.com', position: 'PCA', status: 'submitted', progress: 100, submitted_at: '2026-03-29', created_at: '2026-03-20' },
  { id: '2', name: 'James Williams', email: 'james@example.com', position: 'HHA', status: 'under_review', progress: 100, submitted_at: '2026-03-27', created_at: '2026-03-15' },
  { id: '3', name: 'Sarah Davis', email: 'sarah@example.com', position: 'CNA', status: 'in_progress', progress: 68, created_at: '2026-03-25' },
  { id: '4', name: 'Robert Brown', email: 'robert@example.com', position: 'PCA', status: 'not_started', progress: 0, created_at: '2026-03-28' },
  { id: '5', name: 'Emily Chen', email: 'emily@example.com', position: 'RN', status: 'approved', progress: 100, submitted_at: '2026-03-22', created_at: '2026-03-10' },
  { id: '6', name: 'David Lee', email: 'david@example.com', position: 'LPN', status: 'rejected', progress: 100, submitted_at: '2026-03-20', created_at: '2026-03-05' },
  { id: '7', name: 'Ana Martinez', email: 'ana@example.com', position: 'PCA', status: 'submitted', progress: 100, submitted_at: '2026-03-28', created_at: '2026-03-18' },
  { id: '8', name: 'Kevin Wright', email: 'kevin@example.com', position: 'HHA', status: 'in_progress', progress: 45, created_at: '2026-03-26' },
];

const statusFilters: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const statusBadgeVariant: Record<ApplicationStatus, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  not_started: 'neutral',
  in_progress: 'info',
  submitted: 'warning',
  under_review: 'info',
  approved: 'success',
  rejected: 'error',
};

type SortField = 'name' | 'position' | 'status' | 'progress' | 'created_at';

export function PipelinePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = mockApplicants
    .filter((a) => {
      const matchesSearch =
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'position') cmp = a.position.localeCompare(b.position);
      else if (sortField === 'progress') cmp = a.progress - b.progress;
      else if (sortField === 'created_at') cmp = a.created_at.localeCompare(b.created_at);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
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
          <h1 className="font-display text-2xl font-bold text-navy">Applicant Pipeline</h1>
          <p className="mt-1 text-sm text-gray">
            Manage and review applicant submissions.
          </p>
        </div>
      </div>

      <Card padding="none">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === f.value
                      ? 'border-maroon bg-maroon-subtle text-maroon'
                      : 'border-border text-gray hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('name')}>
                  Applicant <SortIcon field="name" />
                </th>
                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('position')}>
                  Position <SortIcon field="position" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Status</th>
                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('progress')}>
                  Progress <SortIcon field="progress" />
                </th>
                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('created_at')}>
                  Applied <SortIcon field="created_at" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((applicant) => (
                <tr key={applicant.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate">{applicant.name}</p>
                      <p className="text-xs text-gray">{applicant.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate">{applicant.position}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant[applicant.status]}>
                      {applicant.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-gray-100">
                        <div
                          className="h-1.5 rounded-full bg-maroon"
                          style={{ width: `${applicant.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray">{applicant.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray">{formatDate(applicant.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/applicant/${applicant.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray">
                    No applicants found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
