import { useState } from 'react';
import { TransactionComparison, ComparisonStatus } from '../types';
import clsx from 'clsx';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface ComparisonTableProps {
  comparisons: TransactionComparison[];
  baselineName: string;
  compareName: string;
}

type SortDir = 'asc' | 'desc';

// ── Shared helpers ────────────────────────────────────────────────────────────

function statusBg(status: ComparisonStatus): string {
  switch (status) {
    case 'regression':  return 'bg-red-50';
    case 'improvement': return 'bg-emerald-50';
    case 'missing':     return 'bg-amber-50';
    case 'new':         return 'bg-blue-50';
    default:            return '';
  }
}

function diffCell(diff: number | null, status: ComparisonStatus): JSX.Element {
  if (diff === null) return <span className="text-slate-400">—</span>;
  const color =
    status === 'regression'  ? 'text-red-700 font-semibold' :
    status === 'improvement' ? 'text-emerald-700 font-semibold' :
    'text-slate-600';
  const prefix = diff > 0 ? '+' : '';
  return <span className={color}>{prefix}{diff.toFixed(2)}%</span>;
}

function statusBadge(status: ComparisonStatus): JSX.Element {
  const config = {
    regression:  'bg-red-100 text-red-800',
    improvement: 'bg-emerald-100 text-emerald-800',
    neutral:     'bg-slate-100 text-slate-600',
    new:         'bg-blue-100 text-blue-800',
    missing:     'bg-amber-100 text-amber-800',
  };
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
      config[status]
    )}>
      {status}
    </span>
  );
}

function fmt(val: number | undefined | null, decimals = 2): string {
  if (val === null || val === undefined) return '—';
  return val.toFixed(decimals);
}

// Sortable-th + sort-icon wired to shared state
function useSortDir<K extends string>(initial: K) {
  const [sortKey, setSortKey] = useState<K>(initial);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: K) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: K }) =>
    sortKey !== col
      ? <ChevronUpIcon className="w-3 h-3 text-slate-300 flex-shrink-0" />
      : sortDir === 'asc'
        ? <ChevronUpIcon className="w-3 h-3 text-indigo-600 flex-shrink-0" />
        : <ChevronDownIcon className="w-3 h-3 text-indigo-600 flex-shrink-0" />;

  // Sortable header — no width here; width is set via <colgroup>
  const th = (label: string, col: K) => (
    <th
      key={col}
      className="table-header cursor-pointer select-none hover:bg-slate-100 text-center"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
        {label}
        <SortIcon col={col} />
      </div>
    </th>
  );

  return { sortKey, sortDir, th };
}

// Baseline / compare name header — truncated to one line, full name on hover
function NameTh({ name, align = 'right' }: { name: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      className={clsx('table-header', align === 'right' ? 'text-right' : 'text-center')}
      title={name}
    >
      <span className="block truncate max-w-full">{name}</span>
    </th>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="py-12 text-center text-slate-500 text-sm">
        No transactions to display
      </td>
    </tr>
  );
}

// ── Response Time Tab ─────────────────────────────────────────────────────────
// Columns: Transaction | B Avg | C Avg | Avg Diff% | B P90 | C P90 | P90 Diff% | Status
// Widths : 26%        | 10%   | 10%   | 9%        | 10%   | 10%   | 9%        | 10% + leftover → 100%
// (remaining 6% goes to transaction via auto)

type RTSortKey = 'name' | 'avg_diff' | 'p90_diff' | 'status';

