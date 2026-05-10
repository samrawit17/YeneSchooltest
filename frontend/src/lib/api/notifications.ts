import api from './core';

export type NotificationPreferences = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  commBookEnabled: boolean;
  timetableEnabled: boolean;
  attendanceEnabled: boolean;
  announcementsEnabled: boolean;
  assignmentsEnabled: boolean;
  examsEnabled: boolean;
  feesEnabled: boolean;
  eventsEnabled: boolean;
};

export const notificationsAPI = {
  getAll: (params?: { limit?: string | number; types?: string }) => api.get('/notifications', { params }),
  getPreferences: () => api.get<NotificationPreferences>('/notifications/preferences'),
  updatePreferences: (data: Partial<NotificationPreferences>) =>
    api.put<NotificationPreferences>('/notifications/preferences', data),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: (data?: { types?: string[] }) => api.post('/notifications/mark-all-read', data || {}),
  getPublicKey: () => api.get('/notifications/push/public-key'),

  savePushSubscription: (subscription: PushSubscriptionJSON) =>
    api.post('/notifications/push/subscriptions', { subscription }),

  removePushSubscription: (endpoint: string) =>
    api.delete('/notifications/push/subscriptions', { data: { endpoint } }),
};
