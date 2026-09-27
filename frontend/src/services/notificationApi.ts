import apiClient from './apiClient';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  scheduledFor: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  content: NotificationItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export const notificationApi = {
  async list(unreadOnly = false) {
    return (await apiClient.get<NotificationPage>('/notifications', { params: { unreadOnly, size: 50 } })).data;
  },
  async markRead(id: string) {
    await apiClient.post(`/notifications/${id}/read`);
  },
  async markAllRead() {
    await apiClient.post('/notifications/read-all');
  },
};