export function ResponseTimeTable({ comparisons, baselineName, compareName }: ComparisonTableProps) {
  const { sortKey, sortDir, th } = useSortDir<RTSortKey>('status');

  const sorted = [...comparisons].sort((a, b) => {
    let vA: number | string, vB: number | string;
    switch (sortKey) {
      case 'name':     vA = a.name; vB = b.name; break;
      case 'avg_diff': vA = a.diffs.avg_response_time ?? 999; vB = b.diffs.avg_response_time ?? 999; break;
      case 'p90_diff': vA = a.diffs.p90_response_time ?? 999; vB = b.diffs.p90_response_time ?? 999; break;
      case 'status': {
        const o = { regression: 0, missing: 1, improvement: 2, neutral: 3, new: 4 };
        vA = o[a.overallStatus] ?? 5; vB = o[b.overallStatus] ?? 5; break;
      }
      default: vA = 0; vB = 0;
    }
    if (typeof vA === 'string' && typeof vB === 'string')
      return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
    return sortDir === 'asc' ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed min-w-[820px]">
        <colgroup>
          <col style={{ width: '28%' }} />  {/* Transaction */}
          <col style={{ width: '10%' }} />  {/* Baseline Avg */}
          <col style={{ width: '10%' }} />  {/* Compare Avg */}
          <col style={{ width: '9%'  }} />  {/* Avg Diff% */}
          <col style={{ width: '10%' }} />  {/* Baseline P90 */}
          <col style={{ width: '10%' }} />  {/* Compare P90 */}
          <col style={{ width: '9%'  }} />  {/* P90 Diff% */}
          <col style={{ width: '14%' }} />  {/* Status */}
        </colgroup>
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {th('Transaction', 'name')}
            <NameTh name={`${baselineName} Avg (s)`} />
            <NameTh name={`${compareName} Avg (s)`} />
            {th('Avg Diff%', 'avg_diff')}
            <NameTh name={`${baselineName} P90 (s)`} />
            <NameTh name={`${compareName} P90 (s)`} />
            {th('P90 Diff%', 'p90_diff')}
            {th('Status', 'status')}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.length === 0
            ? <EmptyRow cols={8} />
            : sorted.map((c) => (
              <tr key={c.name} className={clsx('hover:bg-opacity-80 transition-colors', statusBg(c.overallStatus))}>
                <td className="table-cell font-medium text-slate-800 truncate" title={c.name}>{c.name}</td>
                <td className="table-cell text-right tabular-nums">{fmt(c.baseline?.avg_response_time)}</td>
                <td className="table-cell text-right tabular-nums">{fmt(c.compare?.avg_response_time)}</td>
                <td className="table-cell text-center">{diffCell(c.diffs.avg_response_time, c.statuses.avg_response_time)}</td>
                <td className="table-cell text-right tabular-nums">{fmt(c.baseline?.p90_response_time)}</td>
                <td className="table-cell text-right tabular-nums">{fmt(c.compare?.p90_response_time)}</td>
                <td className="table-cell text-center">{diffCell(c.diffs.p90_response_time, c.statuses.p90_response_time)}</td>
                <td className="table-cell text-center">{statusBadge(c.overallStatus)}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

// ── Throughput Tab ────────────────────────────────────────────────────────────
// Columns: Transaction | B TPS | C TPS | TPS Diff% | Status
// Widths : 40%        | 16%   | 16%   | 14%       | 14%

type TPSSortKey = 'name' | 'throughput_diff' | 'status';

export function ThroughputTable({ comparisons, baselineName, compareName }: ComparisonTableProps) {
  const { sortKey, sortDir, th } = useSortDir<TPSSortKey>('status');

  const sorted = [...comparisons].sort((a, b) => {
    let vA: number | string, vB: number | string;
    switch (sortKey) {
      case 'name':            vA = a.name; vB = b.name; break;
      case 'throughput_diff': vA = a.diffs.throughput ?? 999; vB = b.diffs.throughput ?? 999; break;
      case 'status': {
        const o = { regression: 0, missing: 1, improvement: 2, neutral: 3, new: 4 };
        vA = o[a.overallStatus] ?? 5; vB = o[b.overallStatus] ?? 5; break;
      }
      default: vA = 0; vB = 0;
    }
    if (typeof vA === 'string' && typeof vB === 'string')
      return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
    return sortDir === 'asc' ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed min-w-[560px]">
        <colgroup>
          <col style={{ width: '40%' }} />  {/* Transaction */}
          <col style={{ width: '16%' }} />  {/* Baseline TPS */}
          <col style={{ width: '16%' }} />  {/* Compare TPS */}
          <col style={{ width: '14%' }} />  {/* TPS Diff% */}
          <col style={{ width: '14%' }} />  {/* Status */}
        </colgroup>
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {th('Transaction', 'name')}
            <NameTh name={`${baselineName} TPS`} />
            <NameTh name={`${compareName} TPS`} />
            {th('TPS Diff%', 'throughput_diff')}
            {th('Status', 'status')}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.length === 0
            ? <EmptyRow cols={5} />
            : sorted.map((c) => (
              <tr key={c.name} className={clsx('hover:bg-opacity-80 transition-colors', statusBg(c.overallStatus))}>
                <td className="table-cell font-medium text-slate-800 truncate" title={c.name}>{c.name}</td>
                <td className="table-cell text-right tabular-nums">{fmt(c.baseline?.throughput, 2)}</td>
                <td className="table-cell text-right tabular-nums">{fmt(c.compare?.throughput, 2)}</td>
                <td className="table-cell text-center">{diffCell(c.diffs.throughput, c.statuses.throughput)}</td>
                <td className="table-cell text-center">{statusBadge(c.overallStatus)}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

// ── Error Rate Tab ────────────────────────────────────────────────────────────
// Columns: Transaction | B Err% | C Err% | Err% Diff | Status
// Widths : 40%        | 16%    | 16%    | 14%       | 14%

type ErrSortKey = 'name' | 'error_rate_diff' | 'status';

export function ErrorRateTable({ comparisons, baselineName, compareName }: ComparisonTableProps) {
  const { sortKey, sortDir, th } = useSortDir<ErrSortKey>('status');

  const sorted = [...comparisons].sort((a, b) => {
    let vA: number | string, vB: number | string;
    switch (sortKey) {
      case 'name':            vA = a.name; vB = b.name; break;
      case 'error_rate_diff': vA = a.diffs.error_rate ?? 999; vB = b.diffs.error_rate ?? 999; break;
      case 'status': {
        const o = { regression: 0, missing: 1, improvement: 2, neutral: 3, new: 4 };
        vA = o[a.overallStatus] ?? 5; vB = o[b.overallStatus] ?? 5; break;
      }
      default: vA = 0; vB = 0;
    }
    if (typeof vA === 'string' && typeof vB === 'string')
      return sortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
    return sortDir === 'asc' ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed min-w-[560px]">
        <colgroup>
          <col style={{ width: '40%' }} />  {/* Transaction */}
          <col style={{ width: '16%' }} />  {/* Baseline Err% */}
          <col style={{ width: '16%' }} />  {/* Compare Err% */}
          <col style={{ width: '14%' }} />  {/* Err% Diff */}
          <col style={{ width: '14%' }} />  {/* Status */}
        </colgroup>
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {th('Transaction', 'name')}
            <NameTh name={`${baselineName} Err%`} />
            <NameTh name={`${compareName} Err%`} />
            {th('Err% Diff', 'error_rate_diff')}
            {th('Status', 'status')}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.length === 0
            ? <EmptyRow cols={5} />
            : sorted.map((c) => (
              <tr key={c.name} className={clsx('hover:bg-opacity-80 transition-colors', statusBg(c.overallStatus))}>
                <td className="table-cell font-medium text-slate-800 truncate" title={c.name}>{c.name}</td>
                <td className={clsx('table-cell text-right tabular-nums',
                  (c.baseline?.error_rate ?? 0) > 0 ? 'text-red-600 font-medium' : '')}>
                  {fmt(c.baseline?.error_rate, 2)}%
                </td>
                <td className={clsx('table-cell text-right tabular-nums',
                  (c.compare?.error_rate ?? 0) > 0 ? 'text-red-600 font-medium' : '')}>
                  {fmt(c.compare?.error_rate, 2)}%
                </td>
                <td className="table-cell text-center">{diffCell(c.diffs.error_rate, c.statuses.error_rate)}</td>
                <td className="table-cell text-center">{statusBadge(c.overallStatus)}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

// ── Default export ────────────────────────────────────────────────────────────

export default function ComparisonTable({ comparisons, baselineName, compareName }: ComparisonTableProps) {
  return <ResponseTimeTable comparisons={comparisons} baselineName={baselineName} compareName={compareName} />;
}
