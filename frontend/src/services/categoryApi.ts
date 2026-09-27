import apiClient from './apiClient';
import type { Category } from '../types/domain';
export const categoryApi = {
  async list() { return (await apiClient.get<Category[]>('/categories')).data; },
  async create(input: { name: string; color: string; icon?: string }) { return (await apiClient.post<Category>('/categories', input)).data; },
  async update(id: string, input: { name: string; color: string; icon?: string }) { return (await apiClient.put<Category>(`/categories/${id}`, input)).data; },
  async remove(id: string) { await apiClient.delete(`/categories/${id}`); },
};
