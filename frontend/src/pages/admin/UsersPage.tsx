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

const roleBadgeVariant: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  superadmin: 'success',
  admin: 'info',
  manager: 'warning',
  applicant: 'neutral',
};

export function UsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'manager',
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<UsersResponse>('/users/staff');
      setUsers(res.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      setCreating(true);
      setError(null);
      
      await api.post('/users', newUser);
      
      setSuccess('User created successfully');
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'manager' });
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
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

  const isSuperadmin = profile?.role === 'superadmin';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-maroon" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-3 text-sm text-gray">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">User Management</h1>
          <p className="mt-1 text-sm text-gray">
            Manage admin and manager accounts
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + Add User
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

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray">Created</th>
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
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New User"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} loading={creating}>
              Create User
            </Button>
          </>
        }
      >
        <div className="space-y-4">
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
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
            helperText="At least 8 characters"
          />
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="manager">Manager</option>
              {isSuperadmin && <option value="admin">Admin</option>}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
