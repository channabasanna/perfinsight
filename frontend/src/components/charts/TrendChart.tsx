import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';

export interface TrendDataItem {
  execution_date: string;
  test_run_name: string;
  build?: string;
  user_load?: number;
  status?: string;
  avg_response_time?: number;
  p90_response_time?: number;
  p95_response_time?: number;
  p99_response_time?: number;
  throughput?: number;
  error_rate?: number;
  samples?: number;
  kb_per_sec?: number;
  [key: string]: unknown;
}

interface TrendChartProps {
  data: TrendDataItem[];
  lines: Array<{
    key: string;
    label: string;
    color: string;
    unit?: string;
  }>;
  title: string;
  yAxisLabel?: string;
  height?: number;
}

// Status → dot fill color
const STATUS_COLOR: Record<string, string> = {
  good:         '#10b981', // emerald-500
  bad:          '#ef4444', // red-500
  pending:      '#f59e0b', // amber-500
  under_review: '#94a3b8', // slate-400
};

const STATUS_LABEL: Record<string, string> = {
  good:         'Good',
  bad:          'Bad',
  pending:      'Pending',
  under_review: 'Under Review',
};

function statusDotColor(status: string | undefined): string {
  return STATUS_COLOR[status ?? ''] ?? '#94a3b8';
}

export default function TrendChart({ data, lines, title, yAxisLabel, height = 280 }: TrendChartProps) {
  const chartData = data.map((d, i) => {
    const dateLabel = (() => {
      try { return format(parseISO(d.execution_date), 'MM/dd/yy'); }
      catch { return d.execution_date.slice(0, 10); }
    })();
    return { ...d, _dateLabel: dateLabel, _index: i };
  });

  // Collect which statuses are actually present in this data
  const presentStatuses = Array.from(
    new Set(data.map((d) => d.status ?? 'pending').filter(Boolean))
  ).sort((a, b) => {
    const order: Record<string, number> = { good: 0, bad: 1, pending: 2, under_review: 3 };
    return (order[a] ?? 9) - (order[b] ?? 9);
  });

  // Only show the status legend when there are multiple statuses (i.e. filter=all)
  const showStatusLegend = presentStatuses.length > 1 || (presentStatuses.length === 1 && presentStatuses[0] !== 'good');

  // Custom two-line X-axis tick: name on top, date below
  const CustomXTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) => {
    const item = chartData.find((d) => d._index === payload?.value);
    if (!item) return null;
    const name = (item.test_run_name as string) || '';
    const shortName = name.length > 16 ? name.slice(0, 15) + '…' : name;
    const dotColor = statusDotColor(item.status as string | undefined);
    return (
      <g transform={`translate(${x},${y})`}>
        {/* small status indicator square under label */}
        <rect x={-4} y={28} width={8} height={4} rx={2} fill={dotColor} opacity={0.85} />
        <text x={0} y={0} dy={12} textAnchor="middle" fill="#475569" fontSize={10} fontWeight={500}>
          {shortName}
        </text>
        <text x={0} y={0} dy={24} textAnchor="middle" fill="#94a3b8" fontSize={9}>
          {item._dateLabel as string}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string; unit?: string }>;
    label?: number;
  }) => {
    if (active && payload && payload.length) {
      const item = chartData.find((d) => d._index === label);
      const status = item?.status as string | undefined;
      const dotColor = statusDotColor(status);
      return (
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs max-w-xs">
          <p className="font-semibold text-slate-700 mb-1">{item?.test_run_name || ''}</p>
          {item?._dateLabel && <p className="text-slate-500 mb-1">{item._dateLabel as string}</p>}
          {item?.build && <p className="text-slate-500 mb-1">Build: {String(item.build)}</p>}
          {status && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: dotColor }} />
              <span
                className="font-medium capitalize"
                style={{ color: dotColor }}
              >
                {STATUS_LABEL[status] ?? status}
              </span>
            </div>
          )}
          {payload.map((p) => (
            <div key={p.name} className="flex items-center gap-2 mt-0.5">
              <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
              <span className="text-slate-600">{p.name}:</span>
              <span className="font-medium">
                {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
                {p.unit ? ` ${p.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom dot renderer — color by status, not by line color
  const makeStatusDot = (lineColor: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => {
      const { cx, cy, index } = props;
      if (cx == null || cy == null) return <g />;
      const item = chartData[index];
      const status = item?.status as string | undefined;
      const fill = statusDotColor(status);
      return (
        <circle
          key={`dot-${index}`}
          cx={cx}
          cy={cy}
          r={5}
          fill={fill}
          stroke={lineColor}
          strokeWidth={1.5}
        />
      );
    };

  const makeActiveDot = (lineColor: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => {
      const { cx, cy, index } = props;
      if (cx == null || cy == null) return <g />;
      const item = chartData[index];
      const status = item?.status as string | undefined;
      const fill = statusDotColor(status);
      return (
        <circle
          key={`adot-${index}`}
          cx={cx}
          cy={cy}
          r={7}
          fill={fill}
          stroke={lineColor}
          strokeWidth={2}
        />
      );
    };

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>

        {/* Status dot legend — only shown when multiple statuses present */}
        {showStatusLegend && (
          <div className="flex items-center gap-3 flex-wrap">
            {presentStatuses.map((s) => (
              <span key={s} className="flex items-center gap-1 text-xs text-slate-600">
                <span
                  className="inline-block w-3 h-3 rounded-full border border-white shadow-sm"
                  style={{ background: STATUS_COLOR[s] ?? '#94a3b8' }}
                />
                {STATUS_LABEL[s] ?? s}
              </span>
            ))}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="_index"
            tick={<CustomXTick />}
            height={60}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            label={
              yAxisLabel
                ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' }, offset: -5 }
                : undefined
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={makeStatusDot(line.color)}
              activeDot={makeActiveDot(line.color)}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
