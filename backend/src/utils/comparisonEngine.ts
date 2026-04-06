export interface TransactionRow {
  id: number;
  test_run_id: number;
  name: string;
  samples: number;
  avg_response_time: number;
  min_response_time: number;
  max_response_time: number;
  p90_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  error_rate: number;
  throughput: number;
  kb_per_sec: number;
}

export interface TransactionComparison {
  name: string;
  baseline: TransactionRow | null;
  compare: TransactionRow | null;
  diffs: {
    avg_response_time: number | null;
    p90_response_time: number | null;
    p99_response_time: number | null;
    throughput: number | null;
    error_rate: number | null;
  };
  statuses: {
    avg_response_time: 'regression' | 'improvement' | 'neutral' | 'new' | 'missing';
    p90_response_time: 'regression' | 'improvement' | 'neutral' | 'new' | 'missing';
    throughput: 'regression' | 'improvement' | 'neutral' | 'new' | 'missing';
    error_rate: 'regression' | 'improvement' | 'neutral' | 'new' | 'missing';
  };
  overallStatus: 'regression' | 'improvement' | 'neutral' | 'new' | 'missing';
}

export interface Insight {
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  transactionName?: string;
  metric?: string;
  diff?: number;
}

export interface ComparisonEngineResult {
  transactionComparisons: TransactionComparison[];
  insights: Insight[];
  overallScore: number;
  summary: {
    totalTransactions: number;
    regressions: number;
    improvements: number;
    neutral: number;
    newTransactions: number;
    missingTransactions: number;
  };
}

function pctDiff(baseline: number, compare: number): number | null {
  if (baseline === 0 && compare === 0) return 0;
  if (baseline === 0) return null;
  return ((compare - baseline) / baseline) * 100;
}

// For response time: positive % = regression; for throughput: negative % = regression
function responseTimeStatus(diff: number | null): 'regression' | 'improvement' | 'neutral' {
  if (diff === null) return 'neutral';
  if (diff > 10) return 'regression';
  if (diff < -10) return 'improvement';
  return 'neutral';
}

function throughputStatus(diff: number | null): 'regression' | 'improvement' | 'neutral' {
  if (diff === null) return 'neutral';
  if (diff < -10) return 'regression';
  if (diff > 10) return 'improvement';
  return 'neutral';
}

function errorRateStatus(diff: number | null): 'regression' | 'improvement' | 'neutral' {
  if (diff === null) return 'neutral';
  // Absolute increase in error rate is bad
  if (diff > 5) return 'regression';
  if (diff < -5) return 'improvement';
  return 'neutral';
}

