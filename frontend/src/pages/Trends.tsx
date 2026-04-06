import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProjects, getSubProjects, getSubProjectFilters } from '../api/projects';
import { getTrends } from '../api/comparison';
import { Project, SubProject, TrendDataPoint, TrendsOverview } from '../types';
import TrendChart from '../components/charts/TrendChart';
import {
  ArrowTrendingUpIcon,
  FunnelIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export default function Trends() {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [subprojects, setSubprojects] = useState<SubProject[]>([]);
  const [allTransactionNames, setAllTransactionNames] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSubproject, setSelectedSubproject] = useState(searchParams.get('subprojectId') || '');
  const [selectedTransaction, setSelectedTransaction] = useState('');
  const [filter, setFilter] = useState<'good' | 'all'>('all');
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      getSubProjects(Number(selectedProject)).then(setSubprojects).catch(console.error);
    }
  }, [selectedProject]);

  // Load transaction names + filters when subproject selected
  useEffect(() => {
    if (!selectedSubproject) return;

    getTrends(Number(selectedSubproject), undefined, filter)
      .then((data) => {
        const overview = data as TrendsOverview;
        setAllTransactionNames(overview.transactionNames || []);
      })
      .catch(console.error);

    // Load saved transaction filters for the sub-project (needs projectId)
    // Find it from the already-loaded subprojects list; fall back to no filters
    const sp = subprojects.find((s) => String(s.id) === String(selectedSubproject));
    if (sp) {
      getSubProjectFilters(sp.project_id, sp.id)
        .then(setActiveFilters)
        .catch(() => setActiveFilters([]));
    } else {
      setActiveFilters([]);
    }
  }, [selectedSubproject, filter, subprojects]);

  // Derive visible transaction names: apply filter if set
  const transactionNames = activeFilters.length > 0
    ? allTransactionNames.filter((n) => activeFilters.includes(n))
    : allTransactionNames;

  // Load trend data when transaction selected
  useEffect(() => {
    if (selectedSubproject && selectedTransaction) {
      setLoading(true);
      setError('');
      getTrends(Number(selectedSubproject), selectedTransaction, filter)
        .then((data) => setTrendData(data as TrendDataPoint[]))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      setTrendData([]);
    }
  }, [selectedSubproject, selectedTransaction, filter]);

  // Reset selected transaction if it's no longer in the filtered list
  useEffect(() => {
    if (selectedTransaction && transactionNames.length > 0 && !transactionNames.includes(selectedTransaction)) {
      setSelectedTransaction('');
    }
  }, [transactionNames]);

  // Auto-load if subprojectId in URL
  useEffect(() => {
    const spId = searchParams.get('subprojectId');
    if (spId && !selectedSubproject) {
      setSelectedSubproject(spId);
    }
  }, [searchParams]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Trend Analysis</h1>
        <p className="text-slate-500 mt-1">Track performance metrics over time across multiple test runs</p>
      </div>

      {/* Selectors */}
      <div className="card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Project</label>
            <select
              className="form-select"
              value={selectedProject}
              onChange={(e) => { setSelectedProject(e.target.value); setSelectedSubproject(''); setSelectedTransaction(''); setTrendData([]); setActiveFilters([]); }}
            >
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Sub-Project</label>
            <select
              className="form-select"
              value={selectedSubproject}
              onChange={(e) => { setSelectedSubproject(e.target.value); setSelectedTransaction(''); setTrendData([]); }}
            >
              <option value="">Select sub-project...</option>
              {subprojects.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
              {!selectedProject && <option disabled>— select a project first —</option>}
            </select>
            {!selectedProject && (
              <p className="text-xs text-slate-500 mt-1">Or enter a sub-project ID directly below</p>
            )}
          </div>
          <div>
            <label className="form-label">Transaction</label>
            <select
              className="form-select"
              value={selectedTransaction}
              onChange={(e) => setSelectedTransaction(e.target.value)}
              disabled={!selectedSubproject}
            >
              <option value="">Select transaction...</option>
              {transactionNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Filter</label>
            <select
              className="form-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'good' | 'all')}
            >
              <option value="all">All Test Runs</option>
              <option value="good">Good Runs Only</option>
            </select>
          </div>
        </div>

{activeFilters.length > 0 && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
            <FunnelIcon className="w-3.5 h-3.5 flex-shrink-0" />
            Showing <strong>{transactionNames.length}</strong> configured transaction{transactionNames.length !== 1 ? 's' : ''} (filter active)
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading && (
        <div className="text-slate-500 py-8 text-center">Loading trend data...</div>
      )}

      {/* Charts */}
      {!loading && trendData.length > 0 && (
        <div className="space-y-4">
          {/* Trend info banner */}
          <div className="bg-slate-100 rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ArrowTrendingUpIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              Showing trend for <span className="font-semibold text-slate-800">"{selectedTransaction}"</span>
              — {trendData.length} data point{trendData.length !== 1 ? 's' : ''}
              {filter === 'good' ? ' (good runs only)' : ''}
            </div>
            {/* Per-run user load chips */}
            {trendData.some((d) => d.user_load != null && d.user_load > 0) && (
              <div className="flex items-center gap-2 flex-wrap">
                <UsersIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-500 mr-1">User Load:</span>
                {trendData.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                    title={d.test_run_name}
                  >
                    <span className="max-w-[100px] truncate">{d.test_run_name}</span>
                    <span className="font-bold">{d.user_load != null && d.user_load > 0 ? `${d.user_load} VUs` : '—'}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendChart
              data={trendData}
              title="Average Response Time Trend"
              yAxisLabel="Seconds"
              lines={[
                { key: 'avg_response_time', label: 'Avg Response Time', color: '#6366f1' },
              ]}
            />
            <TrendChart
              data={trendData}
              title="P90 Response Time Trend"
              yAxisLabel="Seconds"
              lines={[
                { key: 'p90_response_time', label: 'P90 Response Time', color: '#f59e0b' },
                { key: 'p99_response_time', label: 'P99 Response Time', color: '#ef4444' },
              ]}
            />
            <TrendChart
              data={trendData}
              title="Throughput Trend"
              yAxisLabel="req/s"
              lines={[
                { key: 'throughput', label: 'Throughput (req/s)', color: '#10b981' },
              ]}
            />
            <TrendChart
              data={trendData}
              title="Error Rate Trend"
              yAxisLabel="%"
              lines={[
                { key: 'error_rate', label: 'Error Rate (%)', color: '#ef4444' },
              ]}
            />
          </div>

        </div>
      )}

      {!loading && selectedSubproject && !selectedTransaction && transactionNames.length > 0 && (
        <div className="card p-8 text-center">
          <ArrowTrendingUpIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-700 mb-2">Select a Transaction</h3>
          <p className="text-sm text-slate-500">Choose a transaction from the dropdown to see its trend over time</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {transactionNames.slice(0, 8).map((name) => (
              <button
                key={name}
                onClick={() => setSelectedTransaction(name)}
                className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full hover:bg-indigo-100 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && selectedSubproject && transactionNames.length === 0 && (
        <div className="card p-8 text-center text-slate-500">
          {activeFilters.length > 0
            ? 'No transactions match the configured filter. Update the filter in the Sub-Project settings.'
            : 'No transaction data found for this sub-project. Upload some test results first.'}
        </div>
      )}

      {!loading && !selectedSubproject && (
        <div className="card p-12 text-center">
          <ArrowTrendingUpIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">Select a Sub-Project</h3>
          <p className="text-slate-500 text-sm">Choose a project and sub-project to view performance trends</p>
        </div>
      )}
    </div>
  );
}
