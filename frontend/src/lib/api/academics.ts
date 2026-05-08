import api from './core';

export const platformSettingsAPI = {
  getAll: () => api.get('/platform/settings'),
  getFlags: () => api.get('/platform/settings/flags'),
  get: (key: string) => api.get(`/platform/settings/${key}`),
  set: (key: string, value: any) => api.put(`/platform/settings/${key}`, { value }),
  delete: (key: string) => api.delete(`/platform/settings/${key}`),
  batchUpdate: (settings: Record<string, any>) => api.post('/platform/settings/batch', settings),
};

export const schoolSettingsAPI = {
  getAll: (schoolId: string) => api.get(`/schools/${schoolId}/settings`),
  get: (schoolId: string, key: string) => api.get(`/schools/${schoolId}/settings/${key}`),
  set: (schoolId: string, key: string, value: any) =>
    api.put(`/schools/${schoolId}/settings/${key}`, { value }),
  delete: (schoolId: string, key: string) => api.delete(`/schools/${schoolId}/settings/${key}`),
  batchUpdate: (schoolId: string, settings: Record<string, any>) =>
    api.post(`/schools/${schoolId}/settings/batch`, settings),
};

export const schoolsAPI = {
  create: (data: { name: string; email: string; address?: string; phone?: string }) =>
    api.post('/schools', data),
  getAll: () => api.get('/schools'),
  getById: (id: string) => api.get(`/schools/${id}`),
  update: (
    id: string,
    data: {
      name?: string;
      email?: string;
      address?: string;
      phone?: string;
      code?: string;
      logoUrl?: string;
    }
  ) => api.put(`/schools/${id}`, data),
  uploadLogo: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/schools/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  delete: (id: string) => api.delete(`/schools/${id}`),
};

export const classesAPI = {
  create: (data: { academicYearId: string; grade: number; section: string; name?: string }) =>
    api.post('/classes', data),
  getAll: (params?: { academicYearId?: string }) => api.get('/classes', { params }),
  getById: (id: string) => api.get(`/classes/${id}`),
  update: (
    id: string,
    data: {
      academicYearId?: string;
      grade?: number;
      section?: string;
      name?: string;
      homeroomTeacherId?: string | null;
    }
  ) => api.put(`/classes/${id}`, data),
  setHomeroomTeacher: (id: string, homeroomTeacherId: string | null) =>
    api.put(`/classes/${id}/homeroom-teacher`, { homeroomTeacherId }),
  delete: (id: string) => api.delete(`/classes/${id}`),
  getGrades: () => api.get('/classes/grades/list'),
  getStudents: (
    id: string,
    params?: { sectionId?: string; search?: string; page?: string; limit?: string }
  ) => api.get(`/classes/${id}/students`, { params }),
  getSections: () => api.get('/sections'),
  getStats: (id: string, params?: { sectionId?: string }) =>
    api.get(`/classes/${id}/stats`, { params }),
  search: (params: { q: string; academicYearId?: string }) => api.get('/classes/search', { params }),
};

export const sectionsAPI = {
  create: (data: { classId: string; name: string; capacity: number; roomNumber?: string }) =>
    api.post('/sections', data),
  getAll: (params?: { classId?: string; search?: string }) => api.get('/sections', { params }),
  getById: (id: string) => api.get(`/sections/${id}`),
  update: (id: string, data: { name?: string; capacity?: number; roomNumber?: string }) =>
    api.put(`/sections/${id}`, data),
  delete: (id: string) => api.delete(`/sections/${id}`),
  autoCreate: (data: { classId: string; capacity?: number }) =>
    api.post('/sections/auto-create', data),
  setHomeroomTeacher: (sectionId: string, teacherId: string | null) =>
    api.put(`/sections/${sectionId}/homeroom-teacher`, { homeroomTeacherId: teacherId }),
  syncCapacity: () => api.put('/sections/sync-capacity'),
  search: (params: { search: string }) => api.get('/sections', { params }),
};

