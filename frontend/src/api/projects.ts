import client from './client';
import { Project, SubProject, ApiResponse } from '../types';

// Projects
export const getProjects = async (): Promise<Project[]> => {
  const res = await client.get<ApiResponse<Project[]>>('/projects');
  return res.data.data;
};

export const getProject = async (id: number): Promise<Project> => {
  const res = await client.get<ApiResponse<Project>>(`/projects/${id}`);
  return res.data.data;
};

export const createProject = async (data: {
  name: string;
  customer_name: string;
  description?: string;
}): Promise<Project> => {
  const res = await client.post<ApiResponse<Project>>('/projects', data);
  return res.data.data;
};

export const updateProject = async (
  id: number,
  data: { name: string; customer_name: string; description?: string }
): Promise<Project> => {
  const res = await client.put<ApiResponse<Project>>(`/projects/${id}`, data);
  return res.data.data;
};

export const deleteProject = async (id: number): Promise<void> => {
  await client.delete(`/projects/${id}`);
};

// SubProjects
export const getSubProjects = async (projectId: number): Promise<SubProject[]> => {
  const res = await client.get<ApiResponse<SubProject[]>>(`/projects/${projectId}/subprojects`);
  return res.data.data;
};

export const getSubProject = async (projectId: number, id: number): Promise<SubProject> => {
  const res = await client.get<ApiResponse<SubProject>>(`/projects/${projectId}/subprojects/${id}`);
  return res.data.data;
};

export const createSubProject = async (
  projectId: number,
  data: { name: string; description?: string }
): Promise<SubProject> => {
  const res = await client.post<ApiResponse<SubProject>>(`/projects/${projectId}/subprojects`, data);
  return res.data.data;
};

export const updateSubProject = async (
  projectId: number,
  id: number,
  data: { name: string; description?: string }
): Promise<SubProject> => {
  const res = await client.put<ApiResponse<SubProject>>(`/projects/${projectId}/subprojects/${id}`, data);
  return res.data.data;
};

export const deleteSubProject = async (projectId: number, id: number): Promise<void> => {
  await client.delete(`/projects/${projectId}/subprojects/${id}`);
};

// Transaction Filters
export const getSubProjectFilters = async (projectId: number, id: number): Promise<string[]> => {
  const res = await client.get<ApiResponse<{ filters: string[] }>>(`/projects/${projectId}/subprojects/${id}/filters`);
  return res.data.data.filters;
};

export const updateSubProjectFilters = async (projectId: number, id: number, filters: string[]): Promise<string[]> => {
  const res = await client.put<ApiResponse<{ filters: string[] }>>(`/projects/${projectId}/subprojects/${id}/filters`, { filters });
  return res.data.data.filters;
};
