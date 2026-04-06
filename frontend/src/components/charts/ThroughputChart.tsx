import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TransactionComparison } from '../../types';

interface ThroughputChartProps {
  comparisons: TransactionComparison[];
  baselineName: string;
  compareName: string;
  maxItems?: number;
}

export default function ThroughputChart({
  comparisons,
  baselineName,
  compareName,
  maxItems = 15,
}: ThroughputChartProps) {
  const bKey = `${baselineName} TPS`;
  const cKey = `${compareName} TPS`;

  const data = comparisons
    .filter((c) => c.baseline || c.compare)
    .slice(0, maxItems)
    .map((c) => ({
      name: c.name.length > 22 ? c.name.slice(0, 20) + '…' : c.name,
      fullName: c.name,
      [bKey]: c.baseline?.throughput ? parseFloat(c.baseline.throughput.toFixed(2)) : 0,
      [cKey]: c.compare?.throughput  ? parseFloat(c.compare.throughput.toFixed(2))  : 0,
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
    const full = comparisons.find((c) =>
      c.name === label || c.name.startsWith((label ?? '').replace('…', ''))
    );
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs max-w-xs">
        <p className="font-semibold text-slate-700 mb-2 break-words">{full?.name || label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: p.color }} />
            <span className="text-slate-600 truncate">{p.name}:</span>
            <span className="font-medium">{p.value.toFixed(2)} req/s</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
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
          label={{ value: 'req/s', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
        <Bar dataKey={bKey} fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey={cKey} fill="#34d399" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
