import apiClient from './apiClient';
import type { ActivityItem, MemberRole, ScheduleMember, ShareLink, TeamAvailabilityResponse } from '../types/domain';

export const collaborationApi = {
  async members(scheduleId: string) { return (await apiClient.get<ScheduleMember[]>(`/schedules/${scheduleId}/members`)).data; },
  async invite(scheduleId: string, email: string, role: Exclude<MemberRole, 'OWNER'>) { return (await apiClient.post<ScheduleMember>(`/schedules/${scheduleId}/members`, { email, role })).data; },
  async updateRole(scheduleId: string, userId: string, role: Exclude<MemberRole, 'OWNER'>) { return (await apiClient.put<ScheduleMember>(`/schedules/${scheduleId}/members/${userId}`, { role })).data; },
  async remove(scheduleId: string, userId: string) { await apiClient.delete(`/schedules/${scheduleId}/members/${userId}`); },
  async teamAvailability(scheduleId: string, from: string, to: string, minimumMembers?: number) { return (await apiClient.get<TeamAvailabilityResponse>(`/schedules/${scheduleId}/team-availability`, { params: { from, to, minimumMembers } })).data; },
  async shareLinks(scheduleId: string) { return (await apiClient.get<ShareLink[]>(`/schedules/${scheduleId}/share-links`)).data; },
  async createShareLink(scheduleId: string, expiresAt?: string) { return (await apiClient.post<ShareLink>(`/schedules/${scheduleId}/share-links`, { mode: 'VIEW_ONLY', expiresAt })).data; },
  async revokeShareLink(scheduleId: string, id: string) { await apiClient.delete(`/schedules/${scheduleId}/share-links/${id}`); },
  async activity(scheduleId: string) { return (await apiClient.get<ActivityItem[]>(`/schedules/${scheduleId}/activity`)).data; },
};