export function runComparison(
  baselineTransactions: TransactionRow[],
  compareTransactions: TransactionRow[]
): ComparisonEngineResult {
  const baselineMap = new Map<string, TransactionRow>();
  const compareMap = new Map<string, TransactionRow>();

  for (const t of baselineTransactions) baselineMap.set(t.name, t);
  for (const t of compareTransactions) compareMap.set(t.name, t);

  const allNames = new Set([...baselineMap.keys(), ...compareMap.keys()]);
  const transactionComparisons: TransactionComparison[] = [];
  const insights: Insight[] = [];

  let regressionCount = 0;
  let improvementCount = 0;
  let neutralCount = 0;
  let newCount = 0;
  let missingCount = 0;
  let scoreDeduction = 0;

  for (const name of allNames) {
    const baseline = baselineMap.get(name) || null;
    const compare = compareMap.get(name) || null;

    if (!baseline && compare) {
      transactionComparisons.push({
        name,
        baseline: null,
        compare,
        diffs: { avg_response_time: null, p90_response_time: null, p99_response_time: null, throughput: null, error_rate: null },
        statuses: { avg_response_time: 'new', p90_response_time: 'new', throughput: 'new', error_rate: 'new' },
        overallStatus: 'new',
      });
      newCount++;
      insights.push({
        severity: 'info',
        title: 'New Transaction',
        message: `Transaction "${name}" is new in the comparison test run.`,
        transactionName: name,
      });
      continue;
    }

    if (baseline && !compare) {
      transactionComparisons.push({
        name,
        baseline,
        compare: null,
        diffs: { avg_response_time: null, p90_response_time: null, p99_response_time: null, throughput: null, error_rate: null },
        statuses: { avg_response_time: 'missing', p90_response_time: 'missing', throughput: 'missing', error_rate: 'missing' },
        overallStatus: 'missing',
      });
      missingCount++;
      insights.push({
        severity: 'warning',
        title: 'Missing Transaction',
        message: `Transaction "${name}" is present in baseline but missing from comparison.`,
        transactionName: name,
      });
      continue;
    }

    if (!baseline || !compare) continue;

    const avgDiff = pctDiff(baseline.avg_response_time, compare.avg_response_time);
    const p90Diff = pctDiff(baseline.p90_response_time, compare.p90_response_time);
    const p99Diff = pctDiff(baseline.p99_response_time, compare.p99_response_time);
    const tpDiff = pctDiff(baseline.throughput, compare.throughput);
    const errDiff = compare.error_rate - baseline.error_rate;
    const errDiffPct = baseline.error_rate !== 0
      ? ((compare.error_rate - baseline.error_rate) / baseline.error_rate) * 100
      : compare.error_rate > 0 ? 100 : 0;

    const avgStatus = responseTimeStatus(avgDiff);
    const p90Status = responseTimeStatus(p90Diff);
    const tpStatus = throughputStatus(tpDiff);
    const errStatus = errorRateStatus(errDiff);

    // Determine overall status based on avg, p90, throughput and error rate
    const statusValues = [avgStatus, p90Status, tpStatus, errStatus];
    let overallStatus: 'regression' | 'improvement' | 'neutral' = 'neutral';
    if (statusValues.includes('regression')) {
      overallStatus = 'regression';
    } else if (statusValues.filter((s) => s === 'improvement').length >= 2) {
      overallStatus = 'improvement';
    }

    if (overallStatus === 'regression') regressionCount++;
    else if (overallStatus === 'improvement') improvementCount++;
    else neutralCount++;

    transactionComparisons.push({
      name,
      baseline,
      compare,
      diffs: {
        avg_response_time: avgDiff,
        p90_response_time: p90Diff,
        p99_response_time: p99Diff,
        throughput: tpDiff,
        error_rate: errDiffPct,
      },
      statuses: {
        avg_response_time: avgStatus,
        p90_response_time: p90Status,
        throughput: tpStatus,
        error_rate: errStatus,
      },
      overallStatus,
    });

    // Generate insights
    if (avgStatus === 'regression' && avgDiff !== null) {
      const severity = avgDiff > 50 ? 'critical' : avgDiff > 25 ? 'warning' : 'info';
      scoreDeduction += avgDiff > 50 ? 10 : avgDiff > 25 ? 5 : 2;
      insights.push({
        severity,
        title: 'Response Time Regression',
        message: `"${name}" avg response time increased by ${avgDiff.toFixed(1)}% (${baseline.avg_response_time.toFixed(3)}s → ${compare.avg_response_time.toFixed(3)}s)`,
        transactionName: name,
        metric: 'avg_response_time',
        diff: avgDiff,
      });
    }

    if (p90Status === 'regression' && p90Diff !== null) {
      const severity = p90Diff > 50 ? 'critical' : 'warning';
      scoreDeduction += p90Diff > 50 ? 8 : 3;
      insights.push({
        severity,
        title: 'P90 Regression',
        message: `"${name}" P90 response time increased by ${p90Diff.toFixed(1)}% (${baseline.p90_response_time.toFixed(3)}s → ${compare.p90_response_time.toFixed(3)}s)`,
        transactionName: name,
        metric: 'p90_response_time',
        diff: p90Diff,
      });
    }

    if (tpStatus === 'regression' && tpDiff !== null) {
      scoreDeduction += 5;
      insights.push({
        severity: 'warning',
        title: 'Throughput Regression',
        message: `"${name}" throughput decreased by ${Math.abs(tpDiff).toFixed(1)}% (${baseline.throughput.toFixed(2)} → ${compare.throughput.toFixed(2)} req/s)`,
        transactionName: name,
        metric: 'throughput',
        diff: tpDiff,
      });
    }

    if (errStatus === 'regression') {
      scoreDeduction += 8;
      insights.push({
        severity: 'critical',
        title: 'Error Rate Increase',
        message: `"${name}" error rate increased from ${baseline.error_rate.toFixed(2)}% to ${compare.error_rate.toFixed(2)}% (+${errDiff.toFixed(2)}%)`,
        transactionName: name,
        metric: 'error_rate',
        diff: errDiff,
      });
    }

    if (avgStatus === 'improvement' && avgDiff !== null) {
      insights.push({
        severity: 'success',
        title: 'Response Time Improvement',
        message: `"${name}" avg response time improved by ${Math.abs(avgDiff).toFixed(1)}% (${baseline.avg_response_time.toFixed(3)}s → ${compare.avg_response_time.toFixed(3)}s)`,
        transactionName: name,
        metric: 'avg_response_time',
        diff: avgDiff,
      });
    }

    if (tpStatus === 'improvement' && tpDiff !== null) {
      insights.push({
        severity: 'success',
        title: 'Throughput Improvement',
        message: `"${name}" throughput increased by ${tpDiff.toFixed(1)}% (${baseline.throughput.toFixed(2)} → ${compare.throughput.toFixed(2)} req/s)`,
        transactionName: name,
        metric: 'throughput',
        diff: tpDiff,
      });
    }
  }

  // Sort comparisons: regressions first, then improvements, then neutral
  transactionComparisons.sort((a, b) => {
    const order = { regression: 0, missing: 1, improvement: 2, neutral: 3, new: 4 };
    return (order[a.overallStatus] ?? 5) - (order[b.overallStatus] ?? 5);
  });

  // Sort insights: critical first
  insights.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2, success: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  const overallScore = Math.max(0, Math.min(100, 100 - scoreDeduction));

  return {
    transactionComparisons,
    insights,
    overallScore,
    summary: {
      totalTransactions: allNames.size,
      regressions: regressionCount,
      improvements: improvementCount,
      neutral: neutralCount,
      newTransactions: newCount,
      missingTransactions: missingCount,
    },
  };
}
