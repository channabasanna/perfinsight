import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComparisonResult, TransactionComparison, TrendSummaryPoint } from '../types';

// ── Sanitise text for jsPDF Latin-1 encoding ────────────────────────────────
// jsPDF's built-in Helvetica font only covers Latin-1 (Windows-1252).
// Any character outside that range (curly quotes, em-dash, ellipsis, etc.)
// causes the font renderer to fall back to a glyph-by-glyph path that inserts
// spaces between every character.  Replace the common offenders with safe ASCII.
function s(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")  // curly single quotes / primes
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')  // curly double quotes
    .replace(/[\u2013\u2014\u2015]/g, '-')                     // en-dash, em-dash, horizontal bar
    .replace(/\u2026/g, '...')                                  // ellipsis
    .replace(/\u00A0/g, ' ')                                    // non-breaking space
    .replace(/\u2191/g, '^')                                    // upwards arrow (↑)
    .replace(/\u2193/g, 'v')                                    // downwards arrow (↓)
    .replace(/\u25CF/g, '*')                                    // black circle bullet (●)
    .replace(/[^\x00-\xFF]/g, '?');                             // anything else outside Latin-1
}

// ── Colour palette ──────────────────────────────────────────────────────────
const C = {
  navy:       [15,  23,  42]  as [number,number,number],
  indigo:     [79,  70,  229] as [number,number,number],
  indigoLight:[224,231,255]  as [number,number,number],
  amberLight: [254,243,199]  as [number,number,number],
  amber:      [180,112,  0]  as [number,number,number],
  slate50:    [248,250,252]  as [number,number,number],
  slate200:   [226,232,240]  as [number,number,number],
  slate500:   [100,116,139]  as [number,number,number],
  slate700:   [51,  65,  85] as [number,number,number],
  slate900:   [15,  23,  42] as [number,number,number],
  red:        [220, 38,  38] as [number,number,number],
  redLight:   [254,226,226]  as [number,number,number],
  green:      [5,  150,105]  as [number,number,number],
  greenLight: [209,250,229]  as [number,number,number],
  orange:     [234, 88,  12] as [number,number,number],
  white:      [255,255,255]  as [number,number,number],
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const avgOf = (vals: (number | null | undefined)[]): number | null => {
  const nums = vals.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
};

const fmt3 = (v: number | null) => v != null ? v.toFixed(2) + ' s' : '-';
const fmt2 = (v: number | null) => v != null ? v.toFixed(2) : '-';
const fmtPct = (v: number | null) => v != null ? v.toFixed(2) + '%' : '-';

function absChangeText(base: number, cmp: number, lowerIsBetter: boolean, decimals: number, unit: string) {
  const d = cmp - base;
  if (d === 0) return '● No change';
  const worse = lowerIsBetter ? d > 0 : d < 0;
  const arrow = d > 0 ? '↑' : '↓';
  const sign  = d > 0 ? '+' : '';
  const val   = decimals === 0 ? Math.abs(Math.round(d)).toLocaleString() : Math.abs(d).toFixed(decimals);
  const label = worse ? ' (worse)' : ' (better)';
  return `${arrow} ${sign}${val}${unit}${label}`;
}

function absChangeColor(base: number, cmp: number, lowerIsBetter: boolean): [number,number,number] {
  const d = cmp - base;
  if (d === 0) return C.slate500;
  const worse = lowerIsBetter ? d > 0 : d < 0;
  return worse ? C.red : C.green;
}

// ── Section header ───────────────────────────────────────────────────────────
function sectionHeader(doc: jsPDF, title: string, y: number, pageW: number): number {
  doc.setFillColor(...C.slate50);
  doc.setDrawColor(...C.slate200);
  doc.rect(14, y, pageW - 28, 9, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.slate900);
  doc.text(title.toUpperCase(), 17, y + 6.2);
  return y + 13;
}

// ── Page header / footer ────────────────────────────────────────────────────
function addPageHeader(doc: jsPDF, pageW: number, baselineName: string, compareName: string) {
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text('PerfInsight - Performance Comparison Report', 14, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 190, 210);
  doc.text(s(`${baselineName}  vs  ${compareName}`), pageW - 14, 12, { align: 'right' });
}

function addPageFooter(doc: jsPDF, pageW: number, pageH: number, pageNum: number, totalPages: number) {
  doc.setDrawColor(...C.slate200);
  doc.line(14, pageH - 10, pageW - 14, pageH - 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.slate500);
  doc.text(`Generated by PerfInsight  ·  ${new Date().toLocaleString()}`, 14, pageH - 5);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 5, { align: 'right' });
}

