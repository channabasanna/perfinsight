import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, getSubProjects, createSubProject, deleteSubProject } from '../api/projects';
import { Project, SubProject } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  PlusIcon,
  FolderOpenIcon,
  ArrowLeftIcon,
  TrashIcon,
  BeakerIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

interface SubProjectModalProps {
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => Promise<void>;
  loading: boolean;
}

function CreateSubProjectModal({ onClose, onSave, loading }: SubProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    try {
      await onSave({ name: name.trim(), description: description.trim() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create sub-project');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">New Sub-Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="form-label">Sub-Project Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Load Test - Checkout Flow"
              autoFocus
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
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Creating...' : 'Create Sub-Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { isAdmin } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [subprojects, setSubprojects] = useState<SubProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [proj, sps] = await Promise.all([
        getProject(Number(id)),
        getSubProjects(Number(id)),
      ]);
      setProject(proj);
      setSubprojects(sps);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleCreate = async (data: { name: string; description: string }) => {
    setSaving(true);
    try {
      await createSubProject(Number(id), data);
      setShowModal(false);
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (spId: number, name: string) => {
    if (!confirm(`Delete sub-project "${name}" and all its data?`)) return;
    try {
      await deleteSubProject(Number(id), spId);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM dd, yyyy'); } catch { return d || '—'; }
  };

  if (loading) return <div className="p-8 text-slate-500">Loading project...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!project) return <div className="p-8 text-slate-500">Project not found</div>;

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/projects" className="hover:text-indigo-600 flex items-center gap-1">
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Projects
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{project.name}</span>
      </div>

      {/* Project Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FolderOpenIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <p className="text-slate-500 mt-0.5">{project.customer_name}</p>
              {project.description && (
                <p className="text-sm text-slate-500 mt-2">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-4 text-sm text-slate-500">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{project.subproject_count ?? 0}</div>
              <div className="text-xs">Sub-Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{project.test_run_count ?? 0}</div>
              <div className="text-xs">Test Runs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Sub-Projects</h2>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <PlusIcon className="w-4 h-4" />
              Add Sub-Project
            </button>
          )}
        </div>

        {subprojects.length === 0 ? (
          <div className="card p-10 text-center">
            <FolderOpenIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-medium text-slate-700 mb-2">No sub-projects yet</h3>
            <p className="text-sm text-slate-500 mb-4">
              {isAdmin ? 'Add a sub-project to organize test runs' : 'No sub-projects have been created for this project.'}
            </p>
            {isAdmin && (
              <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
                <PlusIcon className="w-4 h-4" />
                Add Sub-Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {subprojects.map((sp) => (
              <div key={sp.id} className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{sp.name}</h3>
                    {sp.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sp.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(sp.id, sp.name)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <BeakerIcon className="w-3.5 h-3.5" />
                    <span>{sp.test_run_count ?? 0} runs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{sp.good_run_count ?? 0} good</span>
                  </div>
                </div>

                {sp.last_run_date && (
                  <div className="text-xs text-slate-400">
                    Last run: {formatDate(sp.last_run_date)}
                  </div>
                )}

                <Link
                  to={`/projects/${id}/subprojects/${sp.id}`}
                  className="btn-secondary justify-center text-indigo-600 border-indigo-200 hover:bg-indigo-50 mt-auto text-xs"
                >
                  View Test Runs
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && isAdmin && (
        <CreateSubProjectModal
          onClose={() => setShowModal(false)}
          onSave={handleCreate}
          loading={saving}
        />
      )}
    </div>
  );
}
