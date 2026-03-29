import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/utils';

interface StatCard {
  label: string;
  value: number;
  change?: string;
  trend?: 'up' | 'down';
  color: string;
}

const stats: StatCard[] = [
  { label: 'Total Applicants', value: 48, change: '+5 this week', trend: 'up', color: 'bg-info-bg text-info' },
  { label: 'Pending Review', value: 12, change: '3 urgent', trend: 'up', color: 'bg-warning-bg text-warning' },
  { label: 'Active Employees', value: 156, change: '+2 this month', trend: 'up', color: 'bg-success-bg text-success' },
  { label: 'Expiring Documents', value: 8, change: '3 expired', trend: 'down', color: 'bg-error-bg text-error' },
];

interface RecentActivity {
  id: string;
  name: string;
  action: string;
  time: string;
  status: 'success' | 'warning' | 'info' | 'neutral';
}

const recentActivity: RecentActivity[] = [
  { id: '1', name: 'Maria Johnson', action: 'Submitted application', time: '2026-03-29T10:30:00', status: 'info' },
  { id: '2', name: 'James Williams', action: 'Completed background check', time: '2026-03-29T09:15:00', status: 'success' },
  { id: '3', name: 'Sarah Davis', action: 'CPR certification expiring', time: '2026-03-28T16:00:00', status: 'warning' },
  { id: '4', name: 'Robert Brown', action: 'Started application', time: '2026-03-28T14:30:00', status: 'neutral' },
  { id: '5', name: 'Emily Chen', action: 'Hired as PCA', time: '2026-03-28T11:00:00', status: 'success' },
];

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Dashboard</h1>
        <p className="mt-1 text-sm text-gray">Overview of your agency's applicant and employee pipeline.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray">{stat.label}</p>
                <p className="mt-1 font-display text-3xl font-bold text-navy">{stat.value}</p>
                {stat.change && (
                  <p className="mt-1 text-xs text-gray">{stat.change}</p>
                )}
              </div>
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                    stat.label === 'Total Applicants' ? 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' :
                    stat.label === 'Pending Review' ? 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' :
                    stat.label === 'Active Employees' ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' :
                    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
                  } />
                </svg>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          header={
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-navy">Recent Activity</h3>
              <Link to="/admin/pipeline" className="text-sm text-maroon hover:text-maroon-light">
                View all
              </Link>
            </div>
          }
        >
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-maroon-subtle text-xs font-medium text-maroon">
                  {item.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate">{item.name}</p>
                  <p className="text-xs text-gray">{item.action}</p>
                </div>
                <span className="text-xs text-gray-light">{formatDate(item.time)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card
          header={
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-navy">Pipeline Summary</h3>
              <Link to="/admin/pipeline" className="text-sm text-maroon hover:text-maroon-light">
                Manage
              </Link>
            </div>
          }
        >
          <div className="space-y-3">
            {[
              { label: 'Not Started', count: 8, color: 'bg-gray-100' },
              { label: 'In Progress', count: 15, color: 'bg-info-bg' },
              { label: 'Submitted', count: 12, color: 'bg-warning-bg' },
              { label: 'Under Review', count: 7, color: 'bg-maroon-subtle' },
              { label: 'Approved', count: 4, color: 'bg-success-bg' },
              { label: 'Rejected', count: 2, color: 'bg-error-bg' },
            ].map((stage) => (
              <div key={stage.label} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${stage.color} border border-border`} />
                <span className="flex-1 text-sm text-slate">{stage.label}</span>
                <span className="text-sm font-semibold text-navy">{stage.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
