import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import type { ApplicationStatus } from '../../types';
import { formatDate } from '../../lib/utils';

interface Applicant {
  application_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_step: number;
  completed_steps: number;
  submitted_at: string | null;
  updated_at: string;
  status?: string;
}

interface PipelineStage {
  status: string;
  count: number;
  applicants: Applicant[];
}

interface PipelineResponse {
  stages: PipelineStage[];
  total: number;
}

const statusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' },
];

const statusBadgeVariant: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  not_started: 'neutral',
  in_progress: 'info',
  submitted: 'warning',
  under_review: 'info',
  approved: 'success',
  rejected: 'error',
  hired: 'success',
};

type SortField = 'name' | 'status' | 'progress' | 'updated_at';

export function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const loadPipeline = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<PipelineResponse>('/admin/pipeline');
        setPipeline(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load pipeline');
      } finally {
        setLoading(false);
      }
    };
    
    loadPipeline();
  }, []);

  // Flatten all applicants with their status
  const allApplicants: Applicant[] = pipeline?.stages
    .flatMap(s => s.applicants.map(a => ({ ...a, status: s.status }))) || [];

  const filtered = allApplicants
    .filter((a) => {
      const name = `${a.first_name} ${a.last_name}`.toLowerCase();
      const matchesSearch =
        !search ||
        name.includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      } else if (sortField === 'progress') {
        cmp = a.completed_steps - b.completed_steps;
      } else if (sortField === 'updated_at') {
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Applicant Pipeline</h1>
          <p className="mt-1 text-sm text-gray">
            {pipeline?.total || 0} total applicants
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" dismissible>
          {error}
        </Alert>
      )}

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
                  {f.value !== 'all' && (
                    <span className="ml-1 text-gray-light">
                      ({pipeline?.stages.find(s => s.status === f.value)?.count || 0})
                    </span>
                  )}
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Status</th>
                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('progress')}>
                  Progress <SortIcon field="progress" />
                </th>
                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase text-gray" onClick={() => toggleSort('updated_at')}>
                  Last Updated <SortIcon field="updated_at" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((applicant) => (
                <tr key={applicant.application_id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate">
                        {applicant.first_name} {applicant.last_name}
                      </p>
                      <p className="text-xs text-gray">{applicant.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant[applicant.status || 'in_progress']}>
                      {(applicant.status || 'in_progress').replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-gray-100">
                        <div
                          className="h-1.5 rounded-full bg-maroon"
                          style={{ width: `${(applicant.completed_steps / 22) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray">{applicant.completed_steps}/22</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray">{formatDate(applicant.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/admin/applicant/${applicant.application_id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray">
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
