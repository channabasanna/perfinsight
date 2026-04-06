import * as XLSX from 'xlsx';
import path from 'path';

export interface ParsedTransaction {
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

// Normalize column names by lowercasing, trimming, and removing special chars
function normalizeColName(col: string): string {
  return col.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Find a column index by possible names
function findCol(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeColName);
  for (const candidate of candidates) {
    const norm = normalizeColName(candidate);
    const idx = normalized.findIndex((h) => h === norm || h.includes(norm));
    if (idx !== -1) return idx;
  }
  return -1;
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val).replace(/[,%]/g, ''));
  return isNaN(n) ? 0 : n;
}

function shouldConvertMsToSeconds(rows: Record<string, unknown>[], avgColName: string): boolean {
  // If median or more values are > 100, assume milliseconds
  const values = rows
    .map((r) => toNumber(r[avgColName]))
    .filter((v) => v > 0);
  if (values.length === 0) return false;
  const countAbove100 = values.filter((v) => v > 100).length;
  return countAbove100 / values.length > 0.5;
}

export function parseTestResultFile(filePath: string): ParsedTransaction[] {
  const ext = path.extname(filePath).toLowerCase();

  let workbook: XLSX.WorkBook;
  if (ext === '.csv') {
    workbook = XLSX.readFile(filePath, { type: 'file', raw: false });
  } else {
    workbook = XLSX.readFile(filePath, { type: 'file' });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of objects with raw row data
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rawData.length === 0) {
    throw new Error('No data found in file');
  }

  const headers = Object.keys(rawData[0]);

  // Detect column mappings - JMeter aggregate report format
  const labelCol = findCol(headers, ['Label', 'Transaction', 'Name', 'Sampler', 'label', 'transaction', 'name']);
  const samplesCol = findCol(headers, ['# Samples', 'Samples', 'Count', 'Hits', 'samples', 'count']);
  const avgCol = findCol(headers, ['Average', 'Avg', 'Mean', 'AvgResponseTime', 'average', 'avg', 'mean', 'ResponseTime']);
  const minCol = findCol(headers, ['Min', 'Minimum', 'min', 'minimum']);
  const maxCol = findCol(headers, ['Max', 'Maximum', 'max', 'maximum']);
  const p90Col = findCol(headers, ['90th pct', '90%', 'P90', 'pct90', '90thpct', 'p90', '90th']);
  const p95Col = findCol(headers, ['95th pct', '95%', 'P95', 'pct95', '95thpct', 'p95', '95th']);
  const p99Col = findCol(headers, ['99th pct', '99%', 'P99', 'pct99', '99thpct', 'p99', '99th']);
  const errorCol = findCol(headers, ['Error%', 'Error %', 'Errors', 'ErrorRate', 'error', 'errorpct', 'errorrate', 'failures', 'failurerate']);
  const throughputCol = findCol(headers, ['Throughput', 'RPS', 'Req/s', 'RequestsPerSecond', 'throughput', 'rps', 'reqps']);
  const kbCol = findCol(headers, ['Received KB/sec', 'KB/sec', 'KBps', 'ReceivedKBsec', 'kbsec', 'kbpersec', 'receivedbytessec', 'bandwidth']);

  if (labelCol === -1) {
    throw new Error('Could not find transaction label column in file. Expected columns: Label, Transaction, or Name');
  }

  const labelColName = headers[labelCol];
  const avgColName = avgCol !== -1 ? headers[avgCol] : null;

  // Check if we need ms -> seconds conversion
  const needsConversion = avgColName
    ? shouldConvertMsToSeconds(rawData, avgColName)
    : false;

  const divisor = needsConversion ? 1000 : 1;

  const transactions: ParsedTransaction[] = [];

  for (const row of rawData) {
    const name = String(row[labelColName] || '').trim();

    // Skip empty rows, total rows, or TOTAL summary rows
    if (!name || name.toLowerCase() === 'total' || name === '') continue;

    const avgRaw = avgColName ? toNumber(row[avgColName]) : 0;
    const minRaw = minCol !== -1 ? toNumber(row[headers[minCol]]) : 0;
    const maxRaw = maxCol !== -1 ? toNumber(row[headers[maxCol]]) : 0;
    const p90Raw = p90Col !== -1 ? toNumber(row[headers[p90Col]]) : 0;
    const p95Raw = p95Col !== -1 ? toNumber(row[headers[p95Col]]) : 0;
    const p99Raw = p99Col !== -1 ? toNumber(row[headers[p99Col]]) : 0;

    let errorRate = errorCol !== -1 ? toNumber(row[headers[errorCol]]) : 0;
    // Handle percentage strings like "1.23%" or "1.23"
    if (errorRate > 1 && errorRate <= 100) {
      // Already a percentage value, keep as-is
    } else if (errorRate > 0 && errorRate <= 1) {
      // Decimal fraction, convert to percentage
      errorRate = errorRate * 100;
    }

    const throughput = throughputCol !== -1 ? toNumber(row[headers[throughputCol]]) : 0;
    const kbPerSec = kbCol !== -1 ? toNumber(row[headers[kbCol]]) : 0;
    const samples = samplesCol !== -1 ? Math.round(toNumber(row[headers[samplesCol]])) : 0;

    transactions.push({
      name,
      samples,
      avg_response_time: avgRaw / divisor,
      min_response_time: minRaw / divisor,
      max_response_time: maxRaw / divisor,
      p90_response_time: p90Raw / divisor,
      p95_response_time: p95Raw / divisor,
      p99_response_time: p99Raw / divisor,
      error_rate: errorRate,
      throughput,
      kb_per_sec: kbPerSec,
    });
  }

  if (transactions.length === 0) {
    throw new Error('No valid transactions found in file');
  }

  return transactions;
}
