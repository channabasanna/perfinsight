import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSubProject } from '../api/projects';
import { getTestRuns, updateTestRun, updateTestRunStatus, deleteTestRun, getTransactions } from '../api/testruns';
import { getSubProjectFilters, updateSubProjectFilters } from '../api/projects';
import { getTrends } from '../api/comparison';
import { SubProject, TestRun, Transaction, TrendsOverview } from '../types';
import TrendChart from '../components/charts/TrendChart';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  BeakerIcon,
  ArrowTrendingUpIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  CheckIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      status === 'good' ? 'badge-good' : status === 'bad' ? 'badge-bad' : 'badge-pending'
    )}>
      {status}
    </span>
  );
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

interface TransactionsModalProps {
  testRun: TestRun;
  projectId: string;
  subprojectId: string;
  onClose: () => void;
}

function TransactionsModal({ testRun, projectId, subprojectId, onClose }: TransactionsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [configuredFilters, setConfiguredFilters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFilteredOnly, setShowFilteredOnly] = useState(false);

  useEffect(() => {
    Promise.all([
      getTransactions(testRun.id),
      getSubProjectFilters(Number(projectId), Number(subprojectId)),
    ])
      .then(([txns, filters]) => {
        setTransactions(txns);
        setConfiguredFilters(new Set(filters));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [testRun.id, projectId, subprojectId]);

  const displayed = showFilteredOnly && configuredFilters.size > 0
    ? transactions.filter((t) => configuredFilters.has(t.name))
    : transactions;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{testRun.name}</h2>
            <p className="text-sm text-slate-500">
              Transactions ({displayed.length}{showFilteredOnly && configuredFilters.size > 0 ? ` of ${transactions.length}` : ''})
            </p>
          </div>
          <div className="flex items-center gap-4">
            {!loading && configuredFilters.size > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showFilteredOnly}
                  onChange={(e) => setShowFilteredOnly(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                Show configured transactions only
              </label>
            )}
            {!loading && configuredFilters.size === 0 && (
              <span className="text-xs text-slate-400 italic">No transaction filters configured</span>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No transactions found</div>
          ) : displayed.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No configured transactions found in this test run.</div>
          ) : (
            <table className="w-full text-sm table-fixed">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="table-header w-[36%]">Transaction</th>
                  <th className="table-header text-right w-[9%]">Samples</th>
                  <th className="table-header text-right w-[9%]">Avg (s)</th>
                  <th className="table-header text-right w-[9%]">P90 (s)</th>
                  <th className="table-header text-right w-[9%]">P95 (s)</th>
                  <th className="table-header text-right w-[9%]">P99 (s)</th>
                  <th className="table-header text-right w-[7%]">Error%</th>
                  <th className="table-header text-right w-[6%]">TPS</th>
                  <th className="table-header text-right w-[6%]">KB/s</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((t) => (
                  <tr key={t.id} className={clsx('hover:bg-slate-50', showFilteredOnly && configuredFilters.has(t.name) ? 'bg-indigo-50/40' : '')}>
                    <td className="table-cell font-medium text-slate-800 break-words overflow-hidden" title={t.name}>{t.name}</td>
                    <td className="table-cell text-right">{t.samples?.toLocaleString() || 0}</td>
                    <td className="table-cell text-right">{t.avg_response_time?.toFixed(2) || '—'}</td>
                    <td className="table-cell text-right">{t.p90_response_time?.toFixed(2) || '—'}</td>
                    <td className="table-cell text-right">{t.p95_response_time?.toFixed(2) || '—'}</td>
                    <td className="table-cell text-right">{t.p99_response_time?.toFixed(2) || '—'}</td>
                    <td className={clsx('table-cell text-right', t.error_rate > 0 ? 'text-red-600 font-medium' : '')}>
                      {t.error_rate?.toFixed(2) || '0.00'}%
                    </td>
                    <td className="table-cell text-right">{t.throughput?.toFixed(2) || '—'}</td>
                    <td className="table-cell text-right">{t.kb_per_sec?.toFixed(2) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterConfigModalProps {
  projectId: string;
  subprojectId: string;
  testRuns: TestRun[];
  onClose: () => void;
}

function FilterConfigModal({ projectId, subprojectId, testRuns, onClose }: FilterConfigModalProps) {
  const [allTransactions, setAllTransactions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState<{ matched: number; unmatched: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Load current filters
        const filters = await getSubProjectFilters(Number(projectId), Number(subprojectId));
        setSelected(new Set(filters));

        // Load all available transaction names from the most recent test run
        if (testRuns.length > 0) {
          const transactions = await getTransactions(testRuns[0].id);
          setAllTransactions(transactions.map((t) => t.name).sort());
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, subprojectId, testRuns]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((n) => next.add(n));
      return next;
    });

  const deselectFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((n) => next.delete(n));
      return next;
    });

  const clearAll = () => setSelected(new Set());

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected if needed
    e.target.value = '';
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

        // Find the column whose header matches transaction / name / label (case-insensitive)
        const txnColumnKey = rows.length > 0
          ? Object.keys(rows[0]).find((k) =>
              /transaction|name|label/i.test(k)
            ) ?? Object.keys(rows[0])[0]
          : null;

        if (!txnColumnKey) {
          setError('No usable column found in the uploaded file.');
          return;
        }

        const imported = rows
          .map((r) => String(r[txnColumnKey]).trim())
          .filter(Boolean);

        const allSet = new Set(allTransactions);
        const matched: string[] = [];
        const unmatched: string[] = [];

        imported.forEach((name) => {
          if (allSet.has(name)) matched.push(name);
          else unmatched.push(name);
        });

        setSelected((prev) => {
          const next = new Set(prev);
          matched.forEach((n) => next.add(n));
          return next;
        });
        setImportResult({ matched: matched.length, unmatched });
      } catch {
        setError('Failed to parse the Excel file. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSubProjectFilters(Number(projectId), Number(subprojectId), Array.from(selected));
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const filtered = allTransactions.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Transaction Filter Configuration</h2>
            <p className="text-sm text-slate-500">
              Select which transactions to include in comparisons. Leave all unchecked to include everything.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 space-y-2">
          {/* Search row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              title="Upload an Excel file — transactions listed in it will be selected automatically"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Import Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleExcelImport}
            />
          </div>

          {/* Import result feedback */}
          {importResult && (
            <div className={clsx(
              'rounded-lg px-3 py-2 text-xs flex flex-col gap-0.5',
              importResult.unmatched.length === 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            )}>
              <span className="font-medium">
                {importResult.matched} transaction{importResult.matched !== 1 ? 's' : ''} from the file matched and selected.
              </span>
              {importResult.unmatched.length > 0 && (
                <span>
                  {importResult.unmatched.length} not found in this sub-project:{' '}
                  <span className="italic">{importResult.unmatched.slice(0, 3).join(', ')}{importResult.unmatched.length > 3 ? ` …+${importResult.unmatched.length - 3} more` : ''}</span>
                </span>
              )}
            </div>
          )}

          {/* Select / deselect shortcuts */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-slate-500">{selected.size} of {allTransactions.length} selected</span>
            <button onClick={selectFiltered} className="text-indigo-600 hover:underline">
              {search ? `Select results (${filtered.length})` : 'Select all'}
            </button>
            {search && (
              <button onClick={deselectFiltered} className="text-orange-600 hover:underline">
                Deselect results ({filtered.length})
              </button>
            )}
            <button onClick={clearAll} className="text-slate-500 hover:underline">Clear all</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-3">
          {loading ? (
            <div className="py-8 text-center text-slate-500 text-sm">Loading transactions...</div>
          ) : error ? (
            <div className="py-4 text-red-600 text-sm">{error}</div>
          ) : allTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              No transactions found. Upload a test run first to configure filters.
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-4 text-slate-500 text-sm text-center">No transactions match your search.</div>
          ) : (
            <div className="space-y-1">
              {filtered.map((name) => (
                <label
                  key={name}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(name)}
                    onChange={() => toggle(name)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 flex-1">{name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {selected.size === 0 && (
            <p className="text-xs text-slate-500">All transactions will be included (no filter active)</p>
          )}
          {selected.size > 0 && (
            <p className="text-xs text-slate-500">Only {selected.size} selected transaction{selected.size !== 1 ? 's' : ''} will be compared</p>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Filters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubProjectDetail() {
  const { projectId, subprojectId } = useParams<{ projectId: string; subprojectId: string }>();
  const navigate = useNavigate();
  const [subproject, setSubproject] = useState<SubProject | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [showFilterConfig, setShowFilterConfig] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [trendSummary, setTrendSummary] = useState<TrendsOverview['testRunSummary']>([]);
  const [editingRunId, setEditingRunId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadData = async () => {
    if (!projectId || !subprojectId) return;
    setLoading(true);
    try {
      const [sp, runs] = await Promise.all([
        getSubProject(Number(projectId), Number(subprojectId)),
        getTestRuns(Number(subprojectId)),
      ]);
      setSubproject(sp);
      setTestRuns(runs);

      // Load filter count
      const filters = await getSubProjectFilters(Number(projectId), Number(subprojectId));
      setActiveFilterCount(filters.length);

      // Load trend summary for chart (when 2+ runs exist)
      if (runs.length >= 2) {
        const trends = await getTrends(Number(subprojectId)) as TrendsOverview;
        setTrendSummary(trends.testRunSummary ?? []);
      } else {
        setTrendSummary([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [projectId, subprojectId]);

  const handleStatusUpdate = async (id: number, status: 'good' | 'bad') => {
    try {
      await updateTestRunStatus(id, status);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete test run "${name}"?`)) return;
    try {
      await deleteTestRun(id);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const startEditing = (run: TestRun) => {
    setEditingRunId(run.id);
    setEditingName(run.name);
  };

  const cancelEditing = () => {
    setEditingRunId(null);
    setEditingName('');
  };

  const handleRename = async (id: number) => {
    const trimmed = editingName.trim();
    if (!trimmed) { cancelEditing(); return; }
    try {
      await updateTestRun(id, { name: trimmed });
      setEditingRunId(null);
      setEditingName('');
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to rename');
    }
  };

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM dd, yyyy'); } catch { return d; }
  };

  const goodRuns = testRuns.filter((t) => t.status === 'good');
  const lastRun = testRuns[0];

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!subproject) return <div className="p-8 text-slate-500">Sub-project not found</div>;

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/projects" className="hover:text-indigo-600">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${projectId}`} className="hover:text-indigo-600 flex items-center gap-1">
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          {subproject.project_name}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{subproject.name}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{subproject.name}</h1>
            <p className="text-slate-500 mt-0.5">{subproject.customer_name} · {subproject.project_name}</p>
            {subproject.description && (
              <p className="text-sm text-slate-500 mt-2">{subproject.description}</p>
            )}
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">{testRuns.length}</div>
              <div className="text-xs text-slate-500">Total Runs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">{goodRuns.length}</div>
              <div className="text-xs text-slate-500">Good Runs</div>
            </div>
            {lastRun && (
              <div>
                <div className="text-sm font-semibold text-slate-700">{formatDate(lastRun.execution_date)}</div>
                <div className="text-xs text-slate-500">Last Run</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => navigate(`/upload?subprojectId=${subprojectId}&projectId=${projectId}`)}
          className="btn-primary"
        >
          <PlusIcon className="w-4 h-4" />
          Upload New Test
        </button>
        <button
          onClick={() => navigate(`/trends?subprojectId=${subprojectId}`)}
          className="btn-secondary"
        >
          <ArrowTrendingUpIcon className="w-4 h-4" />
          View Trends
        </button>
        <button
          onClick={() => setShowFilterConfig(true)}
          className={clsx(
            'btn-secondary',
            activeFilterCount > 0 && 'ring-2 ring-indigo-400'
          )}
        >
          <FunnelIcon className="w-4 h-4" />
          Configure Transaction Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700">
          <FunnelIcon className="w-4 h-4 flex-shrink-0" />
          <span>
            Comparison is filtered to <strong>{activeFilterCount}</strong> transaction{activeFilterCount !== 1 ? 's' : ''}.
            All other transactions will be excluded from comparisons.
          </span>
        </div>
      )}

      {/* Test Runs Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Test Runs</h2>
        </div>
        {testRuns.length === 0 ? (
          <div className="py-12 text-center">
            <BeakerIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-medium text-slate-700 mb-2">No test runs yet</h3>
            <p className="text-sm text-slate-500 mb-4">Upload your first test result file</p>
            <button
              onClick={() => navigate(`/upload?subprojectId=${subprojectId}&projectId=${projectId}`)}
              className="btn-primary mx-auto"
            >
              <PlusIcon className="w-4 h-4" />
              Upload Test
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Build</th>
                  <th className="table-header">User Load</th>
                  <th className="table-header">Tool</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Transactions</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {testRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50">
                    <td className="table-cell font-medium text-slate-800">
                      {editingRunId === run.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(run.id);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          onBlur={() => handleRename(run.id)}
                          className="w-full px-2 py-1 text-sm border border-indigo-400 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        run.name
                      )}
                    </td>
                    <td className="table-cell text-slate-600">{run.build || '—'}</td>
                    <td className="table-cell text-slate-600">{run.user_load ?? '—'}</td>
                    <td className="table-cell"><ToolBadge tool={run.test_tool} /></td>
                    <td className="table-cell text-slate-600">{formatDate(run.execution_date)}</td>
                    <td className="table-cell text-slate-600">{run.transaction_count ?? 0}</td>
                    <td className="table-cell"><StatusBadge status={run.status} /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        {editingRunId === run.id ? (
                          <>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); handleRename(run.id); }}
                              title="Save name"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            >
                              <CheckIcon className="w-4 h-4" />
                            </button>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); cancelEditing(); }}
                              title="Cancel"
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditing(run)}
                            title="Rename"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedRun(run)}
                          title="View transactions"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {run.status !== 'good' && (
                          <button
                            onClick={() => handleStatusUpdate(run.id, 'good')}
                            title="Mark as Good"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </button>
                        )}
                        {run.status !== 'bad' && (
                          <button
                            onClick={() => handleStatusUpdate(run.id, 'bad')}
                            title="Mark as Bad"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(run.id, run.name)}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
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

      {/* Performance Trend — shown when 2+ test runs exist */}
      {trendSummary.length >= 2 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Performance Trend</h2>
            <button
              onClick={() => navigate(`/trends?subprojectId=${subprojectId}`)}
              className="text-xs text-indigo-600 hover:underline"
            >
              Full trend analysis →
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendChart
              title="Avg & P90 Response Time (s)"
              data={trendSummary}
              yAxisLabel="Seconds"
              height={240}
              lines={[
                { key: 'avg_response_time', label: 'Avg Response Time', color: '#6366f1' },
                { key: 'p90_response_time', label: 'P90 Response Time', color: '#f59e0b' },
              ]}
            />
            <TrendChart
              title="Throughput (req/s)"
              data={trendSummary}
              yAxisLabel="req/s"
              height={240}
              lines={[
                { key: 'avg_throughput', label: 'Throughput', color: '#10b981' },
              ]}
            />
            <TrendChart
              title="Error Rate (%)"
              data={trendSummary}
              yAxisLabel="%"
              height={240}
              lines={[
                { key: 'avg_error_rate', label: 'Error Rate', color: '#ef4444' },
              ]}
            />
            <TrendChart
              title="User Load (VUs)"
              data={trendSummary}
              yAxisLabel="VUs"
              height={240}
              lines={[
                { key: 'user_load', label: 'Virtual Users', color: '#8b5cf6' },
              ]}
            />
          </div>
        </div>
      )}

      {selectedRun && (
        <TransactionsModal testRun={selectedRun} projectId={projectId!} subprojectId={subprojectId!} onClose={() => setSelectedRun(null)} />
      )}

      {showFilterConfig && projectId && subprojectId && (
        <FilterConfigModal
          projectId={projectId}
          subprojectId={subprojectId}
          testRuns={testRuns}
          onClose={() => {
            setShowFilterConfig(false);
            // Refresh filter count
            getSubProjectFilters(Number(projectId), Number(subprojectId))
              .then((f) => setActiveFilterCount(f.length))
              .catch(console.error);
          }}
        />
      )}
    </div>
  );
}
