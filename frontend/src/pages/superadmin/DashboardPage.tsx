import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Alert } from '../../components/ui/Alert';

interface SystemStats {
  total_users: number;
  total_applications: number;
  total_employees: number;
  total_clients: number;
  total_agencies: number;
  total_locations: number;
  deleted_applications: number;
  storage_used_mb?: number;
}

interface DeletedApplication {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  deleted_at: string;
  deleted_by?: string;
  location_name?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  actor_name: string;
  target_name?: string;
  timestamp: string;
  details?: string;
}

export function SuperadminDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [deletedApps, setDeletedApps] = useState<DeletedApplication[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trash' | 'danger'>('overview');
  
  // Danger zone confirmations
  const [confirmPurge, setConfirmPurge] = useState('');
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load system stats
      const statsRes = await api.get<SystemStats>('/superadmin/stats');
      setStats(statsRes);
      
      // Load deleted applications
      try {
        const trashRes = await api.get<{ applications: DeletedApplication[] }>('/superadmin/trash');
        setDeletedApps(trashRes.applications || []);
      } catch {
        // Endpoint might not exist yet
        setDeletedApps([]);
      }
      
      // Load activity log
      try {
        const logRes = await api.get<{ logs: ActivityLog[] }>('/superadmin/activity');
        setActivityLog(logRes.logs || []);
      } catch {
        setActivityLog([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (appId: string) => {
    try {
      await api.post(`/superadmin/trash/${appId}/restore`);
      setDeletedApps(prev => prev.filter(a => a.id !== appId));
      if (stats) setStats({ ...stats, deleted_applications: stats.deleted_applications - 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore application');
    }
  };

  const handlePermanentDelete = async (appId: string) => {
    if (!window.confirm('PERMANENT DELETE: This cannot be undone. Are you absolutely sure?')) return;
    try {
      await api.delete(`/superadmin/trash/${appId}`);
      setDeletedApps(prev => prev.filter(a => a.id !== appId));
      if (stats) setStats({ ...stats, deleted_applications: stats.deleted_applications - 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete application');
    }
  };

  const handlePurgeAll = async () => {
    if (confirmPurge !== 'PURGE ALL') return;
    setPurging(true);
    try {
      await api.post('/superadmin/trash/purge');
      setDeletedApps([]);
      if (stats) setStats({ ...stats, deleted_applications: 0 });
      setConfirmPurge('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to purge trash');
    } finally {
      setPurging(false);
    }
  };

  const StatCard = ({ label, value, icon, color = 'cyan' }: { label: string; value: number | string; icon: string; color?: string }) => (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-mono font-bold mt-1 text-${color}-400`}>{value}</p>
        </div>
        <div className={`text-3xl opacity-30 text-${color}-400`}>{icon}</div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-500 font-mono text-sm">INITIALIZING SYSTEM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
                <span className="font-mono text-cyan-400 text-sm">SYSTEM ONLINE</span>
              </div>
              <h1 className="text-xl font-bold text-white">SUPERADMIN CONTROL</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-sm text-gray-400 hover:text-white transition-colors">
                ← Back to Admin
              </Link>
              <span className="text-xs text-gray-600 font-mono">
                {new Date().toISOString().split('T')[0]}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <Alert variant="error" className="mb-6 bg-red-900/20 border-red-800 text-red-300" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-gray-900/50 p-1 rounded-lg w-fit">
          {[
            { id: 'overview', label: 'SYSTEM OVERVIEW', icon: '◉' },
            { id: 'trash', label: 'TRASH BIN', icon: '🗑', count: stats?.deleted_applications },
            { id: 'danger', label: 'DANGER ZONE', icon: '⚠' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm font-mono rounded transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Users" value={stats.total_users} icon="👤" color="cyan" />
              <StatCard label="Applications" value={stats.total_applications} icon="📋" color="green" />
              <StatCard label="Employees" value={stats.total_employees} icon="👥" color="blue" />
              <StatCard label="Clients" value={stats.total_clients} icon="❤" color="pink" />
              <StatCard label="Agencies" value={stats.total_agencies} icon="🏢" color="purple" />
              <StatCard label="Locations" value={stats.total_locations} icon="📍" color="yellow" />
            </div>

            {/* System Status Panel */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm font-mono text-gray-400">SYSTEM STATUS</span>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-green-400">✓</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">API</p>
                    <p className="text-sm text-green-400 font-mono">HEALTHY</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-green-400">✓</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Database</p>
                    <p className="text-sm text-green-400 font-mono">CONNECTED</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-green-400">✓</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Storage</p>
                    <p className="text-sm text-green-400 font-mono">ONLINE</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-green-400">✓</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Auth</p>
                    <p className="text-sm text-green-400 font-mono">SECURE</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <span className="text-sm font-mono text-gray-400">ACTIVITY LOG</span>
              </div>
              <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
                {activityLog.length === 0 ? (
                  <div className="p-4 text-center text-gray-600 font-mono text-sm">
                    NO RECENT ACTIVITY
                  </div>
                ) : (
                  activityLog.map(log => (
                    <div key={log.id} className="px-4 py-3 hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-cyan-400">›</span>
                          <span className="text-sm text-gray-300">{log.action}</span>
                          {log.target_name && (
                            <span className="text-sm text-gray-500">→ {log.target_name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500">{log.actor_name}</span>
                          <span className="text-xs text-gray-600 font-mono">{log.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link 
                to="/admin/users" 
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-cyan-500/50 transition-colors group"
              >
                <p className="text-cyan-400 group-hover:text-cyan-300">Manage Users</p>
                <p className="text-xs text-gray-500 mt-1">Add/remove staff</p>
              </Link>
              <Link 
                to="/admin/settings" 
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-cyan-500/50 transition-colors group"
              >
                <p className="text-cyan-400 group-hover:text-cyan-300">Agency Settings</p>
                <p className="text-xs text-gray-500 mt-1">Branding & config</p>
              </Link>
              <button 
                onClick={() => setActiveTab('trash')}
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-yellow-500/50 transition-colors text-left group"
              >
                <p className="text-yellow-400 group-hover:text-yellow-300">Trash Bin</p>
                <p className="text-xs text-gray-500 mt-1">{stats.deleted_applications} items</p>
              </button>
              <button 
                onClick={() => setActiveTab('danger')}
                className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:border-red-500/50 transition-colors text-left group"
              >
                <p className="text-red-400 group-hover:text-red-300">Danger Zone</p>
                <p className="text-xs text-gray-500 mt-1">Destructive actions</p>
              </button>
            </div>
          </div>
        )}

        {/* Trash Tab */}
        {activeTab === 'trash' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Deleted Applications</h2>
                <p className="text-sm text-gray-500">Soft-deleted applications that can be restored or permanently removed</p>
              </div>
              {deletedApps.length > 0 && (
                <button
                  onClick={() => setActiveTab('danger')}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
                >
                  Purge All →
                </button>
              )}
            </div>

            {deletedApps.length === 0 ? (
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-12 text-center">
                <div className="text-4xl mb-4">🗑</div>
                <p className="text-gray-400">Trash is empty</p>
                <p className="text-sm text-gray-600 mt-1">Deleted applications will appear here</p>
              </div>
            ) : (
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-700 bg-gray-800/50">
                    <tr>
                      <th className="text-left text-xs font-mono text-gray-500 uppercase px-4 py-3">Applicant</th>
                      <th className="text-left text-xs font-mono text-gray-500 uppercase px-4 py-3">Location</th>
                      <th className="text-left text-xs font-mono text-gray-500 uppercase px-4 py-3">Deleted</th>
                      <th className="text-right text-xs font-mono text-gray-500 uppercase px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {deletedApps.map(app => (
                      <tr key={app.id} className="hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{app.first_name} {app.last_name}</p>
                          <p className="text-xs text-gray-500">{app.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{app.location_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-mono">{app.deleted_at}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleRestore(app.id)}
                              className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded hover:bg-green-500/20 transition-colors"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(app.id)}
                              className="px-3 py-1 bg-red-500/10 text-red-400 text-xs rounded hover:bg-red-500/20 transition-colors"
                            >
                              Delete Forever
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="space-y-6">
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⚠️</div>
                <div>
                  <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Actions here are destructive and may be irreversible. Proceed with extreme caution.
                  </p>
                </div>
              </div>
            </div>

            {/* Purge Trash */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                <span className="text-red-400">●</span>
                <span className="text-sm font-mono text-gray-400">PURGE ALL DELETED APPLICATIONS</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-400 mb-4">
                  Permanently delete all {stats?.deleted_applications || 0} applications in the trash. 
                  This removes all associated data including documents, agreements, and sensitive information.
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={confirmPurge}
                    onChange={(e) => setConfirmPurge(e.target.value)}
                    placeholder="Type PURGE ALL to confirm"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-white placeholder:text-gray-600 focus:border-red-500 focus:outline-none"
                  />
                  <button
                    onClick={handlePurgeAll}
                    disabled={confirmPurge !== 'PURGE ALL' || purging || (stats?.deleted_applications || 0) === 0}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-sm font-mono hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {purging ? 'PURGING...' : 'EXECUTE'}
                  </button>
                </div>
              </div>
            </div>

            {/* Database Cleanup */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden opacity-60">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                <span className="text-yellow-400">●</span>
                <span className="text-sm font-mono text-gray-400">DATABASE CLEANUP</span>
                <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded ml-auto">COMING SOON</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500">
                  Remove orphaned records, clean up expired sessions, and optimize database tables.
                </p>
              </div>
            </div>

            {/* Export All Data */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden opacity-60">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
                <span className="text-blue-400">●</span>
                <span className="text-sm font-mono text-gray-400">EXPORT SYSTEM DATA</span>
                <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded ml-auto">COMING SOON</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500">
                  Export all system data for backup or migration purposes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-gray-600 font-mono">MEDISVAULT SUPERADMIN v1.0</span>
          <span className="text-xs text-gray-600 font-mono">SESSION ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
