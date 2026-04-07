import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  agency_id: string | null;
  location_id: string | null;
  location_name: string | null;
  created_at: string;
  updated_at: string;
}

interface UsersResponse {
  users: User[];
  total: number;
}

interface AgencyWithLocations {
  id: string;
  name: string;
  locations: Location[];
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  location_id: string | null;
  location_name?: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const roleBadgeVariant: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  superadmin: 'success',
  admin: 'info',
  manager: 'warning',
  employee: 'neutral',
  applicant: 'neutral',
};

const roleLabels: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  applicant: 'Applicant',
};

export function UsersPage() {
  const { profile } = useAuth();
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'manager',
    location_id: '',
  });

  // Edit user modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    location_id: '',
  });
  const [saving, setSaving] = useState(false);

  // Invitation link display
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get<UsersResponse>('/users/staff');
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      const res = await api.get<{ invitations: Invitation[] }>('/invitations');
      setInvitations(res.invitations || []);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    }
  };

  const loadLocations = async () => {
    try {
      const res = await api.get<AgencyWithLocations>('/agencies/me');
      setLocations(res.locations || []);
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  useEffect(() => {
    loadUsers();
    loadInvitations();
    loadLocations();
  }, []);

  const handleInviteUser = async () => {
    try {
      setInviting(true);
      setError(null);
      
      if (!inviteForm.email) {
        setError('Please enter an email address');
        return;
      }
      
      if (!inviteForm.location_id) {
        setError('Please select a location');
        return;
      }
      
      const res = await api.post<{ invitation: Invitation; invite_url: string }>('/invitations', {
        email: inviteForm.email,
        role: inviteForm.role,
        location_id: inviteForm.location_id || null,
      });
      
      setInviteLink(res.invite_url);
      setSuccess(`Invitation sent to ${inviteForm.email}`);
      
      // Reset form
      setInviteForm({
        email: '',
        role: 'manager',
        location_id: '',
      });
      setShowInviteModal(false);
      loadInvitations();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    try {
      setError(null);
      const res = await api.post<{ invite_url: string }>(`/invitations/${invitation.id}/resend`);
      setInviteLink(res.invite_url);
      setSuccess(`Invitation resent to ${invitation.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return;
    
    try {
      setError(null);
      await api.delete(`/invitations/${invitationId}`);
      setSuccess('Invitation cancelled');
      loadInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      location_id: user.location_id || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    try {
      setSaving(true);
      setError(null);
      
      await api.patch(`/users/${editingUser.id}`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        location_id: editForm.location_id || null,
      });
      
      setSuccess('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleSendPasswordReset = async (user: User) => {
    if (!confirm(`Send a password reset email to ${user.email}?`)) return;
    
    try {
      setError(null);
      await api.post(`/users/${user.id}/send-password-reset`);
      setSuccess(`Password reset email sent to ${user.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
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

  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Team Management</h1>
          <p className="mt-1 text-sm text-gray">
            Invite and manage staff accounts for your agency
          </p>
        </div>
        <Button onClick={() => {
          setInviteForm({
            email: '',
            role: 'manager',
            location_id: '',
          });
          setShowInviteModal(true);
        }}>
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

      {/* Invitation Link Display */}
      {inviteLink && (
        <Card className="border-2 border-info bg-info-bg">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="font-semibold text-info">Invitation Link</p>
              </div>
              <p className="text-sm text-slate">
                Share this link with the team member. They'll create their own password when they sign up.
              </p>
              <div className="bg-white rounded-lg p-3 border border-border">
                <p className="text-sm font-mono text-slate break-all">{inviteLink}</p>
              </div>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => copyToClipboard(inviteLink)}
              >
                Copy Link
              </Button>
            </div>
            <button 
              onClick={() => setInviteLink(null)}
              className="text-gray hover:text-slate text-xl leading-none p-1 ml-4"
            >
              ×
            </button>
          </div>
        </Card>
      )}

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card
          header={
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-navy">Pending Invitations</h3>
              <Badge variant="warning">{pendingInvitations.length}</Badge>
            </div>
          }
          padding="none"
        >
          <div className="divide-y divide-border">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate">{inv.email}</p>
                  <p className="text-xs text-gray">
                    {roleLabels[inv.role]} • Sent {formatDate(inv.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResendInvitation(inv)}
                  >
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvitation(inv.id)}
                    className="text-error hover:text-error"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Users Table */}
      <Card padding="none">
        {loading ? (
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Location</th>
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
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray">
                        {user.location_name || <span className="text-warning">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSendPasswordReset(user)}
                              title="Send password reset email"
                            >
                              Reset PW
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                                className="text-error hover:text-error"
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
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray">
                      No staff users found. Click "Invite Team Member" to send an invitation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Invite User Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser} loading={inviting}>
              Send Invitation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray">
            Send an invitation email. The recipient will create their own password when they sign up.
          </p>
          
          <Input
            label="Email Address"
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            placeholder="manager@example.com"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Role</label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="manager">Manager - Manages a location</option>
              {isSuperadmin && <option value="admin">Admin - Full agency access</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate mb-1">Assign to Location</label>
            <select
              value={inviteForm.location_id}
              onChange={(e) => setInviteForm({ ...inviteForm, location_id: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              required
            >
              <option value="">Select a location...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.city}, {loc.state})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingUser(null); }}
        title={`Edit ${editingUser?.first_name} ${editingUser?.last_name}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => { setShowEditModal(false); setEditingUser(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} loading={saving}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={editForm.first_name}
              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
            />
            <Input
              label="Last Name"
              value={editForm.last_name}
              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Assigned Location</label>
            <select
              value={editForm.location_id}
              onChange={(e) => setEditForm({ ...editForm, location_id: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="">No location assigned</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.city}, {loc.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate mb-1">Role</label>
            <select
              value={editingUser?.role || ''}
              onChange={(e) => editingUser && handleRoleChange(editingUser.id, e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              disabled={editingUser?.role === 'superadmin'}
            >
              <option value="manager">Manager</option>
              {isSuperadmin && <option value="admin">Admin</option>}
              <option value="applicant">Applicant (demote)</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
