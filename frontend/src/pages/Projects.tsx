import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject } from '../api/projects';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  PlusIcon,
  FolderIcon,
  TrashIcon,
  UsersIcon,
  BeakerIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

interface ModalProps {
  onClose: () => void;
  onSave: (data: { name: string; customer_name: string; description: string }) => Promise<void>;
  loading: boolean;
}

function CreateProjectModal({ onClose, onSave, loading }: ModalProps) {
  const [name, setName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !customerName.trim()) {
      setError('Project name and customer name are required');
      return;
    }
    try {
      await onSave({ name: name.trim(), customer_name: customerName.trim(), description: description.trim() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">New Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="form-label">Project Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. E-Commerce Platform"
              autoFocus
            />
          </div>
          <div>
            <label className="form-label">Customer Name *</label>
            <input
              type="text"
              className="form-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProjects = () => {
    setLoading(true);
    getProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async (data: { name: string; customer_name: string; description: string }) => {
    setSaving(true);
    try {
      await createProject(data);
      setShowModal(false);
      loadProjects();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete project "${name}" and all its data? This cannot be undone.`)) return;
    try {
      await deleteProject(id);
      loadProjects();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete project');
    }
  };

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM dd, yyyy'); } catch { return d; }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Manage your performance test projects by customer</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            New Project
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-slate-500 py-12 text-center">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No projects yet</h3>
          <p className="text-slate-500 text-sm mb-6">
            {isAdmin ? 'Create your first project to start tracking performance tests' : 'No projects have been assigned to your account yet.'}
          </p>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
              <PlusIcon className="w-4 h-4" />
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p) => (
            <div key={p.id} className="card p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FolderIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 leading-tight">{p.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <UsersIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">{p.customer_name}</span>
                    </div>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                    title="Delete project"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {p.description && (
                <p className="text-sm text-slate-500 line-clamp-2">{p.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <FolderIcon className="w-3.5 h-3.5" />
                  <span>{p.subproject_count ?? 0} subprojects</span>
                </div>
                <div className="flex items-center gap-1">
                  <BeakerIcon className="w-3.5 h-3.5" />
                  <span>{p.test_run_count ?? 0} test runs</span>
                </div>
              </div>

              <div className="text-xs text-slate-400">
                Created {formatDate(p.created_at)}
              </div>

              <Link
                to={`/projects/${p.id}`}
                className="btn-secondary justify-center text-indigo-600 border-indigo-200 hover:bg-indigo-50 mt-auto"
              >
                View Project
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {showModal && isAdmin && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onSave={handleCreate}
          loading={saving}
        />
      )}
    </div>
  );
}
