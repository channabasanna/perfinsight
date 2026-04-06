import client from './client';
import { User } from '../types';

export async function getUsers(): Promise<User[]> {
  const res = await client.get<{ success: boolean; data: User[] }>('/auth/users');
  return res.data.data;
}

export async function createUser(data: {
  username: string;
  password: string;
  role: 'admin' | 'user';
  project_ids: number[];
}): Promise<User> {
  const res = await client.post<{ success: boolean; data: User }>('/auth/users', data);
  return res.data.data;
}

export async function updateUser(
  id: number,
  data: { password?: string; role?: 'admin' | 'user'; project_ids?: number[] }
): Promise<void> {
  await client.put(`/auth/users/${id}`, data);
}

export async function deleteUser(id: number): Promise<void> {
  await client.delete(`/auth/users/${id}`);
}
