import React from 'react';
import { formatDate } from '../../lib/utils';

interface ExclusionCheckStatus {
  current_month: {
    month: string;
    oig: {
      completed: boolean;
      result: string | null;
      date: string | null;
    };
    sam: {
      completed: boolean;
      result: string | null;
      date: string | null;
    };
  };
}

interface ExclusionCheckBadgesProps {
  status: ExclusionCheckStatus | null;
  loading?: boolean;
  onRunCheck?: (type: 'oig' | 'sam') => void;
}

export function ExclusionCheckBadges({ status, loading, onRunCheck }: ExclusionCheckBadgesProps) {
  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex gap-2">
        <span className="text-xs text-gray bg-gray-100 px-2 py-1 rounded">No data</span>
      </div>
    );
  }

  const { oig, sam } = status.current_month;

  const getStatusStyle = (check: { completed: boolean; result: string | null }) => {
    if (!check.completed) {
      return 'bg-warning/10 text-warning border-warning/30';
    }
    if (check.result === 'clear') {
      return 'bg-success/10 text-success border-success/30';
    }
    if (check.result === 'match_found') {
      return 'bg-error/10 text-error border-error/30';
    }
    return 'bg-gray-100 text-gray border-gray-200';
  };

  const getStatusIcon = (check: { completed: boolean; result: string | null }) => {
    if (!check.completed) {
      return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (check.result === 'clear') {
      return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (check.result === 'match_found') {
      return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return null;
  };

  const getStatusLabel = (check: { completed: boolean; result: string | null }) => {
    if (!check.completed) return 'Due';
    if (check.result === 'clear') return 'Clear';
    if (check.result === 'match_found') return 'Match!';
    return check.result || 'Unknown';
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => !oig.completed && onRunCheck?.('oig')}
        disabled={oig.completed}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors ${
          getStatusStyle(oig)
        } ${!oig.completed && onRunCheck ? 'cursor-pointer hover:opacity-80' : ''}`}
        title={oig.completed && oig.date ? `Checked ${formatDate(oig.date)}` : 'OIG check due this month'}
      >
        {getStatusIcon(oig)}
        <span>OIG: {getStatusLabel(oig)}</span>
      </button>
      
      <button
        onClick={() => !sam.completed && onRunCheck?.('sam')}
        disabled={sam.completed}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors ${
          getStatusStyle(sam)
        } ${!sam.completed && onRunCheck ? 'cursor-pointer hover:opacity-80' : ''}`}
        title={sam.completed && sam.date ? `Checked ${formatDate(sam.date)}` : 'SAM check due this month'}
      >
        {getStatusIcon(sam)}
        <span>SAM: {getStatusLabel(sam)}</span>
      </button>
    </div>
  );
}
