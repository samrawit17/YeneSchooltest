import api from './core';

export const notificationsAPI = {
  getAll: (params?: { limit?: string | number; types?: string }) => api.get('/notifications', { params }),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: (data?: { types?: string[] }) => api.post('/notifications/mark-all-read', data || {}),
  getPublicKey: () => api.get('/notifications/push/public-key'),

  savePushSubscription: (subscription: PushSubscriptionJSON) =>
    api.post('/notifications/push/subscriptions', { subscription }),

  removePushSubscription: (endpoint: string) =>
    api.delete('/notifications/push/subscriptions', { data: { endpoint } }),
};