export const academicYearsAPI = {
  create: (data: {
    name: string;
    startDate: string;
    endDate: string;
    schoolId?: string;
    curriculumType?: string;
    calendarType?: string;
  }) => api.post('/academic-years', data),
  getAll: (params?: { schoolId?: string }) => api.get('/academic-years', { params }),
  getById: (id: string) => api.get(`/academic-years/${id}`),
  getActive: (params?: { schoolId?: string }) => api.get('/academic-years/active', { params }),
  getAcademicYears: () => api.get('/academic-years'),
  update: (id: string, data: { name?: string; startDate?: string; endDate?: string }) =>
    api.put(`/academic-years/${id}`, data),
  updateCurriculumType: (id: string, data: { curriculumType: string }) =>
    api.put(`/academic-years/${id}/curriculum-type`, data),
  activate: (id: string) => api.put(`/academic-years/${id}/activate`),
  delete: (id: string) => api.delete(`/academic-years/${id}`),
  getPeriodWeights: (id: string) => api.get(`/academic-years/${id}/period-weights`),
  validateWeights: (id: string) => api.get(`/academic-years/${id}/validate-weights`),
  createTerm: (
    academicYearId: string,
    data: {
      name: string;
      order: number;
      percentageWeight: number;
      startDate: string;
      endDate: string;
    }
  ) => api.post(`/academic-years/${academicYearId}/terms`, data),
  updateTerm: (
    termId: string,
    data: {
      name?: string;
      order?: number;
      percentageWeight?: number;
      startDate?: string;
      endDate?: string;
    }
  ) => api.put(`/academic-years/terms/${termId}`, data),
  lockTerm: (termId: string, isLocked: boolean) =>
    api.put(`/academic-years/terms/${termId}/lock`, { isLocked }),
  deleteTerm: (termId: string) => api.delete(`/academic-years/terms/${termId}`),
  getTermById: (termId: string) => api.get(`/academic-years/terms/${termId}`),
};

export const termsAPI = {
  create: (arg1: any, arg2?: any) => {
    if (arg2) {
      return api.post(`/academic-years/${arg1}/terms`, arg2);
    }
    return api.post(`/academic-years/${arg1.academicYearId}/terms`, arg1);
  },
  getAll: (params?: { academicYearId?: string }) => {
    if (params?.academicYearId) {
      return api.get(`/academic-years/${params.academicYearId}/terms`);
    }
    return api.get('/academic-years/terms/current');
  },
  getById: (id: string) => api.get(`/academic-years/terms/${id}`),
  getByYear: (academicYearId: string) => api.get(`/academic-years/${academicYearId}/terms`),
  getCurrent: (params?: { schoolId?: string }) => api.get('/academic-years/terms/current', { params }),
  update: (
    id: string,
    data: {
      name?: string;
      startDate?: string;
      endDate?: string;
      order?: number;
      percentageWeight?: number;
    }
  ) => api.put(`/academic-years/terms/${id}`, data),
  delete: (id: string) => api.delete(`/academic-years/terms/${id}`),
  lock: (id: string, isLocked: boolean) =>
    api.put(`/academic-years/terms/${id}/lock`, { isLocked }),
};

export const timetableSlotsAPI = {
  create: (data: {
    schoolId: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
    academicYearId?: string;
  }) => api.post('/timetable-slots', data),
  getAll: (params?: {
    dayOfWeek?: number;
    classId?: string;
    teacherId?: string;
    academicYearId?: string;
  }) => api.get('/timetable-slots', { params }),
  getByClass: (classId: string) => api.get(`/timetable-slots/class/${classId}`),
  getByTeacher: (teacherId: string) => api.get(`/timetable-slots/teacher/${teacherId}`),
  getById: (id: string) => api.get(`/timetable-slots/${id}`),
  update: (
    id: string,
    data: {
      classId?: string;
      subjectId?: string;
      teacherId?: string;
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      room?: string;
      academicYearId?: string;
    }
  ) => api.patch(`/timetable-slots/${id}`, data),
  delete: (id: string) => api.delete(`/timetable-slots/${id}`),
  bulkCreate: (slots: {
    classId: string;
    sectionId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string;
    academicYearId?: string;
  }[]) => api.post('/timetable-slots/bulk', { slots }),
  deleteByClassSection: (classId: string, sectionId: string) =>
    api.delete(`/timetable-slots/class/${classId}/section/${sectionId}`),
  getGrid: (classId: string, sectionId?: string) =>
    api.get(`/timetable-slots/grid/class/${classId}`, { params: { sectionId } }),
};

export const subjectsAPI = {
  create: (data: {
    schoolId: string;
    name: string;
    code?: string;
    isActive?: boolean;
    description?: string;
  }) =>
    api.post('/subjects', data),
  getAll: (params?: { schoolId?: string }) => api.get('/subjects', { params }),
  getById: (id: string) => api.get(`/subjects/${id}`),
  update: (id: string, data: { name?: string; code?: string; isActive?: boolean; description?: string }) =>
    api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`),
};

export const teachersAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    classId?: string;
    sectionId?: string;
    subject?: string;
  }) => api.get('/teachers', { params }),
  getById: (id: string) => api.get(`/teachers/${id}`),
  getMyAssignments: () => api.get('/teachers/me/assignments'),
  update: (id: string, data: { name?: string; phone?: string; address?: string }) =>
    api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};
