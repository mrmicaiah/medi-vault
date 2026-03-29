import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface UsersResponse {
  users: User[];
  total: number;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  agency_name: string;
  location_name: string | null;
  expires_at: string;
  used: boolean;
  created_at: string;
  invite_url?: string;
}

interface InvitationsResponse {
  invitations: Invitation[];
  total: number;
}

const roleBadgeVariant: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  superadmin: 'success',
  admin: 'info',
  manager: 'warning',
  applicant: 'neutral',
};

type Tab = 'users' | 'invitations';

export function UsersPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: '',
    role: 'manager',
  });
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get<UsersResponse>('/users/staff');
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true);
      const res = await api.get<InvitationsResponse>('/invitations');
      setInvitations(res.invitations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadInvitations();
  }, []);

  const handleSendInvite = async () => {
    try {
      setInviting(true);
      setError(null);
      
      const res = await api.post<Invitation>('/invitations', newInvite);
      
      setLastInviteUrl(res.invite_url || null);
      setSuccess(`Invitation sent to ${newInvite.email}`);
      setNewInvite({ email: '', role: 'manager' });
      loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    
    try {
      await api.delete(`/invitations/${id}`);
      setSuccess('Invitation revoked');
      loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      const res = await api.post<{ message: string; data: { invite_url: string } }>(`/invitations/${id}/resend`);
      setLastInviteUrl(res.data?.invite_url || null);
      setSuccess('Invitation resent');
      loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setError(null);
      await api.patch(`/users/${userId}/role`, { role: newRole });
      setSuccess('User role updated');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`)) {
      return;
    }
    
    try {
      setError(null);
      await api.delete(`/users/${userId}`);
      setSuccess('User deleted successfully');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
  };

  const isSuperadmin = profile?.role === 'superadmin';
  const isExpired = (date: string) => new Date(date) < new Date();
  const pendingInvitations = invitations.filter(i => !i.used && !isExpired(i.expires_at));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Team Management</h1>
          <p className="mt-1 text-sm text-gray">
            Manage staff accounts and send invitations
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          + Invite Team Member
        </Button>
      </div>

      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {lastInviteUrl && (
        <Alert variant="info" dismissible onDismiss={() => setLastInviteUrl(null)}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Invitation link created!</p>
              <p className="text-sm opacity-80 truncate max-w-md">{lastInviteUrl}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => copyToClipboard(lastInviteUrl)}>
              Copy Link
            </Button>
          </div>
        </Alert>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-maroon text-maroon'
                : 'border-transparent text-gray hover:text-slate'
            }`}
          >
            Active Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'invitations'
                ? 'border-maroon text-maroon'
                : 'border-transparent text-gray hover:text-slate'
            }`}
          >
            Pending Invitations ({pendingInvitations.length})
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <Card padding="none">
          {loadingUsers ? (
            <div className="flex h-32 items-center justify-center">
              <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Joined</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isCurrentUser = user.id === profile?.id;
                    const canEdit = !isCurrentUser && user.role !== 'superadmin';
                    const canDelete = canEdit && (isSuperadmin || user.role !== 'admin');
                    
                    return (
                      <tr key={user.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate">
                              {user.first_name} {user.last_name}
                              {isCurrentUser && <span className="text-gray ml-2">(you)</span>}
                            </p>
                            <p className="text-xs text-gray">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={roleBadgeVariant[user.role] || 'neutral'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canEdit && (
                            <div className="flex items-center justify-end gap-2">
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                className="rounded border border-border px-2 py-1 text-xs"
                              >
                                <option value="manager">Manager</option>
                                {isSuperadmin && <option value="admin">Admin</option>}
                                <option value="applicant">Applicant</option>
                              </select>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray">
                        No staff users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <Card padding="none">
          {loadingInvitations ? (
            <div className="flex h-32 items-center justify-center">
              <svg className="h-6 w-6 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Expires</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => {
                    const expired = isExpired(inv.expires_at);
                    const status = inv.used ? 'accepted' : expired ? 'expired' : 'pending';
                    
                    return (
                      <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate">{inv.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={roleBadgeVariant[inv.role] || 'neutral'}>
                            {inv.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={
                            status === 'accepted' ? 'success' :
                            status === 'expired' ? 'error' : 'warning'
                          }>
                            {status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray">
                          {formatDate(inv.expires_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendInvite(inv.id)}
                              >
                                Resend
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeInvite(inv.id)}
                              >
                                Revoke
                              </Button>
                            </div>
                          )}
                          {status === 'expired' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeInvite(inv.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {invitations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray">
                        No invitations sent yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvite} loading={inviting} disabled={!newInvite.email}>
              Send Invitation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray">
            Send an email invitation to join your team. They'll receive a link to create their account.
          </p>
          
          <Input
            label="Email Address"
            type="email"
            value={newInvite.email}
            onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
            placeholder="colleague@example.com"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Role</label>
            <select
              value={newInvite.role}
              onChange={(e) => setNewInvite({ ...newInvite, role: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="manager">Manager - Can view pipeline and applicant details</option>
              {isSuperadmin && <option value="admin">Admin - Full access including approvals</option>}
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray">
              <strong>Note:</strong> The invitation link will expire in 7 days. 
              You can resend or revoke invitations from this page.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
