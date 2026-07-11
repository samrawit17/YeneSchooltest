import api from './core';

export const aiAPI = {
  chat: (message: string, studentId?: string, classId?: string) =>
    api.post('/ai/chat', { message, studentId, classId }),

  generateReport: (studentId: string, tone?: string) =>
    api.post('/ai/report/generate', { studentId, tone }),

  getAlerts: (studentId?: string) =>
    api.get('/ai/alerts', { params: { studentId } }),

  getRecommendations: (studentId?: string, classId?: string) =>
    api.post('/ai/recommend', { studentId, classId }),

  getStatus: () =>
    api.get('/ai/status'),
};
