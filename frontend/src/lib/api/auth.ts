import api from './core';

export const authAPI = {
  login: (loginIdentifier: string, password: string, schoolId?: string | null) =>
    api.post('/auth/login', { loginIdentifier, password, ...(schoolId ? { schoolId } : {}) }),

  logout: () => api.post('/auth/logout'),

  registerAdmin: (data: { email: string; password: string; name: string; schoolId: string }) =>
    api.post('/auth/register/admin', data),

  registerTeacher: (data: { email: string; name: string }) =>
    api.post('/auth/register/teacher', data),

  registerStudent: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register/student', data),

  registerParent: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register/parent', data),

  registerRegistrar: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register/registrar', data),

  registerStudentSelf: (data: FormData) =>
    api.post('/auth/register/student-self', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  getUsers: (
    roleOrParams?:
      | string
      | {
          role?: string;
          roles?: string[];
          page?: number;
          limit?: number;
          search?: string;
        }
  ) => {
    const params =
      typeof roleOrParams === "string"
        ? { role: roleOrParams }
        : {
            role: roleOrParams?.role,
            roles: roleOrParams?.roles?.join(","),
            page: roleOrParams?.page,
            limit: roleOrParams?.limit,
            search: roleOrParams?.search,
          };

    return api.get('/auth/users', { params });
  },

  getTeachers: (params?: { page?: string; limit?: string; search?: string }) =>
    api.get('/auth/users/teachers', { params }),

  getUserById: (id: string) => api.get(`/auth/users/${id}`),

  uploadAvatar: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/auth/users/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateUser: (
    id: string,
    data: {
      email?: string;
      password?: string;
      name?: string;
      phone?: string;
      isActive?: boolean;
      specialization?: string;
    }
  ) =>
    api.put(`/auth/users/${id}`, data),

  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
};

export const userAPI = {
  getProfile: (options?: { skipAuthErrorRedirect?: boolean }) =>
    api.get('/auth/users/me', {
      ...(options?.skipAuthErrorRedirect ? { skipAuthErrorRedirect: true } : {}),
    }),

  updateProfile: (data: any) => api.put('/auth/users/me', data),

  updateTheme: (theme: string) => api.patch('/auth/users/me/theme', { theme }),

  updateLanguage: (language: string) => api.patch('/auth/users/me/language', { language }),

  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword }),

  requestPasswordReset: (username: string) =>
    api.post('/auth/request-password-reset', { username }),

  adminResetUserPassword: (userId: string, temporaryPassword?: string) =>
    api.post(`/auth/admin/reset-user-password/${userId}`, { temporaryPassword }),
};
