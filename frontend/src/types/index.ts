export interface Project {
  id: number;
  name: string;
  customer_name: string;
  description?: string;
  created_at: string;
  subproject_count?: number;
  test_run_count?: number;
}

export interface SubProject {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  created_at: string;
  project_name?: string;
  customer_name?: string;
  test_run_count?: number;
  good_run_count?: number;
  last_run_date?: string;
}

export type TestRunStatus = 'pending' | 'good' | 'bad';
export type TestTool = 'JMeter' | 'Gatling' | 'K6' | 'Locust' | 'Custom';

export interface TestRun {
  id: number;
  sub_project_id: number;
  name: string;
  build?: string;
  user_load?: number;
  test_tool: TestTool;
  execution_date: string;
  status: TestRunStatus;
  notes?: string;
  file_path?: string;
  created_at: string;
  subproject_name?: string;
  project_name?: string;
  customer_name?: string;
  project_id?: number;
  transaction_count?: number;
}

export interface Transaction {
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

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface Insight {
  severity: InsightSeverity;
  title: string;
  message: string;
  transactionName?: string;
  metric?: string;
  diff?: number;
}

export type ComparisonStatus = 'regression' | 'improvement' | 'neutral' | 'new' | 'missing';

export interface TransactionComparison {
  name: string;
  baseline: Transaction | null;
  compare: Transaction | null;
  diffs: {
    avg_response_time: number | null;
    p90_response_time: number | null;
    p99_response_time: number | null;
    throughput: number | null;
    error_rate: number | null;
  };
  statuses: {
    avg_response_time: ComparisonStatus;
    p90_response_time: ComparisonStatus;
    throughput: ComparisonStatus;
    error_rate: ComparisonStatus;
  };
  overallStatus: ComparisonStatus;
}

export interface ComparisonSummary {
  totalTransactions: number;
  regressions: number;
  improvements: number;
  neutral: number;
  newTransactions: number;
  missingTransactions: number;
}

export interface ComparisonResult {
  baseline: TestRun;
  compare: TestRun;
  transactionComparisons: TransactionComparison[];
  insights: Insight[];
  overallScore: number;
  summary: ComparisonSummary;
}

export interface TrendDataPoint {
  test_run_id: number;
  test_run_name: string;
  build?: string;
  user_load?: number;
  execution_date: string;
  status: TestRunStatus;
  transaction_name?: string;
  avg_response_time: number;
  p90_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  throughput: number;
  error_rate: number;
  samples: number;
  kb_per_sec: number;
  [key: string]: unknown;
}

export interface TrendSummaryPoint {
  test_run_id: number;
  test_run_name: string;
  build?: string;
  user_load?: number;
  execution_date: string;
  status: TestRunStatus;
  transaction_count: number;
  avg_response_time: number;
  p90_response_time: number;
  avg_throughput: number;
  avg_error_rate: number;
  [key: string]: unknown;
}

export interface TrendsOverview {
  transactionNames: string[];
  testRunSummary: TrendSummaryPoint[];
}

export interface DashboardStats {
  totalProjects: number;
  totalTestRuns: number;
  goodTests: number;
  badTests: number;
  recentTestRuns: TestRun[];
  allTestRuns: TestRun[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  created_at: string;
  project_ids: number[];
}
