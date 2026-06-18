import api from "./core";
import type { RequestOptions } from './types';
import { requestOptions } from './types';

export const academicYearsAPI = {
  create: (data: {
    name: string;
    startDate: string;
    endDate: string;
    schoolId?: string;
    curriculumType?: string;
    calendarType?: string;
  }) => api.post("/academic-years", data),
  getAll: (params?: { schoolId?: string }) =>
    api.get("/academic-years", { params }),
  getById: (id: string) => api.get(`/academic-years/${id}`),
  getActive: (params?: { schoolId?: string }) =>
    api.get("/academic-years/active", { params }),
  getAcademicYears: () => api.get("/academic-years"),
  update: (
    id: string,
    data: { name?: string; startDate?: string; endDate?: string },
  ) => api.put(`/academic-years/${id}`, data),
  updateCurriculumType: (id: string, data: { curriculumType: string }) =>
    api.put(`/academic-years/${id}/curriculum-type`, data),
  activate: (id: string) => api.put(`/academic-years/${id}/activate`),
  delete: (id: string, config?: any) =>
    api.delete(`/academic-years/${id}`, config),
  getPeriodWeights: (id: string) =>
    api.get(`/academic-years/${id}/period-weights`),
  validateWeights: (id: string) =>
    api.get(`/academic-years/${id}/validate-weights`),
  createTerm: (
    academicYearId: string,
    data: {
      name: string;
      order: number;
      percentageWeight: number;
      startDate: string;
      endDate: string;
    },
  ) => api.post(`/academic-years/${academicYearId}/terms`, data),
  updateTerm: (
    termId: string,
    data: {
      name?: string;
      order?: number;
      percentageWeight?: number;
      startDate?: string;
      endDate?: string;
    },
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
  getAll: (params?: { academicYearId?: string }, options?: RequestOptions) => {
    if (params?.academicYearId) {
      return api.get(
        `/academic-years/${params.academicYearId}/terms`,
        requestOptions(options)
      );
    }
    return api.get("/academic-years/terms/current", requestOptions(options));
  },
  getById: (id: string) => api.get(`/academic-years/terms/${id}`),
  getByYear: (academicYearId: string) =>
    api.get(`/academic-years/${academicYearId}/terms`),
  getCurrent: (params?: { schoolId?: string }) =>
    api.get("/academic-years/terms/current", { params }),
  update: (
    id: string,
    data: {
      name?: string;
      startDate?: string;
      endDate?: string;
      order?: number;
      percentageWeight?: number;
    },
  ) => api.put(`/academic-years/terms/${id}`, data),
  delete: (id: string) => api.delete(`/academic-years/terms/${id}`),
  lock: (id: string, isLocked: boolean) =>
    api.put(`/academic-years/terms/${id}/lock`, { isLocked }),
};
