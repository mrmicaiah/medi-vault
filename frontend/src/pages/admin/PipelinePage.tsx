import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { ApplicantDetailPanel } from '../../components/admin/ApplicantDetailPanel';

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
  location_name?: string;
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

interface DashboardStats {
  total_applicants: number;
  in_progress: number;
  submitted: number;
  under_review: number;
  approved: number;
  rejected: number;
  hired: number;
  total_employees: number;
  active_employees: number;
  expiring_documents: number;
  expired_documents: number;
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

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'in_progress':
      return { bg: 'bg-sky-50', text: 'text-navy', label: 'In Progress' };
    case 'submitted':
      return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Submitted' };
    case 'under_review':
      return { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Under Review' };
    case 'approved':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Ready' };
    case 'rejected':
      return { bg: 'bg-red-50', text: 'text-red-700', label: 'Rejected' };
    case 'hired':
      return { bg: 'bg-green-100', text: 'text-green-800', label: 'Hired' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  }
};

export function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pipelineRes, statsRes] = await Promise.all([
        api.get<PipelineResponse>('/admin/pipeline'),
        api.get<DashboardStats>('/admin/dashboard'),
      ]);
      setPipeline(pipelineRes);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Flatten all applicants with their status
  const allApplicants: Applicant[] =
    pipeline?.stages.flatMap((s) =>
      s.applicants.map((a) => ({ ...a, status: s.status }))
    ) || [];

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
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  // Calculate stats for quick cards
  const newToday = allApplicants.filter((a) => {
    const today = new Date().toDateString();
    return new Date(a.updated_at).toDateString() === today;
  }).length;

  const awaitingDocs = stats?.in_progress || 0;
  const readyForReview = (stats?.submitted || 0) + (stats?.under_review || 0);
  const thisWeek = allApplicants.filter((a) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(a.updated_at) >= weekAgo;
  }).length;

  const quickStats = [
    { label: 'New Today', value: newToday.toString(), trend: null },
    { label: 'Awaiting Docs', value: awaitingDocs.toString(), trend: null },
    { label: 'Ready for Review', value: readyForReview.toString(), trend: null },
    { label: 'This Week', value: thisWeek.toString(), trend: null },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 animate-spin text-maroon"
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
          <p className="mt-3 text-sm text-gray">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Applicants</h1>
          <p className="mt-1 text-sm text-gray">{dateStr}</p>
        </div>
        <Button>
          <span className="mr-2 text-lg">+</span>
          Add Applicant
        </Button>
      </div>

      {error && (
        <Alert variant="error" dismissible>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat, i) => (
          <div
            key={i}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-gray">{stat.label}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold text-navy">
                {stat.value}
              </span>
              {stat.trend && (
                <span className="text-sm font-medium text-emerald-600">
                  {stat.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
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
                  ({pipeline?.stages.find((s) => s.status === f.value)?.count || 0})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Applicant Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray">
            Applicant
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray">
            Position
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray">
            Location
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray">
            Status
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray">
            Applied
          </span>
        </div>

        {/* Table Rows */}
        {filtered.map((applicant) => {
          const status = getStatusStyle(applicant.status || 'in_progress');
          const initials = `${applicant.first_name?.[0] || ''}${applicant.last_name?.[0] || ''}`;

          return (
            <div
              key={applicant.application_id}
              onClick={() => setSelectedApplicant(applicant)}
              className="grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 border-b border-gray-50 px-6 py-4 transition-colors hover:bg-gray-50/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-navy text-sm font-semibold text-white">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy">
                    {applicant.first_name} {applicant.last_name}
                  </p>
                  <p className="text-xs text-gray">{applicant.email}</p>
                </div>
              </div>
              <span className="flex items-center text-sm text-slate">CNA</span>
              <span className="flex items-center text-sm text-slate">
                {applicant.location_name || 'Not assigned'}
              </span>
              <div className="flex items-center">
                <span
                  className={`inline-block rounded-md px-3 py-1 text-xs font-medium ${status.bg} ${status.text}`}
                >
                  {status.label}
                </span>
              </div>
              <span className="flex items-center text-sm text-gray">
                {formatDate(applicant.updated_at)}
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-gray">
            No applicants found matching your criteria.
          </div>
        )}
      </div>

      {/* Slide-out Detail Panel */}
      {selectedApplicant && (
        <ApplicantDetailPanel
          applicant={selectedApplicant}
          onClose={() => setSelectedApplicant(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
