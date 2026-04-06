import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../api/comparison';
import { DashboardStats, TestRun } from '../types';
import {
  FolderIcon,
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'good' ? 'badge-good' : status === 'bad' ? 'badge-bad' : 'badge-pending';
  return <span className={cls}>{status}</span>;
}

function ToolBadge({ tool }: { tool: string }) {
  const colors: Record<string, string> = {
    JMeter: 'bg-red-100 text-red-700',
    Gatling: 'bg-purple-100 text-purple-700',
    K6: 'bg-blue-100 text-blue-700',
    Locust: 'bg-orange-100 text-orange-700',
    Custom: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors[tool] || colors.Custom)}>
      {tool}
    </span>
  );
}

interface SubProjectGroup {
  subprojectId: number;
  subprojectName: string;
  runs: TestRun[];
}

interface ProjectGroup {
  projectId: number;
  projectName: string;
  customerName: string;
  subprojects: SubProjectGroup[];
}

function groupByProjectAndSubproject(runs: TestRun[]): ProjectGroup[] {
  const projectMap = new Map<number, ProjectGroup>();

  for (const run of runs) {
    const pid = (run as TestRun & { project_id: number; subproject_id: number }).project_id;
    const spid = (run as TestRun & { project_id: number; subproject_id: number }).subproject_id;

    if (!projectMap.has(pid)) {
      projectMap.set(pid, {
        projectId: pid,
        projectName: run.project_name || 'Unknown Project',
        customerName: run.customer_name || '',
        subprojects: [],
      });
    }

    const project = projectMap.get(pid)!;
    let subproject = project.subprojects.find((s) => s.subprojectId === spid);
    if (!subproject) {
      subproject = { subprojectId: spid, subprojectName: run.subproject_name || 'Unknown', runs: [] };
      project.subprojects.push(subproject);
    }
    subproject.runs.push(run);
  }

  return Array.from(projectMap.values());
}

