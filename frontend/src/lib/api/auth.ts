import api from './core';

export const authAPI = {
  login: (loginIdentifier: string, password: string) =>
    api.post('/auth/login', { loginIdentifier, password }),

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

  getUsers: (role?: string) => api.get('/auth/users', { params: { role } }),

  getTeachers: (params?: { page?: string; limit?: string; search?: string }) =>
    api.get('/auth/users/teachers', { params }),

  getUserById: (id: string) => api.get(`/auth/users/${id}`),

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
  getProfile: () => api.get('/auth/users/me'),

  updateProfile: (data: any) => api.put('/auth/users/me', data),

  updateTheme: (theme: string) => api.patch('/auth/users/me/theme', { theme }),

  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword }),
};
