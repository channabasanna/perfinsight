import client from './client';
import { TestRun, Transaction, ApiResponse, TestRunStatus } from '../types';

export const getTestRuns = async (subprojectId: number): Promise<TestRun[]> => {
  const res = await client.get<ApiResponse<TestRun[]>>(`/subprojects/${subprojectId}/testruns`);
  return res.data.data;
};

export const getTestRun = async (id: number): Promise<TestRun> => {
  const res = await client.get<ApiResponse<TestRun>>(`/testruns/${id}`);
  return res.data.data;
};

export const createTestRun = async (
  subprojectId: number,
  formData: FormData
): Promise<TestRun> => {
  const res = await client.post<ApiResponse<TestRun>>(
    `/subprojects/${subprojectId}/testruns`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }
  );
  return res.data.data;
};

export const updateTestRun = async (
  id: number,
  data: Partial<{
    status: TestRunStatus;
    notes: string;
    name: string;
    build: string;
    user_load: number;
    test_tool: string;
    execution_date: string;
  }>
): Promise<TestRun> => {
  const res = await client.put<ApiResponse<TestRun>>(`/testruns/${id}`, data);
  return res.data.data;
};

export const deleteTestRun = async (id: number): Promise<void> => {
  await client.delete(`/testruns/${id}`);
};

export const getTransactions = async (testRunId: number): Promise<Transaction[]> => {
  const res = await client.get<ApiResponse<Transaction[]>>(`/testruns/${testRunId}/transactions`);
  return res.data.data;
};

export const updateTestRunStatus = async (id: number, status: TestRunStatus): Promise<TestRun> => {
  return updateTestRun(id, { status });
};