function SubProjectSection({ group, projectId, formatDate }: {
  group: SubProjectGroup;
  projectId: number;
  formatDate: (d: string) => string;
}) {
  const [expanded, setExpanded] = useState(true);
  const goodCount = group.runs.filter((r) => r.status === 'good').length;
  const badCount = group.runs.filter((r) => r.status === 'bad').length;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Sub-project header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {expanded
            ? <ChevronDownIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            : <ChevronRightIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />}
          <Link
            to={`/projects/${projectId}/subprojects/${group.subprojectId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-semibold text-slate-800 hover:text-indigo-600"
          >
            {group.subprojectName}
          </Link>
          <span className="text-xs text-slate-400">{group.runs.length} run{group.runs.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {goodCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircleIcon className="w-3.5 h-3.5" /> {goodCount} good
            </span>
          )}
          {badCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircleIcon className="w-3.5 h-3.5" /> {badCount} bad
            </span>
          )}
        </div>
      </button>

      {/* Test runs table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="table-header">Test Name</th>
                <th className="table-header">Build</th>
                <th className="table-header">Tool</th>
                <th className="table-header">User Load</th>
                <th className="table-header">Date</th>
                <th className="table-header">Transactions</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {group.runs.map((run) => (
                <tr key={run.id} className="hover:bg-slate-50">
                  <td className="table-cell font-medium text-slate-800">{run.name}</td>
                  <td className="table-cell text-slate-500">{run.build || '—'}</td>
                  <td className="table-cell"><ToolBadge tool={run.test_tool} /></td>
                  <td className="table-cell text-slate-500">{run.user_load ?? '—'}</td>
                  <td className="table-cell text-slate-500">{formatDate(run.execution_date)}</td>
                  <td className="table-cell text-slate-500">{run.transaction_count ?? 0}</td>
                  <td className="table-cell"><StatusBadge status={run.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [baselineId, setBaselineId] = useState('');
  const [compareId, setCompareId] = useState('');
  const [collapsedProjects, setCollapsedProjects] = useState<Set<number>>(new Set());

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCompare = () => {
    if (baselineId && compareId) {
      navigate(`/comparison?baseline=${baselineId}&compare=${compareId}`);
    }
  };

  const toggleProject = (pid: number) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading dashboard: {error}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Projects', value: stats?.totalProjects ?? 0, icon: FolderIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/projects' },
    { label: 'Total Test Runs', value: stats?.totalTestRuns ?? 0, icon: BeakerIcon, color: 'text-blue-600', bg: 'bg-blue-50', href: null },
    { label: 'Good Tests', value: stats?.goodTests ?? 0, icon: CheckCircleIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', href: null },
    { label: 'Bad Tests', value: stats?.badTests ?? 0, icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-50', href: null },
  ];

  const formatDate = (dateStr: string) => {
    try { return format(parseISO(dateStr), 'MMM dd, yyyy'); } catch { return dateStr; }
  };

  const projectGroups = groupByProjectAndSubproject(stats?.recentTestRuns ?? []);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Performance test results overview and quick actions</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          const inner = (
            <div className="stat-card flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', card.bg)}>
                <Icon className={clsx('w-6 h-6', card.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-sm text-slate-500">{card.label}</p>
              </div>
            </div>
          );
          return card.href ? (
            <Link key={card.label} to={card.href}>{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      {/* Quick Comparison */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ChartBarIcon className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900">Quick Comparison</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Select two test runs from the same sub-project to compare.</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <label className="form-label">Baseline Test Run</label>
            <select
              className="form-select"
              value={baselineId}
              onChange={(e) => { setBaselineId(e.target.value); setCompareId(''); }}
            >
              <option value="">Select baseline...</option>
              {(() => {
                const groups = groupByProjectAndSubproject(stats?.allTestRuns ?? []);
                return groups.map((project) =>
                  project.subprojects.map((sp) => (
                    <optgroup
                      key={`${project.projectId}-${sp.subprojectId}`}
                      label={`${project.projectName} › ${sp.subprojectName}`}
                    >
                      {sp.runs.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {formatDate(t.execution_date)}
                          {t.status !== 'good' ? ` (${t.status})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))
                );
              })()}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="form-label">Compare Test Run</label>
            {(() => {
              const baselineRun = stats?.allTestRuns.find((t) => String(t.id) === baselineId);
              const sameSubproject = stats?.allTestRuns.filter(
                (t) => String(t.id) !== baselineId &&
                  (t as TestRun & { subproject_id: number }).subproject_id ===
                  (baselineRun as (TestRun & { subproject_id: number }) | undefined)?.subproject_id
              ) ?? [];
              return (
                <select
                  className="form-select"
                  value={compareId}
                  onChange={(e) => setCompareId(e.target.value)}
                  disabled={!baselineId}
                >
                  <option value="">{baselineId ? 'Select comparison...' : 'Select a baseline first'}</option>
                  {sameSubproject.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {formatDate(t.execution_date)} ({t.status})
                    </option>
                  ))}
                </select>
              );
            })()}
          </div>
          <button
            onClick={handleCompare}
            disabled={!baselineId || !compareId}
            className="btn-primary"
          >
            Compare
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Test Runs by Project / Sub-project */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Test Runs</h2>
          <Link to="/upload" className="btn-primary text-xs">Upload New</Link>
        </div>

        {projectGroups.length === 0 ? (
          <div className="card p-12 text-center">
            <BeakerIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              No test runs yet.{' '}
              <Link to="/upload" className="text-indigo-600 hover:underline">Upload your first test result</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projectGroups.map((project) => {
              const isCollapsed = collapsedProjects.has(project.projectId);
              const totalRuns = project.subprojects.reduce((s, sp) => s + sp.runs.length, 0);
              const goodRuns = project.subprojects.reduce(
                (s, sp) => s + sp.runs.filter((r) => r.status === 'good').length, 0
              );

              return (
                <div key={project.projectId} className="card overflow-hidden">
                  {/* Project header */}
                  <button
                    onClick={() => toggleProject(project.projectId)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-slate-50 transition-colors text-left border-b border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed
                        ? <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                        : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FolderIcon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <Link
                          to={`/projects/${project.projectId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {project.projectName}
                        </Link>
                        {project.customerName && (
                          <p className="text-xs text-slate-500 mt-0.5">{project.customerName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{project.subprojects.length} sub-project{project.subprojects.length !== 1 ? 's' : ''}</span>
                      <span>{totalRuns} run{totalRuns !== 1 ? 's' : ''}</span>
                      {goodRuns > 0 && (
                        <span className="text-emerald-600 font-medium">{goodRuns} good</span>
                      )}
                    </div>
                  </button>

                  {/* Sub-projects */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100 px-4 py-3 space-y-3">
                      {project.subprojects.map((sp) => (
                        <SubProjectSection
                          key={sp.subprojectId}
                          group={sp}
                          projectId={project.projectId}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