// ── Status dot colour ────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, [number,number,number]> = {
  good:         [16,  185, 129],
  bad:          [239,  68,  68],
  pending:      [245, 158,  11],
  under_review: [148, 163, 184],
};
function dotColor(status: string): [number,number,number] {
  return STATUS_DOT[status] ?? [148, 163, 184];
}

// ── Thin line-chart renderer (single or dual series) ─────────────────────────
interface ChartSeries {
  values: (number | null)[];
  color: [number,number,number];
  label: string;
}

function drawLineChart(
  doc: jsPDF,
  bx: number, by: number, bw: number, bh: number,
  title: string,
  yUnit: string,
  series: ChartSeries[],
  statuses: string[],
  xLabels: string[],
  dateLabels: string[],
) {
  const pl = 22, pr = 6, pt = 14, pb = 28;
  const cx = bx + pl, cy = by + pt, cw = bw - pl - pr, ch = bh - pt - pb;

  // Background + border
  doc.setFillColor(...C.slate50);
  doc.setDrawColor(...C.slate200);
  doc.setLineWidth(0.2);
  doc.rect(cx, cy, cw, ch, 'FD');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.slate700);
  doc.text(s(title), bx + bw / 2, by + 9, { align: 'center' });

  // Collect all non-null values across all series for scale
  const allVals = series.flatMap((sr) => sr.values.filter((v): v is number => v != null));
  if (allVals.length === 0) {
    doc.setFontSize(6.5);
    doc.setTextColor(...C.slate500);
    doc.text('No data', cx + cw / 2, cy + ch / 2, { align: 'center' });
    return;
  }

  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad    = (rawMax - rawMin) * 0.12 || rawMax * 0.1 || 0.1;
  const yMin   = Math.max(0, rawMin - pad);
  const yMax   = rawMax + pad;
  const yRange = yMax - yMin || 1;

  const toY = (v: number) => cy + ch - ((v - yMin) / yRange) * ch;
  const toX = (i: number) =>
    xLabels.length === 1 ? cx + cw / 2 : cx + (i / (xLabels.length - 1)) * cw;

  // Y-axis grid + labels (4 lines)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...C.slate500);
  for (let g = 0; g <= 4; g++) {
    const gv = yMin + (yRange / 4) * g;
    const gy = toY(gv);
    doc.setDrawColor(...C.slate200);
    doc.setLineWidth(0.15);
    doc.line(cx, gy, cx + cw, gy);
    doc.text(gv.toFixed(2), cx - 2, gy + 1.5, { align: 'right' });
  }

  // Y-axis unit label
  doc.setFontSize(5);
  doc.setTextColor(...C.slate500);
  doc.text(s(yUnit), bx + 3, cy + ch / 2, { angle: 90 });

  // Draw each series
  const n = xLabels.length;
  series.forEach((sr) => {
    // Connecting lines
    doc.setDrawColor(...sr.color);
    doc.setLineWidth(0.7);
    for (let i = 1; i < n; i++) {
      const v0 = sr.values[i - 1]; const v1 = sr.values[i];
      if (v0 == null || v1 == null) continue;
      doc.line(toX(i - 1), toY(v0), toX(i), toY(v1));
    }

    // Dots coloured by status
    for (let i = 0; i < n; i++) {
      const v = sr.values[i];
      if (v == null) continue;
      const px = toX(i); const py = toY(v);
      const dc = dotColor(statuses[i] ?? 'pending');
      doc.setFillColor(...dc);
      doc.setDrawColor(...sr.color);
      doc.setLineWidth(0.5);
      doc.circle(px, py, 1.6, 'FD');
    }
  });

  // X-axis labels: run name (top line) + date (bottom line)
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < n; i++) {
    const px = toX(i);
    const name = xLabels[i];
    const short = name.length > 14 ? name.slice(0, 13) + '\u2026' : name;
    doc.setFontSize(5);
    doc.setTextColor(...C.slate700);
    doc.text(s(short), px, cy + ch + 7, { align: 'center' });
    doc.setFontSize(4.8);
    doc.setTextColor(...C.slate500);
    doc.text(s(dateLabels[i] ?? ''), px, cy + ch + 12, { align: 'center' });

    // Small status bar under x label
    const dc = dotColor(statuses[i] ?? 'pending');
    doc.setFillColor(...dc);
    doc.setDrawColor(...dc);
    doc.rect(px - 3, cy + ch + 14, 6, 1.5, 'F');
  }

  // Series legend (bottom-right)
  let legX = cx + cw - 2;
  for (let i = series.length - 1; i >= 0; i--) {
    const sr = series[i];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.slate700);
    const lw = doc.getTextWidth(s(sr.label));
    doc.text(s(sr.label), legX, cy + ch + 22, { align: 'right' });
    legX -= lw + 10;
    doc.setDrawColor(...sr.color);
    doc.setLineWidth(0.8);
    doc.line(legX + 3, cy + ch + 21.5, legX + 8, cy + ch + 21.5);
    doc.setFillColor(...sr.color);
    doc.circle(legX + 5.5, cy + ch + 21.5, 1.2, 'F');
    legX -= 4;
  }
}

