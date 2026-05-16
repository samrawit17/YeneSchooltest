import api from './core';

export const studentsAPI = {
  create: (data: any) => api.post('/students', data),

  getAll: (params?: {
    schoolId?: string;
    academicYearId?: string;
    status?: string;
    grade?: string;
    section?: string;
    year?: string;
    page?: string | number;
    limit?: string | number;
    search?: string;
  }) => api.get('/students', { params }),

  getHomeroomStudents: () => api.get('/students/homeroom/me'),
  getMyClass: () => api.get('/students/me/class'),

  getById: (id: string) => api.get(`/students/${id}`),

  getChildren: () => api.get('/parents/me/children'),

  update: (id: string, data: any) => api.put(`/students/${id}`, data),

  delete: (id: string) => api.delete(`/students/${id}`),

  getPendingEnrollments: () => api.get('/students/enrollments/pending'),

  approveEnrollment: (
    id: string,
    data: { className: string; section: string; rollNumber: string }
  ) => api.post(`/students/enrollments/${id}/approve`, data),

  rejectEnrollment: (id: string, rejectionReason: string) =>
    api.post(`/students/enrollments/${id}/reject`, { rejectionReason }),

  assignClass: (id: string, data: { className: string; section: string; rollNumber: string; classId?: string; sectionId?: string }) =>
    api.post(`/students/${id}/assign-class`, data),

  uploadDocuments: (id: string, documents: any[]) =>
    api.post(`/students/${id}/documents`, { documents }),

  getForIdCards: (params?: {
    grade?: string;
    section?: string;
    academicYear?: string;
    search?: string;
    studentIds?: string;
  }) => api.get('/students/id-cards', { params }),
  getIdCardTemplate: () => api.get('/students/id-cards/template'),
  saveIdCardTemplate: (template: {
    title: string;
    themeColor: string;
    templateBackgroundUrl: string;
    schoolName: string;
    schoolPhone: string;
    schoolAddress: string;
    schoolEmail: string;
    schoolLogoUrl: string;
  }) => api.put('/students/id-cards/template', { template }),
  uploadIdCardTemplate: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/students/id-cards/template/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  downloadIdCardPdf: (studentId: string) =>
    api.get(`/students/id-cards/${studentId}/pdf`, { responseType: 'blob' }),
  downloadIdCardsBulkPdf: (studentIds: string[]) =>
    api.post('/students/id-cards/bulk-pdf', { studentIds }, { responseType: 'blob' }),
};

export const registrarAPI = {
  createStudent: (data: any) => api.post('/registrar/students', data),

  getStudents: (params?: { status?: string; grade?: string }) =>
    api.get('/registrar/students', { params }),

  getStudentById: (id: string) => api.get(`/registrar/students/${id}`),

  updateStudent: (id: string, data: any) => api.put(`/registrar/students/${id}`, data),

  getEnrollments: (status?: string, page = 1) =>
    api.get('/registrar/enrollments', { params: { status, page } }),

  getPendingEnrollments: () => api.get('/registrar/enrollments/pending'),

  approveEnrollment: (
    id: string,
    data: { className: string; section: string; rollNumber: string }
  ) => api.post(`/registrar/enrollments/${id}/approve`, data),

  autoApproveEnrollment: (id: string) =>
    api.post(`/registrar/enrollments/${id}/auto-approve`),

  rejectEnrollment: (id: string, rejectionReason: string) =>
    api.post(`/registrar/enrollments/${id}/reject`, { rejectionReason }),

  assignClass: (id: string, data: { className: string; section: string; rollNumber: string; classId?: string; sectionId?: string }) =>
    api.post(`/registrar/students/${id}/assign-class`, data),

  uploadDocuments: (id: string, documents: any[]) =>
    api.post(`/registrar/students/${id}/documents`, { documents }),
};
