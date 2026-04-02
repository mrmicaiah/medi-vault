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
import { useAgency } from '../../contexts/AgencyContext';

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
  const { agency } = useAgency();
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
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

  // Reset password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Credentials display
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);

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
    loadLocations();
  }, []);

  const generateTempPassword = () => {
    // Generate a readable temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateUser = async () => {
    try {
      setCreating(true);
      setError(null);
      
      // Validate
      if (!newUser.email || !newUser.password || !newUser.first_name || !newUser.last_name) {
        setError('Please fill in all required fields');
        return;
      }
      
      if (newUser.role === 'manager' && !newUser.location_id) {
        setError('Please select a location for the manager');
        return;
      }
      
      await api.post('/users', {
        email: newUser.email,
        password: newUser.password,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        role: newUser.role,
        location_id: newUser.location_id || null,
      });
      
      // Store credentials to display
      setCreatedCredentials({
        email: newUser.email,
        password: newUser.password,
        name: `${newUser.first_name} ${newUser.last_name}`,
      });
      
      // Reset form
      setNewUser({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'manager',
        location_id: '',
      });
      setShowCreateModal(false);
      loadUsers();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
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

  const handleOpenResetPassword = (user: User) => {
    setResetUser(user);
    setNewPassword(generateTempPassword());
    setShowResetModal(true);
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    
    try {
      setResetting(true);
      setError(null);
      
      await api.post(`/users/${resetUser.id}/reset-password`, {
        new_password: newPassword,
      });
      
      // Show the new credentials
      setCreatedCredentials({
        email: resetUser.email,
        password: newPassword,
        name: `${resetUser.first_name} ${resetUser.last_name}`,
      });
      
      setShowResetModal(false);
      setResetUser(null);
      setNewPassword('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResetting(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Team Management</h1>
          <p className="mt-1 text-sm text-gray">
            Create and manage staff accounts for your agency
          </p>
        </div>
        <Button onClick={() => {
          setNewUser({
            email: '',
            password: generateTempPassword(),
            first_name: '',
            last_name: '',
            role: 'manager',
            location_id: locations.length > 0 ? locations[0].id : '',
          });
          setShowCreateModal(true);
        }}>
          + Add Team Member
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

      {/* Credentials Display */}
      {createdCredentials && (
        <Card className="border-2 border-success bg-success-bg">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold text-success">Account Created for {createdCredentials.name}</p>
              </div>
              <p className="text-sm text-slate">
                Share these login credentials with the user. They can change their password after logging in.
              </p>
              <div className="bg-white rounded-lg p-4 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray uppercase font-medium">Email</p>
                    <p className="text-sm font-mono text-slate">{createdCredentials.email}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdCredentials.email)}>
                    Copy
                  </Button>
                </div>
                <div className="border-t border-border my-2" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray uppercase font-medium">Temporary Password</p>
                    <p className="text-sm font-mono text-slate">{createdCredentials.password}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(createdCredentials.password)}>
                    Copy
                  </Button>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => copyToClipboard(`Login: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`)}
              >
                Copy Both to Clipboard
              </Button>
            </div>
            <button 
              onClick={() => setCreatedCredentials(null)}
              className="text-gray hover:text-slate text-xl leading-none p-1"
            >
              ×
            </button>
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
                        {user.location_name || (user.role === 'manager' ? <span className="text-warning">Unassigned</span> : '—')}
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
                              onClick={() => handleOpenResetPassword(user)}
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
                      No staff users found. Click "Add Team Member" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Team Member"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} loading={creating}>
              Create Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray">
            Create an account and share the credentials with the team member directly.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={newUser.first_name}
              onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={newUser.last_name}
              onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
              required
            />
          </div>
          
          <Input
            label="Email Address"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="manager@example.com"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Temporary Password</label>
            <div className="flex gap-2">
              <Input
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="flex-1 font-mono"
                required
              />
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => setNewUser({ ...newUser, password: generateTempPassword() })}
              >
                Generate
              </Button>
            </div>
            <p className="text-xs text-gray mt-1">The user can change this after logging in.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="manager">Manager - Manages a location</option>
              {isSuperadmin && <option value="admin">Admin - Full agency access</option>}
            </select>
          </div>

          {newUser.role === 'manager' && (
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Assign to Location</label>
              <select
                value={newUser.location_id}
                onChange={(e) => setNewUser({ ...newUser, location_id: e.target.value })}
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
          )}

          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> After creating, you'll see the credentials to share with the user.
              They can log in at your agency's portal and change their password.
            </p>
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
          
          {editingUser?.role === 'manager' && (
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
          )}

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

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => { setShowResetModal(false); setResetUser(null); setNewPassword(''); }}
        title={`Reset Password for ${resetUser?.first_name}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => { setShowResetModal(false); setResetUser(null); }}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} loading={resetting}>
              Reset Password
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray">
            Set a new temporary password for <strong>{resetUser?.first_name} {resetUser?.last_name}</strong>.
            You'll need to share this with them directly.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-slate mb-1">New Temporary Password</label>
            <div className="flex gap-2">
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 font-mono"
              />
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => setNewPassword(generateTempPassword())}
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="bg-warning-bg rounded-lg p-3 border border-warning/20">
            <p className="text-xs text-warning">
              <strong>Important:</strong> After resetting, you'll see the new password to share.
              The user will need to change it after logging in.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