// ── Trend charts page ────────────────────────────────────────────────────────
function addTrendPage(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  trendSummary: TrendSummaryPoint[],
  baselineName: string,
  compareName: string,
) {
  doc.addPage();
  addPageHeader(doc, pageW, baselineName, compareName);
  let y = 24;
  y = sectionHeader(doc, `Performance Trend — All Releases (${trendSummary.length} runs)`, y, pageW);

  // Status legend (top-right)
  const presentStatuses = [...new Set(trendSummary.map((d) => d.status ?? 'pending'))];
  const statusLabel: Record<string, string> = { good: 'Good', bad: 'Bad', pending: 'Pending', under_review: 'Under Review' };
  let lx = pageW - 14;
  presentStatuses.forEach((st) => {
    const lbl = statusLabel[st] ?? st;
    const lw = doc.getStringUnitWidth(lbl) * 5.5 / doc.internal.scaleFactor;
    const dc = dotColor(st);
    doc.setFillColor(...dc);
    doc.circle(lx - lw - 5, y - 3.5, 1.8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.slate700);
    doc.text(lbl, lx, y - 2, { align: 'right' });
    lx -= lw + 12;
  });

  const statuses   = trendSummary.map((d) => d.status ?? 'pending');
  const xLabels    = trendSummary.map((d) => s(d.test_run_name));
  const dateLabels = trendSummary.map((d) => {
    const raw = d.execution_date ?? '';
    try { return raw.slice(0, 10); } catch { return raw; }
  });

  const marginX = 14;
  const gap     = 6;
  const chartW  = (pageW - marginX * 2 - gap) / 2;
  const chartH  = (pageH - y - 16) / 2 - gap;

  // ── Row 1: Avg & P90 RT  |  Throughput ───────────────────────────────────
  drawLineChart(
    doc,
    marginX, y, chartW, chartH,
    'Avg & P90 Response Time (s)', 'Seconds',
    [
      { values: trendSummary.map((d) => d.avg_response_time ?? null), color: [99, 102, 241],  label: 'Avg RT' },
      { values: trendSummary.map((d) => d.p90_response_time ?? null), color: [245, 158,  11], label: 'P90 RT' },
    ],
    statuses, xLabels, dateLabels,
  );
  drawLineChart(
    doc,
    marginX + chartW + gap, y, chartW, chartH,
    'Throughput (req/s)', 'req/s',
    [
      { values: trendSummary.map((d) => d.avg_throughput ?? null), color: [16, 185, 129], label: 'Throughput' },
    ],
    statuses, xLabels, dateLabels,
  );

  // ── Row 2: Error Rate (full width) ───────────────────────────────────────
  const row2Y   = y + chartH + gap;
  const fullW   = pageW - marginX * 2;
  drawLineChart(
    doc,
    marginX, row2Y, fullW, chartH,
    'Error Rate (%)', '%',
    [
      { values: trendSummary.map((d) => d.avg_error_rate ?? null), color: [239, 68, 68], label: 'Error Rate' },
    ],
    statuses, xLabels, dateLabels,
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function generateComparisonPDF(
  result: ComparisonResult,
  trendSummary: TrendSummaryPoint[] = [],
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const { baseline, compare, summary, insights, transactionComparisons: tc } = result;
  const paired = tc.filter((c) => c.baseline && c.compare);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const above5s     = paired.filter((c) => (c.compare!.avg_response_time ?? 0) > 5).length;
  const peakEntry   = paired.length ? paired.reduce((m, c) =>
    (c.compare!.avg_response_time ?? 0) > (m.compare!.avg_response_time ?? 0) ? c : m) : null;
  const maxRegrEntry = paired.length ? paired.reduce((m, c) => {
    const d  = (c.compare!.avg_response_time ?? 0) - (c.baseline!.avg_response_time ?? 0);
    const md = (m.compare!.avg_response_time ?? 0) - (m.baseline!.avg_response_time ?? 0);
    return d > md ? c : m;
  }) : null;
  const bestImpEntry = paired.length ? paired.reduce((m, c) => {
    const d  = (c.baseline!.avg_response_time ?? 0) - (c.compare!.avg_response_time ?? 0);
    const md = (m.baseline!.avg_response_time ?? 0) - (m.compare!.avg_response_time ?? 0);
    return d > md ? c : m;
  }) : null;
  const maxRegrVal  = maxRegrEntry ? maxRegrEntry.compare!.avg_response_time - maxRegrEntry.baseline!.avg_response_time : null;
  const bestImpVal  = bestImpEntry ? bestImpEntry.baseline!.avg_response_time - bestImpEntry.compare!.avg_response_time : null;

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
  const hpsPct    = bHPS > 0 ? ((cHPS - bHPS) / bHPS) * 100 : null;

  // ── PAGE 1 ────────────────────────────────────────────────────────────────
  addPageHeader(doc, pageW, baseline.name, compare.name);
  let y = 24;

  // ── Comparison overview ───────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.slate900);

  const infoRows = [
    ['', 'Name', 'Project / Sub-project', 'Build', 'User Load', 'Tool', 'Date'],
    ['Baseline', s(baseline.name), s(`${baseline.project_name ?? ''} / ${baseline.subproject_name ?? ''}`), s(baseline.build || '-'), baseline.user_load != null ? String(baseline.user_load) : '-', s(baseline.test_tool), s(baseline.execution_date?.slice(0, 10) ?? '-')],
    ['Compare',  s(compare.name),  s(`${compare.project_name  ?? ''} / ${compare.subproject_name  ?? ''}`), s(compare.build  || '-'), compare.user_load  != null ? String(compare.user_load)  : '-', s(compare.test_tool),  s(compare.execution_date?.slice(0, 10)  ?? '-')],
  ];

  autoTable(doc, {
    startY: y,
    head:   [infoRows[0]],
    body:   infoRows.slice(1),
    theme:  'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles:       { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' },
    bodyStyles:       { textColor: C.slate700 },
    columnStyles:     { 0: { fontStyle: 'bold', cellWidth: 20 } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === 0) d.cell.styles.fillColor = C.indigoLight;
      if (d.section === 'body' && d.row.index === 1) d.cell.styles.fillColor = C.amberLight;
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── Summary at a Glance ───────────────────────────────────────────────────
  y = sectionHeader(doc, 'Summary at a Glance', y, pageW);

  const glance = [
    { label: 'Compared',            value: paired.length.toString(),                                    color: C.slate900 },
    { label: 'Improved',            value: summary.improvements.toString(),                             color: C.green },
    { label: 'Degraded',            value: summary.regressions.toString(),                              color: C.red },
    { label: 'Stable',              value: summary.neutral.toString(),                                  color: C.orange },
    { label: 'Above 5s',            value: above5s.toString(),                                          color: [190, 24, 93] as [number,number,number] },
    { label: 'Peak RT (s)',         value: peakEntry ? peakEntry.compare!.avg_response_time.toFixed(1) : '-', color: C.orange },
    { label: 'Max Regression (s)',  value: maxRegrVal != null && maxRegrVal > 0 ? `+${maxRegrVal.toFixed(1)}` : '-', color: C.red },
    { label: 'Best Improvement (s)',value: bestImpVal != null && bestImpVal > 0 ? bestImpVal.toFixed(1) : '-',      color: C.green },
  ];

  const cardW   = (pageW - 28) / glance.length;
  const cardH   = 18;
  glance.forEach((g, i) => {
    const x = 14 + i * cardW;
    doc.setFillColor(...C.slate50);
    doc.setDrawColor(...C.slate200);
    doc.rect(x, y, cardW, cardH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...g.color);
    doc.text(g.value, x + cardW / 2, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.slate500);
    doc.text(g.label, x + cardW / 2, y + 15.5, { align: 'center' });
  });
  y += cardH + 6;

  // ── Executive Summary ─────────────────────────────────────────────────────
  y = sectionHeader(doc, 'Executive Summary', y, pageW);

  const lines: { text: string; color: [number,number,number]; bold?: boolean }[] = [];
  lines.push({ text: s(`Comparing '${baseline.name}' (Baseline)  vs  '${compare.name}' (Comparison)`), color: C.slate900, bold: true });
  lines.push({ text: `Out of ${paired.length} transactions compared: ${summary.improvements} improved, ${summary.regressions} degraded, ${summary.neutral} stable.`, color: C.slate700 });
  if (peakEntry) {
    const rtMove = bAvgRT != null && cAvgRT != null ? `  |  Average RT moved from ${bAvgRT.toFixed(2)}s to ${cAvgRT.toFixed(2)}s` : '';
    lines.push({ text: s(`Highest response time: '${peakEntry.name}' at ${peakEntry.compare!.avg_response_time.toFixed(2)}s${rtMove}`), color: C.orange });
  }
  if (maxRegrEntry && maxRegrVal != null && maxRegrVal > 0)
    lines.push({ text: s(`Largest regression: '${maxRegrEntry.name}' increased by +${maxRegrVal.toFixed(2)}s`), color: C.red });
  if (bestImpEntry && bestImpVal != null && bestImpVal > 0)
    lines.push({ text: s(`Best improvement: '${bestImpEntry.name}' decreased by ${bestImpVal.toFixed(2)}s`), color: C.green });

  const verdict = summary.regressions > summary.improvements
    ? `${above5s} transaction(s) exceed the 5s threshold. Overall performance has degraded — action recommended.`
    : summary.regressions === 0
      ? 'All transactions are stable or improved. Overall performance looks good.'
      : `${above5s} transaction(s) exceed the 5s threshold. Mixed results — review regressions carefully.`;
  lines.push({ text: verdict, color: summary.regressions > summary.improvements ? C.red : C.green, bold: true });

  lines.forEach((l) => {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', l.bold ? 'bold' : 'normal');
    doc.setTextColor(...l.color);
    // Wrap long text
    const wrapped = doc.splitTextToSize(l.text, pageW - 28) as string[];
    doc.text(wrapped, 14, y);
    y += wrapped.length * 5;
  });
  y += 4;

  // ── Test-Level Metrics Table ──────────────────────────────────────────────
  y = sectionHeader(doc, 'Test-Level Metrics Comparison', y, pageW);

  const errRateChangeText = () => {
    if (bErrRate == null || cErrRate == null) return '-';
    if (cErrRate > bErrRate) return '↑ Increased';
    if (cErrRate < bErrRate) return '↓ Decreased';
    return '● No change';
  };
  const errRateChangeColor = (): [number,number,number] => {
    if (bErrRate == null || cErrRate == null) return C.slate500;
    return cErrRate > bErrRate ? C.red : cErrRate < bErrRate ? C.green : C.slate500;
  };

  const metricsBody: (string | { content: string; styles: { textColor: [number,number,number] } })[][] = [
    ['Total Transactions',  bSamples.toLocaleString(), cSamples.toLocaleString(), { content: s(absChangeText(bSamples, cSamples, false, 0, '')),    styles: { textColor: absChangeColor(bSamples, cSamples, false) } }],
    ['Avg Response Time',   fmt3(bAvgRT),              fmt3(cAvgRT),              { content: s(absChangeText(bAvgRT ?? 0, cAvgRT ?? 0, true, 2, 's')), styles: { textColor: absChangeColor(bAvgRT ?? 0, cAvgRT ?? 0, true) } }],
    ['90th Percentile RT',  fmt3(bP90),                fmt3(cP90),                { content: s(absChangeText(bP90   ?? 0, cP90   ?? 0, true, 2, 's')), styles: { textColor: absChangeColor(bP90   ?? 0, cP90   ?? 0, true) } }],
    ['Error Count',         bErrCnt.toLocaleString(),  cErrCnt.toLocaleString(),  { content: s(absChangeText(bErrCnt, cErrCnt, true, 0, '')),           styles: { textColor: absChangeColor(bErrCnt, cErrCnt, true) } }],
    ['Error Rate',          fmtPct(bErrRate),          fmtPct(cErrRate),          { content: s(errRateChangeText()), styles: { textColor: errRateChangeColor() } }],
    ['Throughput (Hits/s)', fmt2(bHPS) + ' rps',       fmt2(cHPS) + ' rps',       { content: s(hpsPct != null ? `${hpsPct >= 0 ? '↑' : '↓'} ${hpsPct >= 0 ? '+' : ''}${hpsPct.toFixed(2)}% (${hpsPct < 0 ? 'lighter' : 'higher'})` : '-'), styles: { textColor: hpsPct != null ? (hpsPct < 0 ? C.red : C.green) : C.slate500 } }],
  ];

  autoTable(doc, {
    startY: y,
    head:   [['Metric', s(baseline.name), s(compare.name), 'Change']],
    body:   metricsBody,
    theme:  'grid',
    styles: { fontSize: 8.5, cellPadding: 2.8 },
    headStyles:   { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' },
    bodyStyles:   { textColor: C.slate700 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { halign: 'center', textColor: C.indigo as [number,number,number] },
      2: { halign: 'center', textColor: C.amber  as [number,number,number] },
      3: { halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: C.slate50 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── Trend Charts Page (overall aggregated, all releases) ─────────────────
  if (trendSummary.length > 0) {
    addTrendPage(doc, pageW, pageH, trendSummary, baseline.name, compare.name);
    doc.addPage();
    addPageHeader(doc, pageW, baseline.name, compare.name);
    y = 24;
  }

  // ── Insights ──────────────────────────────────────────────────────────────
  if (insights.length > 0) {
    if (y + 14 + insights.length * 6 > pageH - 15) {
      doc.addPage();
      addPageHeader(doc, pageW, baseline.name, compare.name);
      y = 24;
    }
    y = sectionHeader(doc, `Insights (${insights.length})`, y, pageW);

    const severityColor = (s: string): [number,number,number] => {
      if (s === 'critical') return C.red;
      if (s === 'warning')  return C.orange;
      if (s === 'success')  return C.green;
      return C.slate500;
    };

    autoTable(doc, {
      startY: y,
      head:   [['Severity', 'Title', 'Message', 'Transaction']],
      body:   insights.map((ins) => [
        s(ins.severity.toUpperCase()),
        s(ins.title),
        s(ins.message),
        s(ins.transactionName ?? '-'),
      ]),
      theme:  'grid',
      styles: { fontSize: 7.5, cellPadding: 2.2, overflow: 'linebreak' },
      headStyles:   { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' },
      bodyStyles:   { textColor: C.slate700 },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 55 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 55 },
      },
      alternateRowStyles: { fillColor: C.slate50 },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 0) {
          const sev = insights[d.row.index]?.severity ?? '';
          d.cell.styles.textColor = severityColor(sev);
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ── PAGE 2+ : Transaction Comparison Table ────────────────────────────────
  doc.addPage();
  addPageHeader(doc, pageW, baseline.name, compare.name);
  y = 24;
  y = sectionHeader(doc, `Transaction Comparison Table (${tc.length} transactions)`, y, pageW);

  const statusColor = (status: string): [number,number,number] => {
    if (status === 'regression')  return C.red;
    if (status === 'improvement') return C.green;
    if (status === 'missing')     return C.orange;
    if (status === 'new')         return [37, 99, 235] as [number,number,number];
    return C.slate500;
  };

  const txnBody = tc.map((c: TransactionComparison) => [
    s(c.name),
    c.baseline ? c.baseline.avg_response_time.toFixed(2) : '—',
    c.compare  ? c.compare.avg_response_time.toFixed(2)  : '—',
    c.diffs.avg_response_time != null ? (c.diffs.avg_response_time > 0 ? '+' : '') + c.diffs.avg_response_time.toFixed(2) + '%' : '—',
    c.baseline ? c.baseline.p90_response_time.toFixed(2) : '—',
    c.compare  ? c.compare.p90_response_time.toFixed(2)  : '—',
    c.diffs.p90_response_time != null ? (c.diffs.p90_response_time > 0 ? '+' : '') + c.diffs.p90_response_time.toFixed(2) + '%' : '—',
    c.baseline ? c.baseline.throughput.toFixed(2) : '—',
    c.compare  ? c.compare.throughput.toFixed(2)  : '—',
    c.baseline ? c.baseline.error_rate.toFixed(2) + '%' : '—',
    c.compare  ? c.compare.error_rate.toFixed(2)  + '%' : '—',
    c.overallStatus,
  ]);

  autoTable(doc, {
    startY: y,
    head: [[
      'Transaction',
      s(`${baseline.name} Avg(s)`), s(`${compare.name} Avg(s)`), 'Avg D%',
      s(`${baseline.name} P90(s)`), s(`${compare.name} P90(s)`), 'P90 D%',
      s(`${baseline.name} TPS`),    s(`${compare.name} TPS`),
      s(`${baseline.name} Err%`),   s(`${compare.name} Err%`),
      'Status',
    ]],
    body:  txnBody,
    theme: 'grid',
    styles:     { fontSize: 6.5, cellPadding: 1.8, overflow: 'ellipsize' },
    headStyles: { fillColor: C.navy, textColor: C.white, fontStyle: 'bold', fontSize: 6.5 },
    bodyStyles: { textColor: C.slate700 },
    columnStyles: {
      0:  { cellWidth: 55, fontStyle: 'bold' },
      11: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: C.slate50 },
    didParseCell: (d) => {
      if (d.section === 'body') {
        const rowData = tc[d.row.index];
        if (!rowData) return;
        // Colour Avg Δ% column
        if (d.column.index === 3 && rowData.diffs.avg_response_time != null) {
          d.cell.styles.textColor = rowData.diffs.avg_response_time > 5 ? C.red : rowData.diffs.avg_response_time < -5 ? C.green : C.slate500;
        }
        // Colour P90 Δ% column
        if (d.column.index === 6 && rowData.diffs.p90_response_time != null) {
          d.cell.styles.textColor = rowData.diffs.p90_response_time > 5 ? C.red : rowData.diffs.p90_response_time < -5 ? C.green : C.slate500;
        }
        // Colour Status column
        if (d.column.index === 11) {
          d.cell.styles.textColor = statusColor(rowData.overallStatus);
        }
        // Row background for regressions / improvements
        if (rowData.overallStatus === 'regression')  d.cell.styles.fillColor = [255, 245, 245] as [number,number,number];
        if (rowData.overallStatus === 'improvement') d.cell.styles.fillColor = [240, 253, 244] as [number,number,number];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // ── Add footers to all pages ──────────────────────────────────────────────
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addPageFooter(doc, pageW, pageH, p, totalPages);
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeName = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  doc.save(`PerfInsight_${safeName(baseline.name)}_vs_${safeName(compare.name)}.pdf`);
}
