import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProjects, getSubProjects } from '../api/projects';
import { getTestRuns } from '../api/testruns';
import { getComparison, getTrends } from '../api/comparison';
import { Project, SubProject, TestRun, ComparisonResult, TrendsOverview, TrendSummaryPoint } from '../types';
import { ResponseTimeTable, ThroughputTable, ErrorRateTable } from '../components/ComparisonTable';
import InsightCard from '../components/InsightCard';
import { AvgResponseTimeChart, P90ResponseTimeChart } from '../components/charts/ResponseTimeChart';
import ThroughputChart from '../components/charts/ThroughputChart';
import ErrorRateChart from '../components/charts/ErrorRateChart';
import {
  ChartBarIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { generateComparisonPDF } from '../utils/generateComparisonPDF';

function ExecutiveSummary({ result }: { result: ComparisonResult }) {
  const tc = result.transactionComparisons;
  const paired = tc.filter((c) => c.baseline && c.compare);
  const { baseline, compare, summary } = result;
  const { improvements, regressions, neutral } = summary;

  const avgOf = (vals: (number | null | undefined)[]) => {
    const nums = vals.filter((v): v is number => v != null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };

  // ── Glance stats ──────────────────────────────────────────────
  const above5s = paired.filter((c) => (c.compare!.avg_response_time ?? 0) > 5).length;

  const peakEntry = paired.length
    ? paired.reduce((max, c) =>
        (c.compare!.avg_response_time ?? 0) > (max.compare!.avg_response_time ?? 0) ? c : max)
    : null;

  const maxRegrEntry = paired.length
    ? paired.reduce((max, c) => {
        const d  = (c.compare!.avg_response_time ?? 0) - (c.baseline!.avg_response_time ?? 0);
        const md = (max.compare!.avg_response_time ?? 0) - (max.baseline!.avg_response_time ?? 0);
        return d > md ? c : max;
      })
    : null;

  const bestImpEntry = paired.length
    ? paired.reduce((max, c) => {
        const d  = (c.baseline!.avg_response_time ?? 0) - (c.compare!.avg_response_time ?? 0);
        const md = (max.baseline!.avg_response_time ?? 0) - (max.compare!.avg_response_time ?? 0);
        return d > md ? c : max;
      })
    : null;

  const maxRegrVal  = maxRegrEntry
    ? (maxRegrEntry.compare!.avg_response_time - maxRegrEntry.baseline!.avg_response_time)
    : null;
  const bestImpVal  = bestImpEntry
    ? (bestImpEntry.baseline!.avg_response_time - bestImpEntry.compare!.avg_response_time)
    : null;

  // ── Table metrics ─────────────────────────────────────────────
  const bSamples  = paired.reduce((s, c) => s + (c.baseline!.samples ?? 0), 0);
  const cSamples  = paired.reduce((s, c) => s + (c.compare!.samples  ?? 0), 0);
  const bAvgRT    = avgOf(paired.map((c) => c.baseline!.avg_response_time));
  const cAvgRT    = avgOf(paired.map((c) => c.compare!.avg_response_time));
  const bP90      = avgOf(paired.map((c) => c.baseline!.p90_response_time));
  const cP90      = avgOf(paired.map((c) => c.compare!.p90_response_time));
  const bErrCnt   = paired.reduce((s, c) => s + Math.round((c.baseline!.samples ?? 0) * (c.baseline!.error_rate ?? 0) / 100), 0);
  const cErrCnt   = paired.reduce((s, c) => s + Math.round((c.compare!.samples  ?? 0) * (c.compare!.error_rate  ?? 0) / 100), 0);
  const bErrRate  = avgOf(paired.map((c) => c.baseline!.error_rate));
  const cErrRate  = avgOf(paired.map((c) => c.compare!.error_rate));
  const bHPS      = paired.reduce((s, c) => s + (c.baseline!.throughput ?? 0), 0);
  const cHPS      = paired.reduce((s, c) => s + (c.compare!.throughput  ?? 0), 0);

  // ── Narrative ─────────────────────────────────────────────────
  const rtChange = bAvgRT != null && cAvgRT != null
    ? `Average RT moved from ${bAvgRT.toFixed(2)}s to ${cAvgRT.toFixed(2)}s`
    : '';

  const verdict = regressions > improvements
    ? `${above5s} transaction${above5s !== 1 ? 's' : ''} exceed the 5s threshold. Overall performance has degraded — action recommended.`
    : regressions === 0
      ? 'All transactions are stable or improved. Overall performance looks good.'
      : `${above5s} transaction${above5s !== 1 ? 's' : ''} exceed the 5s threshold. Mixed results — review regressions carefully.`;

  // ── Change cell helpers ────────────────────────────────────────
  const absChange = (base: number, cmp: number, lowerIsBetter: boolean, decimals: number, unit: string) => {
    const d = cmp - base;
    if (d === 0) return { text: '● No change', cls: 'text-slate-500' };
    const worse  = lowerIsBetter ? d > 0 : d < 0;
    const arrow  = d > 0 ? '↑' : '↓';
    const sign   = d > 0 ? '+' : '';
    const val    = decimals === 0 ? Math.abs(Math.round(d)).toLocaleString() : Math.abs(d).toFixed(decimals);
    const label  = worse ? ' (worse)' : ' (better)';
    return { text: `${arrow} ${sign}${decimals === 0 ? (d > 0 ? '+' : '') : sign}${val}${unit}${label}`, cls: worse ? 'text-red-600' : 'text-emerald-600' };
  };

  const errRateChange = () => {
    if (bErrRate == null || cErrRate == null) return { text: '—', cls: 'text-slate-400' };
    if (cErrRate > bErrRate) return { text: '↑ Increased', cls: 'text-red-600' };
    if (cErrRate < bErrRate) return { text: '↓ Decreased', cls: 'text-emerald-600' };
    return { text: '● No change', cls: 'text-slate-500' };
  };

  const hpsChange = () => {
    if (bHPS === 0) return { text: '—', cls: 'text-slate-400' };
    const pct = ((cHPS - bHPS) / bHPS) * 100;
    const arrow = pct >= 0 ? '↑' : '↓';
    const label = pct >= 0 ? ' (higher)' : ' (lighter)';
    return {
      text: `${arrow} ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%${label}`,
      cls: pct < 0 ? 'text-red-600' : 'text-emerald-600',
    };
  };

  const tableRows = [
    { label: 'Total Transactions',  base: bSamples.toLocaleString(),                              cmp: cSamples.toLocaleString(),                              change: absChange(bSamples, cSamples, false, 0, '') },
    { label: 'Avg Response Time',   base: bAvgRT != null ? bAvgRT.toFixed(2) + ' s' : '—',        cmp: cAvgRT != null ? cAvgRT.toFixed(2) + ' s' : '—',        change: absChange(bAvgRT ?? 0, cAvgRT ?? 0, true, 2, 's') },
    { label: '90th Percentile RT',  base: bP90   != null ? bP90.toFixed(2)   + ' s' : '—',        cmp: cP90   != null ? cP90.toFixed(2)   + ' s' : '—',        change: absChange(bP90 ?? 0, cP90 ?? 0, true, 2, 's') },
    { label: 'Error Count',         base: bErrCnt.toLocaleString(),                                cmp: cErrCnt.toLocaleString(),                                change: absChange(bErrCnt, cErrCnt, true, 0, '') },
    { label: 'Error Rate',          base: bErrRate != null ? bErrRate.toFixed(2) + '%' : '—',      cmp: cErrRate != null ? cErrRate.toFixed(2) + '%' : '—',      change: errRateChange() },
    { label: 'Throughput (Hits/s)', base: bHPS.toFixed(2) + ' rps',                               cmp: cHPS.toFixed(2) + ' rps',                               change: hpsChange() },
  ];

  // ── Glance cards ──────────────────────────────────────────────
  const glanceCards = [
    { label: 'Compared',            value: paired.length.toString(),                                                   cls: 'text-slate-800',   bg: 'bg-white' },
    { label: 'Improved ↓',          value: improvements.toString(),                                                    cls: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Degraded ↑',          value: regressions.toString(),                                                     cls: 'text-red-600',     bg: 'bg-red-50' },
    { label: 'Stable',              value: neutral.toString(),                                                         cls: 'text-orange-500',  bg: 'bg-orange-50' },
    { label: 'Above 5s',            value: above5s.toString(),                                                         cls: 'text-pink-600',    bg: 'bg-pink-50' },
    { label: 'Peak RT (s)',         value: peakEntry ? peakEntry.compare!.avg_response_time.toFixed(1) : '—',          cls: 'text-orange-500',  bg: 'bg-orange-50' },
    { label: 'Max Regression (s)',  value: maxRegrVal != null && maxRegrVal > 0 ? `+${maxRegrVal.toFixed(1)}` : '—',  cls: 'text-red-500',     bg: 'bg-red-50' },
    { label: 'Best Improvement (s)',value: bestImpVal != null && bestImpVal > 0 ? bestImpVal.toFixed(1) : '—',         cls: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="card overflow-hidden border border-slate-200">

      {/* ── SUMMARY AT A GLANCE ── */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Summary at a Glance</h2>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-slate-200 border-b border-slate-200">
        {glanceCards.map((g) => (
          <div key={g.label} className={clsx('flex flex-col items-center justify-center py-5 px-2', g.bg)}>
            <span className={clsx('text-3xl font-extrabold leading-none tabular-nums', g.cls)}>{g.value}</span>
            <span className="text-[10px] text-slate-500 mt-2 text-center leading-tight">{g.label}</span>
          </div>
        ))}
      </div>

      {/* ── EXECUTIVE SUMMARY ── */}
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Executive Summary</h2>
      </div>
      <div className="px-5 py-4 space-y-2 border-b border-slate-200 text-sm">
        <p className="font-bold text-slate-800">
          Comparing <span className="text-indigo-600">'{baseline.name}'</span> (Baseline) vs{' '}
          <span className="text-amber-600">'{compare.name}'</span> (Comparison)
        </p>
        <p className="text-slate-600">
          Out of <strong>{paired.length}</strong> transactions compared,{' '}
          <strong className="text-emerald-600">{improvements}</strong> improved,{' '}
          <strong className="text-red-600">{regressions}</strong> degraded, and{' '}
          <strong className="text-orange-500">{neutral}</strong> remained stable.
        </p>
        {peakEntry && (
          <p className="text-orange-500">
            Highest response time: <strong>'{peakEntry.name}'</strong> at {peakEntry.compare!.avg_response_time.toFixed(2)}s
            {rtChange && <span className="text-slate-500 ml-2">|&nbsp; {rtChange}</span>}
          </p>
        )}
        {maxRegrEntry && maxRegrVal != null && maxRegrVal > 0 && (
          <p className="text-red-600">
            Largest regression: <strong>'{maxRegrEntry.name}'</strong> increased by +{maxRegrVal.toFixed(2)}s
          </p>
        )}
        {bestImpEntry && bestImpVal != null && bestImpVal > 0 && (
          <p className="text-emerald-600">
            Best improvement: <strong>'{bestImpEntry.name}'</strong> decreased by {bestImpVal.toFixed(2)}s
          </p>
        )}
        <p className={clsx('font-bold', regressions > improvements ? 'text-red-600' : 'text-emerald-600')}>
          {verdict}
        </p>
      </div>

      {/* ── TEST-LEVEL METRICS TABLE ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-header w-1/4">Test-Level Metrics Comparison</th>
              <th className="table-header text-center w-1/4 text-indigo-600" title={baseline.name}>{baseline.name}</th>
              <th className="table-header text-center w-1/4 text-amber-600" title={compare.name}>{compare.name}</th>
              <th className="table-header text-center w-1/4">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableRows.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-5 py-3 font-medium text-slate-700">{row.label}</td>
                <td className="px-5 py-3 text-center font-semibold text-indigo-600">{row.base}</td>
                <td className="px-5 py-3 text-center font-semibold text-amber-600">{row.cmp}</td>
                <td className={clsx('px-5 py-3 text-center font-semibold', row.change.cls)}>{row.change.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}


export default function Comparison() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [subprojects, setSubprojects] = useState<SubProject[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSubproject, setSelectedSubproject] = useState('');
  const [baselineId, setBaselineId] = useState(searchParams.get('baseline') || '');
  const [compareId, setCompareId] = useState(searchParams.get('compare') || '');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'response-time' | 'throughput' | 'error-rate' | 'charts'>('response-time');
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    getProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      getSubProjects(Number(selectedProject)).then(setSubprojects).catch(console.error);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedSubproject) {
      getTestRuns(Number(selectedSubproject)).then(setTestRuns).catch(console.error);
    }
  }, [selectedSubproject]);

  // Auto-run if URL params provided
  useEffect(() => {
    const b = searchParams.get('baseline');
    const c = searchParams.get('compare');
    if (b && c) {
      setBaselineId(b);
      setCompareId(c);
      runComparison(b, c);
    }
  }, []);

  const runComparison = async (bId = baselineId, cId = compareId) => {
    if (!bId || !cId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await getComparison(Number(bId), Number(cId));
      setResult(res);
      setSearchParams({ baseline: bId, compare: cId });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try { return format(parseISO(d), 'MMM dd, yyyy'); } catch { return d; }
  };

  const goodRuns = testRuns.filter((t) => t.status === 'good');
  const otherRuns = testRuns.filter((t) => t.status !== 'good');

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compare Tests</h1>
          <p className="text-slate-500 mt-1">Compare two test runs side-by-side for detailed performance insights</p>
        </div>
        {result && (
          <button
            onClick={async () => {
              setPdfLoading(true);
              try {
                let trendSummary: TrendSummaryPoint[] = [];
                try {
                  const spId = result.baseline.sub_project_id || result.compare.sub_project_id;
                  if (spId) {
                    const overview = await getTrends(spId) as TrendsOverview;
                    trendSummary = overview.testRunSummary || [];
                  }
                } catch { /* silently skip trends if unavailable */ }
                await Promise.resolve(generateComparisonPDF(result, trendSummary));
              } finally {
                setPdfLoading(false);
              }
            }}
            disabled={pdfLoading}
            className="btn-secondary flex-shrink-0"
          >
            {pdfLoading
              ? <span className="inline-block w-4 h-4 border-2 border-slate-400/40 border-t-slate-600 rounded-full animate-spin" />
              : <ArrowDownTrayIcon className="w-4 h-4" />}
            {pdfLoading ? 'Generating…' : 'Export PDF Report'}
          </button>
        )}
      </div>

      {/* Selector */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Select Test Runs to Compare</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Project</label>
            <select
              className="form-select"
              value={selectedProject}
              onChange={(e) => { setSelectedProject(e.target.value); setSelectedSubproject(''); setTestRuns([]); setBaselineId(''); setCompareId(''); }}
            >
              <option value="">Select project...</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Sub-Project</label>
            <select
              className="form-select"
              value={selectedSubproject}
              onChange={(e) => { setSelectedSubproject(e.target.value); setBaselineId(''); setCompareId(''); }}
              disabled={!selectedProject}
            >
              <option value="">Select sub-project...</option>
              {subprojects.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Baseline (Good tests first)</label>
            <select
              className="form-select"
              value={baselineId}
              onChange={(e) => { setBaselineId(e.target.value); setCompareId(''); }}
              disabled={!selectedSubproject}
            >
              <option value="">Select baseline...</option>
              {goodRuns.length > 0 && (
                <optgroup label="Good Tests">
                  {goodRuns.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} — {formatDate(t.execution_date)}</option>
                  ))}
                </optgroup>
              )}
              {otherRuns.length > 0 && (
                <optgroup label="Other Tests">
                  {otherRuns.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} — {formatDate(t.execution_date)} ({t.status})</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label className="form-label">Compare Against</label>
            <select
              className="form-select"
              value={compareId}
              onChange={(e) => setCompareId(e.target.value)}
              disabled={!baselineId}
            >
              <option value="">Select test run...</option>
              {testRuns
                .filter((t) => String(t.id) !== baselineId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {formatDate(t.execution_date)} ({t.status})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => runComparison()}
            disabled={!selectedSubproject || !baselineId || !compareId || loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <ChartBarIcon className="w-4 h-4" />
                Run Comparison
                <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Test Run Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5 border-l-4 border-indigo-400">
              <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Baseline</div>
              <div className="font-bold text-slate-900 text-lg">{result.baseline.name}</div>
              <div className="text-sm text-slate-500 mt-1">
                {result.baseline.project_name} / {result.baseline.subproject_name}
              </div>
              <div className="flex gap-4 mt-3 text-sm text-slate-600">
                <span>Build: {result.baseline.build || '—'}</span>
                <span>Load: {result.baseline.user_load ?? '—'} VUs</span>
                <span>{result.baseline.test_tool}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">{formatDate(result.baseline.execution_date)}</div>
            </div>
            <div className="card p-5 border-l-4 border-amber-400">
              <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Comparison</div>
              <div className="font-bold text-slate-900 text-lg">{result.compare.name}</div>
              <div className="text-sm text-slate-500 mt-1">
                {result.compare.project_name} / {result.compare.subproject_name}
              </div>
              <div className="flex gap-4 mt-3 text-sm text-slate-600">
                <span>Build: {result.compare.build || '—'}</span>
                <span>Load: {result.compare.user_load ?? '—'} VUs</span>
                <span>{result.compare.test_tool}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">{formatDate(result.compare.execution_date)}</div>
            </div>
          </div>

          {/* Executive Summary */}
          <ExecutiveSummary result={result} />

          {/* Insights */}
          {result.insights.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Insights ({result.insights.length})
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {result.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="card">
            <div className="flex border-b border-slate-200 px-6 overflow-x-auto">
              {(
                [
                  { key: 'response-time', label: 'Response Times' },
                  { key: 'throughput',    label: 'Throughput' },
                  { key: 'error-rate',    label: 'Error Rate' },
                  { key: 'charts',        label: 'Charts' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={clsx(
                    'py-3 px-1 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                    activeTab === key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'response-time' && (
              <ResponseTimeTable
                comparisons={result.transactionComparisons}
                baselineName={result.baseline.name}
                compareName={result.compare.name}
              />
            )}

            {activeTab === 'throughput' && (
              <ThroughputTable
                comparisons={result.transactionComparisons}
                baselineName={result.baseline.name}
                compareName={result.compare.name}
              />
            )}

            {activeTab === 'error-rate' && (
              <ErrorRateTable
                comparisons={result.transactionComparisons}
                baselineName={result.baseline.name}
                compareName={result.compare.name}
              />
            )}

            {activeTab === 'charts' && (
              <div className="p-6 space-y-10">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 mb-1">Average Response Time</h3>
                  <p className="text-xs text-slate-500 mb-4">Mean response time per transaction — top 15 transactions</p>
                  <AvgResponseTimeChart
                    comparisons={result.transactionComparisons}
                    baselineName={result.baseline.name}
                    compareName={result.compare.name}
                  />
                </div>
                <div className="border-t border-slate-100 pt-8">
                  <h3 className="text-base font-semibold text-slate-800 mb-1">90th Percentile Response Time</h3>
                  <p className="text-xs text-slate-500 mb-4">P90 response time per transaction — top 15 transactions</p>
                  <P90ResponseTimeChart
                    comparisons={result.transactionComparisons}
                    baselineName={result.baseline.name}
                    compareName={result.compare.name}
                  />
                </div>
                <div className="border-t border-slate-100 pt-8">
                  <h3 className="text-base font-semibold text-slate-800 mb-1">Throughput Comparison</h3>
                  <p className="text-xs text-slate-500 mb-4">Requests per second — top 15 transactions</p>
                  <ThroughputChart
                    comparisons={result.transactionComparisons}
                    baselineName={result.baseline.name}
                    compareName={result.compare.name}
                  />
                </div>
                <div className="border-t border-slate-100 pt-8">
                  <h3 className="text-base font-semibold text-slate-800 mb-1">Error Rate Comparison</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Transactions with errors shown first (sorted by highest error rate). Dashed line marks the 1% threshold.
                    Hover a bar for error count details.
                  </p>
                  <ErrorRateChart
                    comparisons={result.transactionComparisons}
                    baselineName={result.baseline.name}
                    compareName={result.compare.name}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="card p-12 text-center">
          <ChartBarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No Comparison Selected</h3>
          <p className="text-slate-500 text-sm">Select a project and sub-project, then choose two test runs from the same sub-project to compare.</p>
        </div>
      )}
    </div>
  );
}
