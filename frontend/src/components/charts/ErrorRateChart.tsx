import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TransactionComparison } from '../../types';

interface ErrorRateChartProps {
  comparisons: TransactionComparison[];
  baselineName: string;
  compareName: string;
  maxItems?: number;
}

export default function ErrorRateChart({
  comparisons,
  baselineName,
  compareName,
  maxItems = 15,
}: ErrorRateChartProps) {
  const bKey = `${baselineName} Err%`;
  const cKey = `${compareName} Err%`;

  // Show transactions with errors first, sorted by highest error rate descending.
  // Fall back to top N by order if none have errors.
  const withErrors = comparisons
    .filter((c) => (c.baseline?.error_rate ?? 0) > 0 || (c.compare?.error_rate ?? 0) > 0)
    .sort(
      (a, b) =>
        Math.max(b.baseline?.error_rate ?? 0, b.compare?.error_rate ?? 0) -
        Math.max(a.baseline?.error_rate ?? 0, a.compare?.error_rate ?? 0)
    )
    .slice(0, maxItems);

  const source = withErrors.length > 0 ? withErrors : comparisons.slice(0, maxItems);

  const data = source.map((c) => ({
    name: c.name.length > 22 ? c.name.slice(0, 20) + '…' : c.name,
    fullName: c.name,
    [bKey]: c.baseline?.error_rate != null ? parseFloat(c.baseline.error_rate.toFixed(2)) : 0,
    [cKey]: c.compare?.error_rate  != null ? parseFloat(c.compare.error_rate.toFixed(2))  : 0,
  }));

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const full = source.find(
      (c) => c.name === label || c.name.startsWith((label ?? '').replace('…', ''))
    );
    const bCount = full
      ? Math.round((full.baseline?.samples ?? 0) * (full.baseline?.error_rate ?? 0) / 100)
      : null;
    const cCount = full
      ? Math.round((full.compare?.samples  ?? 0) * (full.compare?.error_rate  ?? 0) / 100)
      : null;

    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs max-w-xs">
        <p className="font-semibold text-slate-700 mb-2 break-words">{full?.fullName || label}</p>
        {payload.map((p) => {
          const isBaseline = p.name === bKey;
          const count = isBaseline ? bCount : cCount;
          return (
            <div key={p.name} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: p.color }} />
              <span className="text-slate-600 truncate">{p.name}:</span>
              <span className="font-medium text-red-600">{p.value.toFixed(2)}%</span>
              {count !== null && count > 0 && (
                <span className="text-slate-400">({count} errors)</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 70 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          angle={-35}
          textAnchor="end"
          interval={0}
          height={75}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickFormatter={(v) => `${v}%`}
          label={{
            value: 'Error Rate (%)',
            angle: -90,
            position: 'insideLeft',
            offset: 0,
            style: { fontSize: 11, fill: '#64748b' },
          }}
        />
        <ReferenceLine
          y={1}
          stroke="#f87171"
          strokeDasharray="4 3"
          label={{ value: '1%', fontSize: 10, fill: '#ef4444', position: 'right' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
        <Bar dataKey={bKey} fill="#f97316" radius={[4, 4, 0, 0]} />
        <Bar dataKey={cKey} fill="#fca5a5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
