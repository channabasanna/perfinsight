import client from './client';
import { ComparisonResult, TrendDataPoint, TrendsOverview, DashboardStats, ApiResponse } from '../types';

export const getComparison = async (
  baselineId: number,
  compareId: number
): Promise<ComparisonResult> => {
  const res = await client.get<ApiResponse<ComparisonResult>>(
    `/comparison?baseline=${baselineId}&compare=${compareId}`
  );
  return res.data.data;
};

export const getTrends = async (
  subprojectId: number,
  transactionName?: string,
  filter?: 'good' | 'all'
): Promise<TrendDataPoint[] | TrendsOverview> => {
  const params = new URLSearchParams();
  if (transactionName) params.set('transactionName', transactionName);
  if (filter) params.set('filter', filter);
  const query = params.toString();

  const res = await client.get<ApiResponse<TrendDataPoint[] | TrendsOverview>>(
    `/trends/${subprojectId}${query ? `?${query}` : ''}`
  );
  return res.data.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await client.get<ApiResponse<DashboardStats>>('/dashboard/stats');
  return res.data.data;
};
