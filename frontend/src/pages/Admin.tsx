import { useEffect, useState } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../api/users';
import { getProjects } from '../api/projects';
import { User, Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  FolderIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
    )}>
      {role === 'admin' ? <ShieldCheckIcon className="w-3 h-3" /> : <UserCircleIcon className="w-3 h-3" />}
      {role}
    </span>
  );
}

interface UserFormData {
  username: string;
  password: string;
  role: 'admin' | 'user';
  project_ids: number[];
}

interface UserModalProps {
  editUser: User | null;
  projects: Project[];
  onClose: () => void;
  onSave: (data: UserFormData) => Promise<void>;
  saving: boolean;
}

function UserModal({ editUser, projects, onClose, onSave, saving }: UserModalProps) {
  const [username, setUsername] = useState(editUser?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>(editUser?.role || 'user');
  const [selectedProjects, setSelectedProjects] = useState<number[]>(editUser?.project_ids || []);
  const [error, setError] = useState('');

  const toggleProject = (pid: number) => {
    setSelectedProjects((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser && !username.trim()) { setError('Username is required'); return; }
    if (!editUser && !password) { setError('Password is required for new users'); return; }
    setError('');
    try {
      await onSave({ username: username.trim(), password, role, project_ids: selectedProjects });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {editUser ? `Edit User: ${editUser.username}` : 'New User'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          {!editUser && (
            <div>
              <label className="form-label">Username *</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john.doe"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="form-label flex items-center gap-1">
              <KeyIcon className="w-3.5 h-3.5" />
              {editUser ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editUser ? 'Enter new password to change...' : 'Enter password...'}
            />
          </div>

          <div>
            <label className="form-label">Role *</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
            >
              <option value="user">User — Can upload, compare, and view trends</option>
              <option value="admin">Admin — Full access including project management</option>
            </select>
          </div>

          {role === 'user' && (
            <div>
              <label className="form-label flex items-center gap-1">
                <FolderIcon className="w-3.5 h-3.5" />
                Allocated Projects
              </label>
              {projects.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No projects available</p>
              ) : (
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {projects.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedProjects.includes(p.id)}
                        onChange={() => toggleProject(p.id)}
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.customer_name}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {selectedProjects.length === 0
                  ? 'No projects selected — user will see no data'
                  : `${selectedProjects.length} project${selectedProjects.length !== 1 ? 's' : ''} selected`}
              </p>
            </div>
          )}

          {role === 'admin' && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 text-sm text-indigo-700">
              Admins have access to all projects and sub-projects automatically.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Admin() {
  const { username: currentUsername } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, p] = await Promise.all([getUsers(), getProjects()]);
      setUsers(u);
      setProjects(p);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (data: UserFormData) => {
    setSaving(true);
    try {
      await createUser(data);
      setShowModal(false);
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: UserFormData) => {
    if (!editUser) return;
    setSaving(true);
    try {
      const payload: { password?: string; role?: 'admin' | 'user'; project_ids?: number[] } = {
        role: data.role,
        project_ids: data.project_ids,
      };
      if (data.password) payload.password = data.password;
      await updateUser(editUser.id, payload);
      setEditUser(null);
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (user.username === currentUsername) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await deleteUser(user.id);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete user');
    }
  };

  const getProjectNames = (user: User) => {
    if (user.role === 'admin') return 'All projects';
    if (user.project_ids.length === 0) return 'None';
    return user.project_ids
      .map((id) => projects.find((p) => p.id === id)?.name ?? `#${id}`)
      .join(', ');
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Create and manage users, assign project access</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" />
          New User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-slate-500 py-12 text-center">Loading users...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Username</th>
                <th className="table-header">Role</th>
                <th className="table-header">Project Access</th>
                <th className="table-header">Created</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className={clsx('hover:bg-slate-50', user.username === currentUsername && 'bg-indigo-50/50')}>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <UserCircleIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-800">{user.username}</span>
                      {user.username === currentUsername && (
                        <span className="text-xs text-indigo-500 font-medium">(you)</span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell"><RoleBadge role={user.role} /></td>
                  <td className="table-cell">
                    <span className="text-slate-500 text-xs max-w-xs truncate block" title={getProjectNames(user)}>
                      {getProjectNames(user)}
                    </span>
                  </td>
                  <td className="table-cell text-slate-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditUser(user)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit user"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={user.username === currentUsername}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete user"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <UserCircleIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>No users found</p>
            </div>
          )}
        </div>
      )}

      {/* Role legend */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheckIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Admin</div>
              <p className="text-slate-500 text-xs mt-0.5">
                Full access — create/edit/delete projects and sub-projects, manage users, upload test results, compare tests, view trends.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <UserCircleIcon className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-800">User</div>
              <p className="text-slate-500 text-xs mt-0.5">
                Restricted access — can only upload test results, compare, and view trends for their allocated projects and sub-projects.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <UserModal
          editUser={null}
          projects={projects}
          onClose={() => setShowModal(false)}
          onSave={handleCreate}
          saving={saving}
        />
      )}

      {editUser && (
        <UserModal
          editUser={editUser}
          projects={projects}
          onClose={() => setEditUser(null)}
          onSave={handleEdit}
          saving={saving}
        />
      )}

      {/* Dummy usage to avoid unused import warning */}
      {false && <CheckIcon />}
    </div>
  );
}
