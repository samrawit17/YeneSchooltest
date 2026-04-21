import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout for bulk operations
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.warn('API request timed out');
    }
    if (error.response?.status === 401) {
      // Clear local storage and redirect to login
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/sign-in' && !currentPath.startsWith('/sign-in')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/sign-in';
        }
      }
    }
    
    // Handle 403 Forbidden - redirect to access denied page
    if (error.response?.status === 403 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      // Prevent infinite redirects
      if (!currentPath.includes('/access-denied') && !currentPath.includes('/sign-in')) {
        sessionStorage.setItem('accessDeniedUrl', currentPath);
        sessionStorage.setItem('accessDeniedCode', '403');
        window.location.href = '/access-denied?type=403';
      }
    }
    
    // Handle 404 Not Found
    if (error.response?.status === 404 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/access-denied') && !currentPath.includes('/sign-in')) {
        sessionStorage.setItem('accessDeniedUrl', currentPath);
        sessionStorage.setItem('accessDeniedCode', '404');
        window.location.href = '/access-denied?type=404';
      }
    }
    
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================

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

  registerStudentSelf: (data: FormData) => {
    return api.post('/auth/register/student-self', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getUsers: (role?: string) =>
    api.get('/auth/users', { params: { role } }),

  getTeachers: (params?: { page?: string; limit?: string; search?: string }) =>
    api.get('/auth/users/teachers', { params }),

  getUserById: (id: string) =>
    api.get(`/auth/users/${id}`),

  updateUser: (id: string, data: { email?: string; password?: string; name?: string }) =>
    api.put(`/auth/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/auth/users/${id}`),
};

export const notificationsAPI = {
  getPublicKey: () => api.get('/notifications/push/public-key'),

  savePushSubscription: (subscription: PushSubscriptionJSON) =>
    api.post('/notifications/push/subscriptions', { subscription }),

  removePushSubscription: (endpoint: string) =>
    api.delete('/notifications/push/subscriptions', { data: { endpoint } }),
};

// ==================== STUDENTS API ====================

export const studentsAPI = {
  create: (data: any) =>
    api.post('/students', data),

  getAll: (params?: { status?: string; grade?: string; section?: string; year?: string; page?: string; limit?: string; search?: string }) =>
    api.get('/students', { params }),

  getHomeroomStudents: () =>
    api.get('/students/homeroom/me'),

  getById: (id: string) =>
    api.get(`/students/${id}`),

  update: (id: string, data: any) =>
    api.put(`/students/${id}`, data),

  delete: (id: string) =>
    api.delete(`/students/${id}`),

  getPendingEnrollments: () =>
    api.get('/students/enrollments/pending'),

  approveEnrollment: (id: string, data: { className: string; section: string; rollNumber: string }) =>
    api.post(`/students/enrollments/${id}/approve`, data),

  rejectEnrollment: (id: string, rejectionReason: string) =>
    api.post(`/students/enrollments/${id}/reject`, { rejectionReason }),

  assignClass: (id: string, data: { className: string; section: string; rollNumber: string }) =>
    api.post(`/students/${id}/assign-class`, data),

  uploadDocuments: (id: string, documents: any[]) =>
    api.post(`/students/${id}/documents`, { documents }),

  getChildren: () =>
    api.get('/parents/me/children'),

  getForIdCards: (params?: { grade?: string; section?: string; academicYear?: string; search?: string; studentIds?: string }) =>
    api.get('/students/id-cards', { params }),
};

// ==================== REGISTRAR API ====================

export const registrarAPI = {
  createStudent: (data: any) =>
    api.post('/registrar/students', data),

  getStudents: (params?: { status?: string; grade?: string }) =>
    api.get('/registrar/students', { params }),

  getStudentById: (id: string) =>
    api.get(`/registrar/students/${id}`),

  updateStudent: (id: string, data: any) =>
    api.put(`/registrar/students/${id}`, data),

  getEnrollments: (status?: string, page: number = 1) =>
    api.get('/registrar/enrollments', { params: { status, page } }),

  getPendingEnrollments: () =>
    api.get('/registrar/enrollments/pending'),

  approveEnrollment: (id: string, data: { className: string; section: string; rollNumber: string }) =>
    api.post(`/registrar/enrollments/${id}/approve`, data),

  autoApproveEnrollment: (id: string) =>
    api.post(`/registrar/enrollments/${id}/auto-approve`),

  rejectEnrollment: (id: string, rejectionReason: string) =>
    api.post(`/registrar/enrollments/${id}/reject`, { rejectionReason }),

  assignClass: (id: string, data: { className: string; section: string; rollNumber: string }) =>
    api.post(`/registrar/students/${id}/assign-class`, data),

  uploadDocuments: (id: string, documents: any[]) =>
    api.post(`/registrar/students/${id}/documents`, { documents }),
};

// ==================== SCHOOLS API ====================

export const schoolsAPI = {
  create: (data: { name: string; email: string; address?: string; phone?: string }) =>
    api.post('/schools', data),

  getAll: () =>
    api.get('/schools'),

  getById: (id: string) =>
    api.get(`/schools/${id}`),

  update: (id: string, data: { name?: string; email?: string; address?: string; phone?: string; code?: string; logoUrl?: string }) =>
    api.put(`/schools/${id}`, data),

  uploadLogo: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/schools/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: (id: string) =>
    api.delete(`/schools/${id}`),
};

// ==================== SUBSCRIPTION API ====================

export const subscriptionAPI = {
  getAllPlans: () =>
    api.get('/subscription/plans'),

  getPlan: (id: string) =>
    api.get(`/subscription/plans/${id}`),

  createPlan: (data: { name: string; tier: string; description?: string; features: string[] }) =>
    api.post('/subscription/plans', data),

  updatePlan: (id: string, data: { name?: string; description?: string; features?: string[]; isActive?: boolean }) =>
    api.put(`/subscription/plans/${id}`, data),

  deletePlan: (id: string) =>
    api.delete(`/subscription/plans/${id}`),

  assignPlan: (schoolId: string, planId: string) =>
    api.post('/subscription/assign', { schoolId, planId }),

  getSchoolPlan: (schoolId: string) =>
    api.get(`/subscription/school/${schoolId}`),

  getSchools: (planId?: string) =>
    api.get(planId ? `/subscription/schools?planId=${planId}` : '/subscription/schools'),

  checkFeature: (schoolId: string, feature: string) =>
    api.get('/subscription/check-feature', { params: { schoolId, feature } }),
};

// ==================== ROLES API ====================

export const rolesAPI = {
  getAll: () =>
    api.get('/roles'),

  getPermissions: (role: string) =>
    api.get(`/roles/${role}/permissions`),

  assignPermission: (role: string, permissionId: string) =>
    api.post(`/roles/${role}/permissions`, { permissionId }),

  removePermission: (role: string, permissionId: string) =>
    api.delete(`/roles/${role}/permissions/${permissionId}`),
};

// ==================== PERMISSIONS API ====================

export const permissionsAPI = {
  create: (data: { name: string; description: string; module: string; action: string }) =>
    api.post('/permissions', data),

  getAll: () =>
    api.get('/permissions'),

  getById: (id: string) =>
    api.get(`/permissions/${id}`),

  getByModule: (module: string) =>
    api.get(`/permissions/module/${module}`),

  update: (id: string, data: { name?: string; description?: string; module?: string; action?: string }) =>
    api.put(`/permissions/${id}`, data),

  delete: (id: string) =>
    api.delete(`/permissions/${id}`),
};

// ==================== AUTO-ASSIGNMENT API ====================

export const autoAssignmentAPI = {
  autoAssign: (enrollmentId: string) =>
    api.post(`/auto-assignment/enrollments/${enrollmentId}/auto-assign`),

  bulkAutoAssign: (enrollmentIds: string[]) =>
    api.post('/auto-assignment/bulk', { enrollmentIds }),

  reassign: (enrollmentId: string) =>
    api.post(`/auto-assignment/enrollments/${enrollmentId}/reassign`),

  getStudentAssignment: (studentId: string) =>
    api.get(`/auto-assignment/students/${studentId}/assignment`),

  getCapacity: (academicYear: string, grade: string) =>
    api.get('/auto-assignment/capacity', { params: { academicYear, grade } }),

  approveAndAssign: (enrollmentId: string) =>
    api.post('/auto-assignment/approve-and-assign', { enrollmentId }),
};

// ==================== USER API ====================

export const userAPI = {
  getProfile: () =>
    api.get('/auth/users/me'),

  updateProfile: (data: any) =>
    api.put('/auth/users/me', data),

  updateTheme: (theme: string) =>
    api.patch('/auth/users/me/theme', { theme }),

  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword }),
};

// ==================== PLATFORM SETTINGS API (SuperAdmin) ====================

export const platformSettingsAPI = {
  getAll: () =>
    api.get('/platform/settings'),

  getFlags: () =>
    api.get('/platform/settings/flags'),

  get: (key: string) =>
    api.get(`/platform/settings/${key}`),

  set: (key: string, value: any) =>
    api.put(`/platform/settings/${key}`, { value }),

  delete: (key: string) =>
    api.delete(`/platform/settings/${key}`),

  batchUpdate: (settings: Record<string, any>) =>
    api.post('/platform/settings/batch', settings),
};

// ==================== SCHOOL SETTINGS API (Admin) ====================

export const schoolSettingsAPI = {
  getAll: (schoolId: string) =>
    api.get(`/schools/${schoolId}/settings`),

  get: (schoolId: string, key: string) =>
    api.get(`/schools/${schoolId}/settings/${key}`),

  set: (schoolId: string, key: string, value: any) =>
    api.put(`/schools/${schoolId}/settings/${key}`, { value }),

  delete: (schoolId: string, key: string) =>
    api.delete(`/schools/${schoolId}/settings/${key}`),

  batchUpdate: (schoolId: string, settings: Record<string, any>) =>
    api.post(`/schools/${schoolId}/settings/batch`, settings),
};

// ==================== CLASSES API ====================

export const classesAPI = {
  create: (data: { academicYearId: string; grade: number; section: string; name?: string }) =>
    api.post('/classes', data),

  getAll: (params?: { academicYearId?: string }) =>
    api.get('/classes', { params }),

  getById: (id: string) =>
    api.get(`/classes/${id}`),

  update: (id: string, data: { academicYearId?: string; grade?: number; section?: string; name?: string; homeroomTeacherId?: string | null }) =>
    api.put(`/classes/${id}`, data),

  setHomeroomTeacher: (id: string, homeroomTeacherId: string | null) =>
    api.put(`/classes/${id}/homeroom-teacher`, { homeroomTeacherId }),

  delete: (id: string) =>
    api.delete(`/classes/${id}`),

  getGrades: () =>
    api.get('/classes/grades/list'),

  getStudents: (id: string, params?: { sectionId?: string; search?: string; page?: string; limit?: string }) =>
    api.get(`/classes/${id}/students`, { params }),

  getStats: (id: string, params?: { sectionId?: string }) =>
    api.get(`/classes/${id}/stats`, { params }),

  search: (params: { q: string; academicYearId?: string }) =>
    api.get('/classes/search', { params }),
};

// ==================== SECTIONS API ====================

export const sectionsAPI = {
  create: (data: { classId: string; name: string; capacity: number; roomNumber?: string }) =>
    api.post('/sections', data),

  getAll: (params?: { classId?: string; search?: string }) =>
    api.get('/sections', { params }),

  getById: (id: string) =>
    api.get(`/sections/${id}`),

  update: (id: string, data: { name?: string; capacity?: number; roomNumber?: string }) =>
    api.put(`/sections/${id}`, data),

  delete: (id: string) =>
    api.delete(`/sections/${id}`),

  autoCreate: (data: { classId: string; capacity?: number }) =>
    api.post('/sections/auto-create', data),

  setHomeroomTeacher: (sectionId: string, teacherId: string | null) =>
    api.put(`/sections/${sectionId}/homeroom-teacher`, { homeroomTeacherId: teacherId }),

  syncCapacity: () =>
    api.put('/sections/sync-capacity'),

  search: (params: { search: string }) =>
    api.get('/sections', { params }),
};

// ==================== ACADEMIC YEARS API ====================

export const academicYearsAPI = {
  create: (data: { name: string; startDate: string; endDate: string; schoolId?: string; curriculumType?: string; calendarType?: string }) =>
    api.post('/academic-years', data),

  getAll: (params?: { schoolId?: string }) =>
    api.get('/academic-years', { params }),

  getById: (id: string) =>
    api.get(`/academic-years/${id}`),

  getActive: (params?: { schoolId?: string }) =>
    api.get('/academic-years/active', { params }),

  update: (id: string, data: { name?: string; startDate?: string; endDate?: string }) =>
    api.put(`/academic-years/${id}`, data),

  updateCurriculumType: (id: string, data: { curriculumType: string }) =>
    api.put(`/academic-years/${id}/curriculum-type`, data),

  activate: (id: string) =>
    api.put(`/academic-years/${id}/activate`),

  delete: (id: string) =>
    api.delete(`/academic-years/${id}`),

  // Period management
  getPeriodWeights: (id: string) =>
    api.get(`/academic-years/${id}/period-weights`),

  validateWeights: (id: string) =>
    api.get(`/academic-years/${id}/validate-weights`),

  // Term/Period CRUD
  createTerm: (academicYearId: string, data: { name: string; order: number; percentageWeight: number; startDate: string; endDate: string }) =>
    api.post(`/academic-years/${academicYearId}/terms`, data),

  updateTerm: (termId: string, data: { name?: string; order?: number; percentageWeight?: number; startDate?: string; endDate?: string }) =>
    api.put(`/academic-years/terms/${termId}`, data),

  lockTerm: (termId: string, isLocked: boolean) =>
    api.put(`/academic-years/terms/${termId}/lock`, { isLocked }),

  deleteTerm: (termId: string) =>
    api.delete(`/academic-years/terms/${termId}`),

  getTermById: (termId: string) =>
    api.get(`/academic-years/terms/${termId}`),
};

// ==================== ASSESSMENTS API ====================

export const assessmentsAPI = {
  list: (params?: {
    academicYearId?: string;
    termId?: string;
    type?: string;
    status?: string;
  }) => api.get('/assessments', { params }),

  getById: (id: string) => api.get(`/assessments/${id}`),

  create: (data: any) => api.post('/assessments', data),

  addSubjects: (id: string, data: any) => api.post(`/assessments/${id}/subjects`, data),

  lock: (id: string) => api.post(`/assessments/${id}/lock`),

  getTeacherAssessments: (params?: {
    academicYearId?: string;
    termId?: string;
    type?: string;
  }) => api.get('/assessments/teacher/me', { params }),

  getScoreEntry: (assessmentSubjectId: string) =>
    api.get(`/assessments/subjects/${assessmentSubjectId}/score-entry`),

  saveScores: (assessmentSubjectId: string, data: any) =>
    api.post(`/assessments/subjects/${assessmentSubjectId}/scores`, data),

  getStudentUpcoming: (params?: { academicYearId?: string }) =>
    api.get('/assessments/student/upcoming', { params }),

  getStudentResults: (params?: { academicYearId?: string; termId?: string }) =>
    api.get('/assessments/student/results', { params }),

  getChildUpcoming: (childId: string, params?: { academicYearId?: string }) =>
    api.get(`/assessments/parent/child/${childId}/upcoming`, { params }),

  getChildResults: (
    childId: string,
    params?: { academicYearId?: string; termId?: string },
  ) => api.get(`/assessments/parent/child/${childId}/results`, { params }),

  getMissingMarks: (params?: { academicYearId?: string; termId?: string }) =>
    api.get('/assessments/registrar/missing-marks', { params }),

  getWeights: () => api.get('/assessments/config/weights'),

  updateWeights: (weights: Array<{ type: string; percentage: number }>) =>
    api.put('/assessments/config/weights', { weights }),
};

// ==================== EXAMS API ====================

export const examsAPI = {
  getTeacherExams: (params?: { academicYearId?: string; termId?: string }) =>
    api.get('/exams/teacher/me', { params }),
};

// ==================== GRADING API ====================

export const gradingAPI = {
  // Teacher - Get assignments
  getTeacherAssignments: (params?: { academicYear?: string }) =>
    api.get('/grading/teacher/assignments', { params }),

  // Student final grades (with period breakdown)
  getStudentFinalGrades: (params: { academicYear: string; classId?: string }) =>
    api.get('/grading/student/final-grades', { params }),

  // Parent view child's final grades
  getChildFinalGrades: (studentId: string, params: { academicYear: string; classId?: string }) =>
    api.get(`/grading/parent/final-grades/${studentId}`, { params }),

  // Calculate final grade for specific subject
  calculateSubjectFinalGrade: (params: { studentId: string; subjectId: string; academicYear: string }) =>
    api.get('/grading/subject/final-grade', { params }),

  // Student grades (per term)
  getStudentGrades: (params?: { academicYear?: string; termId?: string }) =>
    api.get('/grading/student/grades', { params }),

  // Parent grades
  getChildGrades: (studentId: string, params?: { academicYear?: string; termId?: string }) =>
    api.get(`/grading/parent/grades/${studentId}`, { params }),

  // Teacher grades
  getTeacherStudents: (params: { academicYear: string; termId: string; classId: string; sectionId: string; subjectId: string }) =>
    api.get('/grading/teacher/students', { params }),

  // Enter grade
  enterGrade: (data: any) =>
    api.post('/grading/teacher/grades', data),

  // Bulk enter grades
  bulkEnterGrades: (data: any) =>
    api.post('/grading/teacher/grades/bulk', data),

  // Submit all grades to registrar
  submitAllGrades: (params: { academicYear: string; termId: string; classId: string; sectionId: string; subjectId: string }) =>
    api.post(`/grading/teacher/grades/submit-all`, {}, { params }),

  // Registrar - review grades
  getGradesForReview: (params: { academicYear: string; termId?: string; classId?: string }) =>
    api.get('/grading/registrar/review', { params }),

  // Bulk approve/reject grades
  bulkApproveGrades: (gradeIds: string[]) =>
    api.post('/grading/registrar/grades/bulk-approve', { gradeIds }),

  bulkRejectGrades: (gradeIds: string[], comment: string) =>
    api.post('/grading/registrar/grades/bulk-reject', { gradeIds, comment }),
};

// ==================== TERMS API ====================

export const termsAPI = {
  create: (data: { academicYearId: string; name: string; startDate: string; endDate: string; order: number }) =>
    api.post('/terms', data),

  getAll: (params?: { academicYearId?: string }) =>
    api.get('/terms', { params }),

  getById: (id: string) =>
    api.get(`/terms/${id}`),

  getCurrent: (params?: { schoolId?: string }) =>
    api.get('/terms/current', { params }),

  update: (id: string, data: { name?: string; startDate?: string; endDate?: string; order?: number }) =>
    api.put(`/terms/${id}`, data),

  delete: (id: string) =>
    api.delete(`/terms/${id}`),
};

// ==================== TIMETABLE SLOTS API ====================

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
  }) =>
    api.post('/timetable-slots', data),

  getAll: (params?: {
    dayOfWeek?: number;
    classId?: string;
    teacherId?: string;
    academicYearId?: string;
  }) =>
    api.get('/timetable-slots', { params }),

  getByClass: (classId: string) =>
    api.get(`/timetable-slots/class/${classId}`),

  getByTeacher: (teacherId: string) =>
    api.get(`/timetable-slots/teacher/${teacherId}`),

  getById: (id: string) =>
    api.get(`/timetable-slots/${id}`),

  update: (id: string, data: {
    classId?: string;
    subjectId?: string;
    teacherId?: string;
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    room?: string;
    academicYearId?: string;
  }) =>
    api.patch(`/timetable-slots/${id}`, data),

  delete: (id: string) =>
    api.delete(`/timetable-slots/${id}`),

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
  }[]) =>
    api.post('/timetable-slots/bulk', { slots }),

  deleteByClassSection: (classId: string, sectionId: string) =>
    api.delete(`/timetable-slots/class/${classId}/section/${sectionId}`),

  getGrid: (classId: string, sectionId?: string) =>
    api.get(`/timetable-slots/grid/class/${classId}`, { params: { sectionId } }),
};

// ==================== SUBJECTS API ====================

export const subjectsAPI = {
  create: (data: { schoolId: string; name: string; code?: string; isActive?: boolean }) =>
    api.post('/subjects', data),

  getAll: (params?: { schoolId?: string }) =>
    api.get('/subjects', { params }),

  getById: (id: string) =>
    api.get(`/subjects/${id}`),

  update: (id: string, data: { name?: string; code?: string; isActive?: boolean }) =>
    api.put(`/subjects/${id}`, data),

  delete: (id: string) =>
    api.delete(`/subjects/${id}`),
};

// ==================== CREDENTIALS API ====================

export interface BulkStudentCreationDto {
  students: Array<{
    name: string;
    email: string;
    gender?: string;
    phone?: string;
    address?: string;
  }>;
  academicYear: string;
  grade: number;
  className?: string;
  section?: string;
}

export interface CredentialResult {
  name: string;
  email: string;
  username: string;
  temporaryPassword: string;
  role: string;
}

export interface StudentIdPreview {
  schoolName: string;
  schoolCode: string;
  academicYear: string;
  currentCount: number;
  nextAdmissionNumber: string | null;
  message: string;
}

export interface StaffIdPreview {
  schoolName: string;
  schoolCode: string;
  role: string;
  year: string;
  currentCount: number;
  nextStaffId: string | null;
  message: string;
}

export interface CredentialSlip {
  schoolLogo?: string;
  schoolName: string;
  schoolCode: string;
  studentName: string;
  admissionNumber: string;
  username: string;
  temporaryPassword: string;
  instructions: string[];
  generatedAt: Date;
}

export const credentialsAPI = {
  // Preview next student admission number
  previewStudentId: (schoolId: string, academicYear: string) =>
    api.get<StudentIdPreview>(`/credentials/preview/student/${schoolId}`, {
      params: { academicYear },
    }),

  // Preview next staff ID
  previewStaffId: (schoolId: string, role: string, academicYear?: string) =>
    api.get<StaffIdPreview>(`/credentials/preview/staff/${schoolId}`, {
      params: { role, academicYear },
    }),

  // Generate bulk credentials for export (without creating users)
  generateBulkCredentials: (data: {
    count: number;
    academicYear: string;
    role: string;
  }) => api.post('/credentials/generate/bulk', data),

  // Bulk create students with auto-generated credentials
  bulkCreateStudents: (data: BulkStudentCreationDto) =>
    api.post<{ message: string; students: CredentialResult[]; credentials: CredentialResult[]; note: string }>(
      '/credentials/students/bulk',
      data
    ),

  // Bulk create staff with auto-generated credentials
  bulkCreateStaff: (data: {
    staff: Array<{
      name: string;
      email: string;
      role: 'TEACHER' | 'ADMIN' | 'PARENT';
      phone?: string;
    }>;
    academicYear?: string;
  }) =>
    api.post<{ message: string; staff: CredentialResult[]; credentials: CredentialResult[]; note: string }>(
      '/credentials/staff/bulk',
      data
    ),

  // Unified staff creation - supports both auto-generated and custom credentials
  createStaff: (data: {
    staff: Array<{
      name: string;
      email: string;
      role: 'TEACHER' | 'ADMIN' | 'PARENT' | 'REGISTRAR';
      phone?: string;
      generateCredentials?: boolean;
      username?: string;
      password?: string;
    }>;
    academicYear?: string;
  }) =>
    api.post<{
      message: string;
      staff: Array<CredentialResult & { wasAutoGenerated: boolean }>;
      credentials: Array<CredentialResult & { wasAutoGenerated: boolean }>;
      note: string;
    }>('/credentials/staff/create', data),

  // Unified student creation - supports both auto-generated and custom credentials
  createStudent: (data: {
    students: Array<{
      name: string;
      email?: string;
      phone?: string;
      parentEmail?: string;
      gender?: string;
      generateCredentials?: boolean;
      username?: string;
      password?: string;
      classId?: string;
      sectionId?: string;
      promoteToNextClass?: boolean;
    }>;
    academicYear?: string;
  }) =>
    api.post<{
      message: string;
      students: Array<CredentialResult & { wasAutoGenerated: boolean }>;
      credentials: Array<CredentialResult & { wasAutoGenerated: boolean }>;
      note: string;
    }>('/credentials/students/create', data),

  // Export credentials to CSV
  exportToCSV: (credentials: CredentialResult[]) =>
    api.post('/credentials/export/csv', credentials, {
      responseType: 'blob',
    }),

  // Generate credential slips for printing
  generateSlips: (credentials: CredentialResult[]) =>
    api.post<{ slips: CredentialSlip[]; printableFormat: any[] }>(
      '/credentials/slips',
      credentials
    ),

  // Validate password strength
  validatePassword: (password: string) =>
    api.post('/credentials/validate-password', { password }),

  // Check username uniqueness
  checkUsername: (username: string) =>
    api.get<{ username: string; isUnique: boolean; message: string }>(
      `/credentials/check-username/${username}`
    ),

  // List all credentials (pending and sent)
  list: (params: {
    status?: 'pending' | 'sent' | 'all';
    role?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get('/credentials', { params }),

  // Get credential statistics
  getStats: () => api.get('/credentials/stats'),

  // Mark credential as sent
  markAsSent: (id: string, sentVia?: string) =>
    api.post(`/credentials/${id}/send`, { sentVia }),

  // Delete pending credential
  delete: (id: string) =>
    api.delete(`/credentials/${id}`),
};

// ==================== CREDENTIALS DATA TYPES ====================

export interface PendingCredential {
  id: string;
  schoolId: string;
  userId: string | null;
  name: string;
  email: string | null;
  username: string;
  temporaryPassword: string;
  role: string;
  isSent: boolean;
  sentAt: string | null;
  sentVia: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface CredentialStats {
  total: number;
  pending: number;
  sent: number;
  byRole: { role: string; count: number }[];
}

export default api;

// ==================== CLASS SUBJECTS API ====================

export const classSubjectsAPI = {
  create: (data: { classId: string; sectionId: string; subjectId: string; academicYearId: string; teacherId?: string }) =>
    api.post('/class-subjects', data),

  getAll: (params?: { schoolId?: string; academicYearId?: string }) =>
    api.get('/class-subjects', { params }),

  getByClass: (classId: string, sectionId?: string) =>
    api.get(`/class-subjects/by-class/${classId}`, { params: { sectionId } }),

  getByTeacher: (teacherId: string, params?: { academicYearId?: string }) =>
    api.get(`/class-subjects/by-teacher/${teacherId}`, { params }),

  getById: (id: string) =>
    api.get(`/class-subjects/${id}`),

  update: (id: string, data: { teacherId?: string }) =>
    api.put(`/class-subjects/${id}`, data),

  delete: (id: string) =>
    api.delete(`/class-subjects/${id}`),

  getMatrix: (params: { schoolId: string; academicYearId: string }) =>
    api.get('/class-subjects/matrix', { params }),

  bulkAssign: (data: any) =>
    api.post('/class-subjects/bulk-assign', data),
};

// ==================== TEACHERS API ====================

export const teachersAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; classId?: string; sectionId?: string; subject?: string }) =>
    api.get('/teachers', { params }),

  getById: (id: string) =>
    api.get(`/teachers/${id}`),

  // Teacher: Get own assigned classes and sections
  getMyAssignments: () =>
    api.get('/teachers/me/assignments'),

  update: (id: string, data: { name?: string; phone?: string; address?: string }) =>
    api.put(`/users/${id}`, data),

  delete: (id: string) =>
    api.delete(`/users/${id}`),
};

// ==================== DASHBOARD API ====================

export const dashboardAPI = {
  // Universal dashboard endpoint (role-based)
  getDashboard: () =>
    api.get('/dashboard'),

  // Role-specific endpoints
  getTeacherDashboard: () =>
    api.get('/dashboard/teacher'),

  getStudentDashboard: () =>
    api.get('/dashboard/student'),

  getParentDashboard: () =>
    api.get('/dashboard/parent'),

  getAdminDashboard: () =>
    api.get('/dashboard/admin'),

  getRegistrarDashboard: () =>
    api.get('/dashboard/registrar'),

  getSuperadminDashboard: () =>
    api.get('/dashboard/superadmin'),
};

// ==================== PARENTS API ====================

export const parentsAPI = {
  createAndLink: (data: {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    studentProfileId: string;
    relation: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
  }) =>
    api.post('/parents/create-and-link', data),

  // Backward-compatible alias
  create: (data: {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    studentProfileId: string;
    relation: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
  }) =>
    api.post('/parents/create-and-link', data),

  // Create parent without linking
  createSimple: (data: {
    email: string;
    name: string;
    phone?: string;
    address?: string;
    occupation?: string;
    schoolId?: string;
  }) =>
    api.post('/parents', data),

  // Get all parents for school
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get('/parents', { params }),

  // Get parent by ID
  getById: (id: string) =>
    api.get(`/parents/${id}`),

  // Update parent
  update: (id: string, data: {
    name?: string;
    phone?: string;
    address?: string;
    occupation?: string;
  }) =>
    api.put(`/parents/${id}`, data),

  // Delete parent
  delete: (id: string) =>
    api.delete(`/parents/${id}`),

  // Link existing parent to student
  linkToStudent: (data: {
    parentProfileId: string;
    studentProfileId: string;
    relation: string;
    isPrimary?: boolean;
    emergencyContact?: boolean;
  }) =>
    api.post('/parents/link', data),

  // Unlink parent from student
  unlinkFromStudent: (parentId: string, studentId: string) =>
    api.delete(`/parents/unlink/${parentId}/${studentId}`),
};

// ==================== ATTENDANCE API ====================

export type AttendanceRecordStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type SessionStatus = 'NOT_SUBMITTED' | 'SUBMITTED';

export interface AttendanceRecord {
  id: string;
  attendanceSessionId: string;
  studentId: string;
  status: AttendanceRecordStatus;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSession {
  id: string;
  timetableSlotId: string;
  date: string;
  takenBy: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  // Relations
  timetableSlot?: {
    id: string;
    class: { id: string; name: string; grade: number };
    section: { id: string; name: string };
    subject: { id: string; name: string; code?: string };
    teacher: { id: string; name: string };
  };
  records?: AttendanceRecord[];
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number;
}

export interface DailyAttendance {
  date: string;
  records: AttendanceRecord[];
  session?: AttendanceSession;
}

export const attendanceAPI = {
  // ==================== TEACHER ENDPOINTS ====================
  
  // Teacher: Get today's timetable slots for attendance
  getTodaySlots: (params?: { date?: string }) =>
    api.get('/attendance/today', { params }),

  // Teacher: Open/create attendance session for a slot
  openSession: (slotId: string, date?: string) =>
    api.post(`/attendance/session/${slotId}`, { date }),

  // Teacher: Get session details
  getSession: (sessionId: string) =>
    api.get(`/attendance/session/${sessionId}`),

  // Teacher: Mark attendance for all students
  markAttendance: (sessionId: string, data: {
    records: Array<{ studentId: string; status: AttendanceRecordStatus; remark?: string }>;
  }) =>
    api.post(`/attendance/session/${sessionId}/records`, data),

  // Teacher: Submit attendance (locks session)
  submitSession: (sessionId: string) =>
    api.put(`/attendance/session/${sessionId}/submit`),

  // Teacher: Get students for a class (for attendance)
  getStudentsForClass: (className: string, section: string, date?: string) =>
    api.get('/attendance/students', { params: { className, section, date } }),

  // Teacher: Get students for a class by ID (more reliable than name matching)
  getStudentsForClassById: (
    classId: string,
    className: string,
    section: string,
    date?: string,
    sectionId?: string,
  ) =>
    api.get('/attendance/students', {
      params: { classId, className, sectionId, section, date },
    }),

  // Teacher: Get attendance dashboard data
  getTeacherDashboard: () =>
    api.get('/attendance/dashboard/teacher'),

  // ==================== STUDENT ENDPOINTS ====================

  // Student: Get own attendance
  getMyAttendance: (params?: { startDate?: string; endDate?: string; month?: string }) =>
    api.get('/attendance/me', { params }),

  // Student: Get own attendance summary
  getMySummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/attendance/me/summary', { params }),

  // Student: Get attendance dashboard data
  getStudentDashboard: () =>
    api.get('/attendance/dashboard/student'),

  // ==================== PARENT ENDPOINTS ====================

  // Parent: Get child's attendance
  getStudentAttendance: (studentId: string, params?: { startDate?: string; endDate?: string; month?: string }) =>
    api.get(`/attendance/student/${studentId}`, { params }),

  // Parent: Get child's attendance summary
  getStudentSummary: (studentId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/attendance/student/${studentId}/summary`, { params }),

  // Parent: Get attendance dashboard data for a child
  getParentDashboard: (studentId: string) =>
    api.get(`/attendance/dashboard/parent/${studentId}`),

  // ==================== ADMIN ENDPOINTS ====================

  // Admin: Get all attendance sessions
  getAllSessions: (params?: {
    startDate?: string;
    endDate?: string;
    classId?: string;
    status?: 'DRAFT' | 'SUBMITTED';
    grade?: string;
    section?: string;
  }) =>
    api.get('/attendance/sessions', { params }),

  // Admin: Override attendance record
  overrideRecord: (recordId: string, data: {
    status: AttendanceRecordStatus;
    remark: string;
  }) =>
    api.put(`/attendance/record/${recordId}`, data),

  // Admin: Get attendance summary
  getSummary: (params?: {
    academicYearId?: string;
    classId?: string;
  }) =>
    api.get('/attendance/summary', { params }),

  // Admin: Get classes with missing attendance for a date
  getMissing: (params: { date: string; grade?: string; section?: string }) =>
    api.get('/attendance/missing', { params }),

  // Admin: Notify homeroom teachers about missing attendance
  notifyMissingAttendance: (params: { date: string }) =>
    api.post('/attendance/missing/notify', {}, { params }),

  // Admin: Get attendance dashboard data
  getAdminDashboard: (params?: { date?: string; grade?: string; section?: string; range?: string }) =>
    api.get('/attendance/dashboard/admin', { params }),

  // Admin: Get attendance summary with grades and periods
  getAttendanceSummary: (params?: {
    academicYearId?: string;
    termId?: string;
    classId?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    api.get('/attendance/summary', { params }),

  // Admin: Get attendance by date
  getAttendanceByDate: (params: {
    startDate: string;
    endDate?: string;
    classId?: string;
  }) =>
    api.get('/attendance/by-date', { params }),

  // Get grades for reports
  getGradesReport: (params?: {
    academicYear?: string;
    termId?: string;
    classId?: string;
  }) =>
    api.get('/grading/registrar/reports/subject', { params }),
};

// ==================== COMMUNICATION BOOK API ====================

// Communication status - includes ACKNOWLEDGED for backward compatibility
export type CommunicationStatus = 'OPEN' | 'ACKNOWLEDGED' | 'CLOSED';

// Communication category for organizing messages
export type CommunicationCategory = 'ACADEMIC' | 'ATTENDANCE' | 'DISCIPLINE' | 'HEALTH' | 'GENERAL';

// Simplified communication interface matching backend
export interface CommunicationReply {
  id: string;
  message: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

export interface Communication {
  id: string;
  schoolId: string;
  studentId: string;
  createdById: string;
  classId?: string;
  subject: string;
  message: string;
  status: CommunicationStatus;
  category: CommunicationCategory;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    role: string;
  };
  student?: {
    id: string;
    name: string;
  };
  class?: {
    id: string;
    name: string;
    section: string;
  };
  replies?: CommunicationReply[];
  _count?: {
    replies: number;
  };
}

// Backend DTOs - simplified to match backend
export interface CreateCommunicationDto {
  studentId: string;
  classId?: string;
  subject: string;
  message: string;
  category?: CommunicationCategory;
}

export interface CreateCommunicationReplyDto {
  message: string;
}

export interface UpdateCommunicationStatusDto {
  status: CommunicationStatus;
  notes?: string;
}

export interface CommunicationQueryParams {
  studentId?: string;
  classId?: string;
  status?: CommunicationStatus;
  category?: CommunicationCategory;
  search?: string;
  createdById?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const communicationsAPI = {
  // Create a new communication entry
  create: (data: CreateCommunicationDto) =>
    api.post('/communications', data),

  // Get communications list with filtering
  getAll: (params?: CommunicationQueryParams) =>
    api.get<{ data: Communication[]; meta: { total: number; page: number; limit: number; totalPages: number } }>('/communications', { params }),

  // Get unread communications count
  getUnreadCount: () =>
    api.get<{ count: number }>('/communications/unread-count'),

  // Get my communications count (user-specific for menu/navbar)
  getMyCount: (status?: string) =>
    api.get<{ count: number }>('/communications/my-count', { params: { status } }),

  // Get a single communication by ID
  getById: (id: string) =>
    api.get<Communication>(`/communications/${id}`),

  // Update communication status (OPEN -> CLOSED)
  updateStatus: (id: string, data: UpdateCommunicationStatusDto) =>
    api.put<Communication>(`/communications/${id}/status`, data),

  // Delete a communication (Admin only)
  delete: (id: string) =>
    api.delete(`/communications/${id}`),

  // Add a reply to a communication
  addReply: (communicationId: string, data: CreateCommunicationReplyDto) =>
    api.post<CommunicationReply>(`/communications/${communicationId}/replies`, data),

  // Delete a reply
  deleteReply: (replyId: string) =>
    api.delete(`/communications/replies/${replyId}`),
};

// ==================== STAFF MESSAGING API ====================
export interface MessagingParticipant {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface MessagingLastMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export interface MessagingConversationListItem {
  conversationId: string;
  subject?: string | null;
  participants: MessagingParticipant[];
  lastMessage: MessagingLastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface MessagingMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: MessagingParticipant;
  readAt: string | null;
}

export const messagingAPI = {
  listStaff: (params?: { search?: string }) =>
    api.get<MessagingParticipant[]>('/messages/staff', { params }),

  createConversation: (data: { subject?: string; participants: string[] }) =>
    api.post('/messages/conversation', data),

  listConversations: () =>
    api.get<MessagingConversationListItem[]>('/messages'),

  getMessages: (conversationId: string) =>
    api.get<MessagingMessage[]>(`/messages/${conversationId}`),

  sendMessage: (conversationId: string, data: { content: string }) =>
    api.post(`/messages/${conversationId}`, data),

  markRead: (messageId: string) =>
    api.patch(`/messages/read/${messageId}`),
};

// ==================== ANNOUNCEMENTS API ====================
export interface Announcement {
  id: string;
  title: string;
  content: string;
  visibleTo: string[] | null;
  startDate: string;
  endDate: string | null;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  school?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  visibleTo?: string[];
  startDate: string;
  endDate?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  visibleTo?: string[];
  startDate?: string;
  endDate?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const announcementsAPI = {
  // Create a new announcement (Admin/Registrar only)
  create: (data: CreateAnnouncementDto) =>
    api.post('/announcements', data),

  // Get all active announcements for user's role
  getAll: (params?: { role?: string }) =>
    api.get<Announcement[]>('/announcements', { params }),

  // Get active announcements count
  getActiveCount: (params?: { role?: string }) =>
    api.get<{ count: number }>('/announcements/active-count', { params }),

  // Get a single announcement by ID
  getById: (id: string) =>
    api.get<Announcement>(`/announcements/${id}`),

  // Update an announcement (Admin/Registrar only)
  update: (id: string, data: UpdateAnnouncementDto) =>
    api.put<Announcement>(`/announcements/${id}`, data),

  // Delete an announcement (Admin/Registrar only)
  delete: (id: string) =>
    api.delete(`/announcements/${id}`),
};

// ==================== EVENTS API ====================
export interface Event {
  id: string;
  title: string;
  description: string;
  location?: string;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  eventType: 'ACADEMIC' | 'EXTRACURRICULAR' | 'ADMINISTRATIVE' | 'SPORTS' | 'OTHER';
  visibleTo: string[] | null;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  school?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDto {
  title: string;
  description: string;
  location?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  eventType?: 'ACADEMIC' | 'EXTRACURRICULAR' | 'ADMINISTRATIVE' | 'SPORTS' | 'OTHER';
  visibleTo?: string[];
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  eventType?: 'ACADEMIC' | 'EXTRACURRICULAR' | 'ADMINISTRATIVE' | 'SPORTS' | 'OTHER';
  visibleTo?: string[];
}

export const eventsAPI = {
  // Create a new event (Admin only)
  create: (data: CreateEventDto) =>
    api.post('/events', data),

  // Get all active events for user's role
  getAll: (params?: { role?: string }) =>
    api.get<Event[]>('/events', { params }),

  // Get active events count
  getActiveCount: (params?: { role?: string }) =>
    api.get<{ count: number }>('/events/active-count', { params }),

  // Get a single event by ID
  getById: (id: string) =>
    api.get<Event>(`/events/${id}`),

  // Update an event (Admin only)
  update: (id: string, data: UpdateEventDto) =>
    api.put<Event>(`/events/${id}`, data),

  // Delete an event (Admin only)
  delete: (id: string) =>
    api.delete(`/events/${id}`),
};

// ==================== LESSONS API ====================

export interface Lesson {
  id: string;
  schoolId: string;
  academicYearId: string;
  semesterId?: string;
  grade: number;
  section: string;
  stream?: string;
  subjectId: string;
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
  teacherId: string;
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
  title: string;
  objective?: string;
  lessonContent?: string;
  homework?: string;
  lessonDate: string;
  periodNumber: number;
  status: 'DRAFT' | 'PUBLISHED' | 'COVERED' | 'MISSED' | 'RESCHEDULED';
  attachments?: LessonAttachment[];
  academicYear?: {
    id: string;
    name: string;
  };
  semester?: {
    id: string;
    name: string;
  };
  createdAt: string;
  // For parent view - child info
  studentName?: string;
  studentId?: string;
  childGrade?: number;
  childSection?: string;
  updatedAt: string;
}

export interface LessonAttachment {
  id: string;
  lessonId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy: string;
  createdAt: string;
}

export interface CreateLessonDto {
  title: string;
  objective?: string;
  lessonContent?: string;
  homework?: string;
  grade: number;
  section: string;
  stream?: string;
  academicYearId: string;
  semesterId?: string;
  subjectId: string;
  lessonDate: string;
  periodNumber: number;
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface UpdateLessonDto {
  title?: string;
  objective?: string;
  lessonContent?: string;
  homework?: string;
  grade?: number;
  section?: string;
  stream?: string;
  academicYearId?: string;
  semesterId?: string;
  subjectId?: string;
  lessonDate?: string;
  periodNumber?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'COVERED' | 'MISSED' | 'RESCHEDULED';
}

export interface LessonCoverageReport {
  bySubject: Array<{
    subject: string;
    grade: number;
    section: string;
    total: number;
    published: number;
    draft: number;
    covered: number;
    missed: number;
    rescheduled: number;
  }>;
  byGrade: Array<{
    grade: number;
    section: string;
    total: number;
    published: number;
    draft: number;
    covered: number;
    missed: number;
    rescheduled: number;
  }>;
  totalLessons: number;
  published: number;
  draft: number;
  covered: number;
  missed: number;
  rescheduled: number;
}

export const lessonsAPI = {
  create: (data: CreateLessonDto) =>
    api.post<Lesson>('/lessons', data),

  getAll: (params?: { 
    grade?: number; 
    section?: string; 
    semesterId?: string; 
    subjectId?: string; 
    startDate?: string; 
    endDate?: string; 
    status?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{ data: Lesson[]; meta: any }>('/lessons', { params }),

  getById: (id: string) =>
    api.get<Lesson>(`/lessons/${id}`),

  update: (id: string, data: UpdateLessonDto) =>
    api.put<Lesson>(`/lessons/${id}`, data),

  delete: (id: string) =>
    api.delete(`/lessons/${id}`),

  publish: (id: string) =>
    api.patch<Lesson>(`/lessons/${id}/publish`),

  getCoverageReport: (academicYearId: string, semesterId?: string) =>
    api.get<LessonCoverageReport>('/lessons/coverage', { params: { academicYearId, semesterId } }),

  getFormData: () =>
    api.get<{
      academicYears: Array<{ id: string; name: string; isActive: boolean }>;
      activeAcademicYearId: string | null;
      terms: Array<{ id: string; name: string }>;
      grades: number[];
      sectionsByGrade: Record<number, Array<{ id: string; name: string; classId: string }>>;
      allSubjects: Array<{ id: string; name: string; code?: string }>;
      teacherSubjects: Array<{ id: string; name: string; code?: string }>;
      periods: Array<{ value: number; label: string }>;
    }>('/lessons/form-data'),

  getForStudent: () =>
    api.get<{ data: Lesson[]; meta: any }>('/lessons'),

  getForParent: (studentId?: string) =>
    api.get<{ data: Lesson[]; meta: any }>('/lessons', { params: { studentId } }),
};

// ==================== HR API ====================

export const hrAPI = {
  // Employees
  createEmployee: (data: {
    email: string;
    name: string;
    phone?: string;
    employeeId?: string;
    position?: string;
    hireDate?: string;
  }) =>
    api.post('/hr/employees', data),

  getEmployees: (params?: { search?: string; position?: string; department?: string; page?: number; limit?: number }) =>
    api.get('/hr/employees', { params }),

  getEmployeeById: (id: string) =>
    api.get(`/hr/employees/${id}`),

  updateEmployee: (id: string, data: any) =>
    api.put(`/hr/employees/${id}`, data),

  deleteEmployee: (id: string) =>
    api.delete(`/hr/employees/${id}`),

  // Payroll - HR endpoints
  createPayroll: (data: { academicYear: string; month: number; year: number; paymentDate?: string }) =>
    api.post('/hr/payroll', data),

  calculatePayroll: (payrollId: string, items: any[]) =>
    api.post(`/hr/payroll/${payrollId}/calculate`, { items }),

  submitPayrollToFinance: (payrollId: string) =>
    api.post(`/hr/payroll/${payrollId}/submit`),

  calculatePayroll: (payrollId: string, items: any[]) =>
    api.post(`/hr/payroll/${payrollId}/calculate`, { items }),

  submitPayrollToFinance: (payrollId: string) =>
    api.post(`/hr/payroll/${payrollId}/submit`),

  getPayrolls: (params?: { academicYear?: string; month?: number; year?: number; status?: string; page?: number; limit?: number }) =>
    api.get('/hr/payroll', { params }),

  getPayrollById: (id: string) =>
    api.get(`/hr/payroll/${id}`),

  // Legacy - for compatibility
  processPayroll: (payrollId: string, items: any[]) =>
    api.post(`/hr/payroll/${payrollId}/process`, { items }),

  // Payroll - Finance endpoints
  getPayrollsFinance: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/finance/payroll', { params }),

  getPayrollByIdFinance: (id: string) =>
    api.get(`/finance/payroll/${id}`),

  processPaymentToBank: (payrollId: string) =>
    api.post(`/finance/payroll/${payrollId}/process-payment`),

  markPayrollPaid: (id: string, paymentReference?: string) =>
    api.patch(`/finance/payroll/${id}/mark-paid`, { paymentReference }),

  getPayrollReports: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/finance/payroll/reports', { params }),

  // Salary Structure
  createSalaryStructure: (data: {
    name: string;
    position: string;
    baseSalary: number;
    houseAllowance?: number;
    transportAllowance?: number;
    medicalAllowance?: number;
    otherAllowances?: number;
    pensionRate?: number;
    taxRate?: number;
  }) =>
    api.post('/hr/salary-structure', data),

  getSalaryStructures: () =>
    api.get('/hr/salary-structure'),

  updateSalaryStructure: (id: string, data: any) =>
    api.put(`/hr/salary-structure/${id}`, data),

  deleteSalaryStructure: (id: string) =>
    api.delete(`/hr/salary-structure/${id}`),

  // Attendance
  recordAttendance: (employeeId: string, attendances: { date: string; status: string; remarks?: string }[]) =>
    api.post(`/hr/attendance/${employeeId}`, { attendances }),

  getAttendance: (params?: { startDate?: string; endDate?: string; employeeId?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/hr/attendance', { params }),

  getEmployeeAttendance: (employeeId: string, startDate?: string, endDate?: string) =>
    api.get(`/hr/attendance/${employeeId}`, { params: { startDate, endDate } }),

  // Teacher: Get own attendance (via HR)
  getMyAttendance: (startDate?: string, endDate?: string) =>
    api.get('/hr/attendance/me', { params: { startDate, endDate } }),

  // Dashboard
  getDashboardStats: () =>
    api.get('/hr/dashboard/stats'),

  // Leave Requests
  createLeaveRequest: (data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    contactDuringLeave?: string;
  }) =>
    api.post('/leave-requests', data),

  getLeaveRequests: (params?: { status?: string; leaveType?: string; employeeId?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/leave-requests', { params }),

  getMyLeaveRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/leave-requests/my', { params }),

  getMyLeaveBalance: () =>
    api.get('/leave-requests/my/balance'),

  getLeaveRequestById: (id: string) =>
    api.get(`/leave-requests/${id}`),

  approveLeaveRequest: (id: string, comments?: string) =>
    api.patch(`/leave-requests/${id}/approve`, { comments }),

  rejectLeaveRequest: (id: string, rejectionReason: string) =>
    api.patch(`/leave-requests/${id}/reject`, { rejectionReason }),

  cancelLeaveRequest: (id: string) =>
    api.delete(`/leave-requests/${id}`),
};

// ==================== BULK UPLOAD API ====================

export interface BulkUploadResult {
  status: 'success' | 'partial' | 'failed';
  message: string;
  totalRecords?: number;
  successfulCount?: number;
  failedCount?: number;
  summary?: {
    totalRecords: number;
    successfulCount: number;
    failedCount: number;
  };
  failedRecords: Array<{
    record: {
      full_name: string;
      email: string;
      phone?: string;
      role: string;
    };
    error: string;
  }>;
  hasMoreFailures: boolean;
  totalFailures: number;
  credentials: Array<{
    name: string;
    email: string;
    username: string;
    temporaryPassword?: string;
    role: string;
  }>;
}

export const bulkUploadAPI = {
  // Upload bulk users from CSV file
  uploadUsers: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (academicYear) {
      formData.append('academicYear', academicYear);
    }
    return api.post<BulkUploadResult>('/bulk-upload/users', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload bulk students from CSV file (with class/section)
  uploadStudents: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (academicYear) {
      formData.append('academicYear', academicYear);
    }
    return api.post<BulkUploadResult>('/bulk-upload/students', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload bulk staff from CSV file
  uploadStaff: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (academicYear) {
      formData.append('academicYear', academicYear);
    }
    return api.post<BulkUploadResult>('/bulk-upload/staff', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload bulk parents from CSV file
  uploadParents: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (academicYear) {
      formData.append('academicYear', academicYear);
    }
    return api.post<BulkUploadResult>('/bulk-upload/parents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload bulk students with auto-assignment from CSV file
  uploadStudentsAuto: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (academicYear) {
      formData.append('academicYear', academicYear);
    }
    return api.post<BulkUploadResult>('/bulk-upload/students-auto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get CSV template
  getTemplate: (type: 'student' | 'staff' | 'parent' | 'students-auto' = 'student') =>
    api.get(`/bulk-upload/template?type=${type}`, { responseType: 'blob' }),

  // Validate file before upload
  validateFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/bulk-upload/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Generate credential report
  generateReport: (credentials: Array<{
    name: string;
    email: string;
    username: string;
    temporaryPassword: string;
    role: string;
  }>) =>
    api.post('/bulk-upload/report', { credentials }, { responseType: 'blob' }),

  // Get pending credentials
  getPendingCredentials: (options?: {
    includeSent?: boolean;
    role?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.includeSent) params.append('includeSent', 'true');
    if (options?.role) params.append('role', options.role);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    return api.get(`/bulk-upload/credentials?${params.toString()}`);
  },

  // Mark credential as sent
  markCredentialSent: (id: string, sentVia?: string) =>
    api.post(`/bulk-upload/credentials/${id}/mark-sent`, { sentVia }),

  // Mark multiple credentials as sent
  markCredentialsSentBulk: (credentialIds: string[], sentVia?: string) =>
    api.post('/bulk-upload/credentials/mark-sent-bulk', { credentialIds, sentVia }),

  // Delete a credential
  deleteCredential: (id: string) =>
    api.post(`/bulk-upload/credentials/${id}/delete`),

  // Export credentials as CSV
  exportCredentials: (options?: { includeSent?: boolean; role?: string }) => {
    const params = new URLSearchParams();
    if (options?.includeSent) params.append('includeSent', 'true');
    if (options?.role) params.append('role', options.role);
    
    return api.get(`/bulk-upload/credentials/export?${params.toString()}`, { responseType: 'blob' });
  },
};

// ==================== FINANCE API ====================

export const financeAPI = {
  // Fee Structure
  createFeeStructure: (data: {
    schoolId: string;
    academicYearId: string;
    termId?: string;
    feeType: string;
    amount: number;
    grade?: number;
    semester?: number;
    description?: string;
  }) => api.post('/finance/fee-structures', data),

  listFeeStructures: (schoolId: string, academicYearId?: string, termId?: string) =>
    api.get('/finance/fee-structures', { params: { schoolId, academicYearId, termId } }),

  updateFeeStructure: (id: string, schoolId: string, data: {
    feeType?: string;
    amount?: number;
    grade?: number | null;
    semester?: number | null;
    description?: string | null;
    isActive?: boolean;
  }) => api.put(`/finance/fee-structures/${id}?schoolId=${schoolId}`, data),

  deleteFeeStructure: (id: string, schoolId: string) =>
    api.delete(`/finance/fee-structures/${id}?schoolId=${schoolId}`),

  // Student Fees
  generateStudentFees: (data: {
    schoolId: string;
    academicYearId: string;
    termId?: string;
    grade?: number;
  }) => api.post('/finance/student-fees/generate', data),

  listStudentFees: (params: {
    schoolId: string;
    academicYearId?: string;
    termId?: string;
    studentId?: string;
    grade?: number;
    sectionId?: string;
    status?: 'PAID' | 'PARTIAL' | 'PENDING';
    page?: number;
    limit?: number;
  }) => api.get('/finance/student-fees', { params }),

  // Get curriculum info (curriculum type and terms)
  getCurriculumInfo: (schoolId: string, academicYearId: string) =>
    api.get('/finance/curriculum-info', { params: { schoolId, academicYearId } }),

  // Payments
  recordPayment: (data: {
    schoolId: string;
    studentFeeId: string;
    studentId: string;
    amountPaid: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
    transactionReference?: string;
    paymentDate?: string;
    notes?: string;
  }) => api.post('/finance/payments/record', data),

  getAllPayments: (params: { schoolId: string }) =>
    api.get('/finance/payments', { params }),

  // Reports
  getDailyReport: (params: { schoolId: string; from?: string; to?: string; termId?: string; academicYearId?: string }) =>
    api.get('/finance/reports/daily', { params }),

  getMonthlyReport: (schoolId: string, month: number, year: number) =>
    api.get('/finance/reports/monthly', { params: { schoolId, month, year } }),

  getOutstandingBalances: (schoolId: string, academicYearId: string, termId?: string) =>
    api.get('/finance/reports/outstanding', { params: { schoolId, academicYearId, termId } }),

  getStudentPaymentHistory: (studentId: string, schoolId: string) =>
    api.get(`/finance/reports/student/${studentId}/history`, { params: { schoolId } }),

  getStudentFees: (studentId: string, schoolId: string, academicYearId?: string) =>
    api.get(`/finance/student-fees/${studentId}`, { params: { schoolId, academicYearId } }),

  // Intelligent Fee Calculation
  calculateInstallmentFees: (data: {
    schoolId: string;
    academicYearId: string;
    feeType: string;
    annualAmount: number;
    grade?: number;
    description?: string;
  }) => api.post('/finance/fee-calculation/installments', data),

  generateInstallmentFees: (data: {
    schoolId: string;
    academicYearId: string;
    feeType?: string;
    grade?: number;
  }) => api.post('/finance/fee-structures/generate-installments', data),

  getFeeCollectionMode: (schoolId: string) =>
    api.get('/finance/fee-collection-mode', { params: { schoolId } }),

  // Overdue Handling
  markOverdueFees: (data: { schoolId: string; academicYearId: string; termId?: string }) =>
    api.post('/finance/fees/mark-overdue', data),

  getOverdueReport: (schoolId: string, academicYearId: string, termId?: string) =>
    api.get('/finance/reports/overdue', { params: { schoolId, academicYearId, termId } }),

  // Audit Logs
  getAuditLogs: (schoolId: string, entityType?: string, entityId?: string, limit?: number) =>
    api.get('/finance/audit-logs', { params: { schoolId, entityType, entityId, limit } }),
};

// Calendar API for Ethiopian calendar support
export const calendarAPI = {
  // Get current Ethiopian year
  getCurrentEthiopianYear: () => api.get('/calendar/ethiopian-year'),
  
  // Get current date in both calendars
  getCurrentDate: () => api.get('/calendar/current'),
  
  // Convert Gregorian date to Ethiopian
  convertDate: (date: string) => api.get('/calendar/convert', { params: { date } }),
  
  // Convert Ethiopian date to Gregorian
  convertToGregorian: (year: number, month: number, day: number) => 
    api.get('/calendar/convert-to-gregorian', { params: { year, month, day } }),
  
  // Get calendar mode for a school
  getSchoolCalendarMode: (schoolId: string) => api.get(`/calendar/school/${schoolId}/mode`),
  
  // Check if Ethiopian new year period
  checkNewYear: (date?: string) => api.get('/calendar/new-year-check', { params: { date } }),
};

// ==================== EXAM SEATING API ====================

export const examSeatingAPI = {
  // Get all seating plans for the school
  getSeatingPlans: () => api.get('/exams/seating/plans'),

  // Get seating plan by exam ID
  getSeatingPlanByExam: (examId: string) => api.get(`/exams/seating/${examId}/seating-plan`),

  // Create a new seating plan
  createSeatingPlan: (examId: string, data: {
    mode: 'SINGLE_GRADE' | 'GRADE_RANGE';
    fromGrade: number;
    toGrade?: number;
    shuffle: boolean;
    sectionIds: string[];
  }) => api.post(`/exams/seating/${examId}/seating-plan`, data),

  // Generate seating assignments
  generateSeating: (planId: string) => api.post(`/exams/seating/plan/${planId}/generate`),

  // Get seating overview
  getSeatingOverview: (planId: string) => api.get(`/exams/seating/plan/${planId}`),

  // Delete seating plan
  deleteSeatingPlan: (planId: string) => api.delete(`/exams/seating/plan/${planId}`),

  // Download PDF report
  downloadPdfReport: (planId: string) => api.get(`/exams/seating/plan/${planId}/print`, { responseType: 'blob' }),
};

// ==================== GLOBAL SEARCH API ====================

export interface SearchResult {
  type: 'student' | 'teacher' | 'parent' | 'staff' | 'exam' | 'lesson' | 'announcement' | 'event' | 'class' | 'section' | 'subject' | 'grade' | 'attendance' | 'payment' | 'message';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export type SearchableEntity = 
  | 'students' 
  | 'teachers' 
  | 'parents' 
  | 'staff'
  | 'exams'
  | 'lessons'
  | 'announcements'
  | 'events'
  | 'classes'
  | 'sections'
  | 'subjects'
  | 'grades'
  | 'attendance'
  | 'payments'
  | 'messages'
  | 'finance'
  | 'hr';

export const searchAPI = {
  globalSearch: (query: string) =>
    api.get('/search', { params: { q: query } }),
  getCategories: () =>
    api.get('/search/categories'),
};

// ==================== REPORT CARD API ====================

export type ReportCardStatus = 'DRAFT' | 'PUBLISHED';

export interface ReportCard {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  sectionId: string;
  academicYear: string;
  term: string;
  status: ReportCardStatus;
  totalMarks: number | null;
  percentage: number | null;
  overallGrade: string | null;
  rank: number | null;
  rankInClass: number | null;
  totalDays: number | null;
  presentDays: number | null;
  absentDays: number | null;
  attendancePercentage: number | null;
  teacherRemarks: string | null;
  principalRemarks: string | null;
  gradeDetails: GradeDetail[];
  coCurricular: string | null;
  behavior: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; name: string; avatarUrl?: string };
  class?: { id: string; name: string; section: string; grade: number | null };
  generatedBy?: { id: string; name: string };
}

export interface GradeDetail {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  caScore: number | null;
  midScore: number | null;
  finalScore: number | null;
  totalScore: number;
  gradeLetter: string;
  gradePoint: number;
  status: string;
}

export interface PromotionCandidate {
  student: { id: string; name: string; avatarUrl?: string };
  status: 'PROMOTED' | 'RETAINED' | 'NO_DATA';
  reasons?: string[];
  averageGrade: number;
  attendance: number;
  overallGrade?: string;
  reportCardId?: string;
}

export const reportCardsAPI = {
  getAll: (params?: { classId?: string; academicYear?: string; term?: string; status?: ReportCardStatus; studentId?: string }) =>
    api.get<ReportCard[]>('/report-cards', { params }),

  getById: (id: string) =>
    api.get<ReportCard>(`/report-cards/${id}`),

  getByStudent: (studentId: string) =>
    api.get<ReportCard[]>(`/report-cards/student/${studentId}`),

  getByClass: (classId: string, params?: { academicYear?: string; term?: string }) =>
    api.get<ReportCard[]>(`/report-cards/class/${classId}`, { params }),

  generate: (data: { studentId: string; classId: string; sectionId: string; termId: string; termName: string }) =>
    api.post<ReportCard>('/report-cards/generate', data),

  bulkGenerate: (data: { classId: string; sectionId: string; termId: string; termName: string }) =>
    api.post<{ generated: number; failed: number; errors: string[] }>('/report-cards/bulk-generate', data),

  publish: (ids: string[]) =>
    api.put<{ published: number }>('/report-cards/publish', { ids }),

  unpublish: (ids: string[]) =>
    api.put<{ unpublished: number }>('/report-cards/unpublish', { ids }),

  calculateRanks: (data: { classId: string; academicYear: string; term: string }) =>
    api.post<number>('/report-cards/calculate-ranks', data),

  updateRemarks: (id: string, data: { teacherRemarks?: string; principalRemarks?: string; coCurricular?: string; behavior?: string }) =>
    api.put<ReportCard>(`/report-cards/${id}/remarks`, data),

  delete: (id: string) =>
    api.delete(`/report-cards/${id}`),
};

export const promotionAPI = {
  getCandidates: (classId: string, params?: { academicYear?: string }) =>
    api.get<{ className: string; academicYear: string; totalStudents: number; candidates: PromotionCandidate[] }>(`/promotion/candidates/${classId}`, { params }),

  getNextClasses: (classId: string) =>
    api.get<{ currentClass: { id: string; name: string; grade: number | null }; nextClasses: { id: string; name: string; grade: number | null }[]; isLastGrade: boolean; graduationEnabled: boolean }>(`/promotion/next-classes/${classId}`),

  promoteSingle: (data: { studentId: string; fromClassId: string; toClassId: string; fromAcademicYear: string; toAcademicYear: string }) =>
    api.post('/promotion/single', data),

  bulkPromote: (data: { fromClassId: string; toClassId: string; fromAcademicYear: string; toAcademicYear: string; studentIds: string[]; promoteAll: boolean; minAverageGrade?: number; minAttendance?: number }) =>
    api.post<{ promoted: number; retained: number; failed: number; errors: string[] }>('/promotion/bulk', data),

  getHistory: (params?: { academicYear?: string; classId?: string }) =>
    api.get('/promotion/history', { params }),
};

// ==================== ENROLLMENT API ====================

export interface EnrollmentRequest {
  id: string;
  schoolId: string;
  academicYearId: string;
  status: 'PENDING' | 'DOCUMENTS_PENDING' | 'APPROVED' | 'REJECTED' | 'WAITLISTED' | 'CANCELLED';
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality?: string;
  email?: string;
  phone?: string;
  address?: string;
  previousSchool?: string;
  previousGrade?: number;
  transferCertificate: boolean;
  parentFirstName: string;
  parentLastName: string;
  parentPhone: string;
  parentEmail?: string;
  parentRelation: string;
  requestedGrade: number;
  requestedSection?: string;
  allocatedClassId?: string;
  allocatedSectionId?: string;
  allocatedRollNumber?: number;
  allocatedStudentCode?: string;
  userId?: string;
  rejectionReason?: string;
  approvedAt?: string;
  createdAt: string;
  academicYear?: { id: string; name: string };
  allocatedClass?: { id: string; name: string };
  allocatedSection?: { id: string; name: string };
}

export interface EnrollmentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  waitlisted: number;
  byGrade: { grade: number; count: number }[];
}

export interface EnrollmentCredentials {
  student: {
    userId: string;
    username: string;
    password: string;
    studentCode: string;
    class: string;
    section: string;
    rollNumber: number;
  };
  parent: {
    userId: string;
    username: string;
    password: string;
    phone: string;
  };
}

export interface EnrollmentStatus {
  isOpen: boolean;
  academicYearId: string | null;
  academicYearName: string | null;
  message: string;
}

export const enrollmentAPI = {
  // Public endpoints
  getStatus: (schoolId: string) =>
    api.get('/enrollment/status', { params: { schoolId } }),

  submitRequest: (data: {
    schoolId: string;
    academicYearId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    nationality?: string;
    email?: string;
    phone?: string;
    address?: string;
    previousSchool?: string;
    previousGrade?: number;
    transferCertificate?: boolean;
    parentFirstName: string;
    parentLastName: string;
    parentPhone: string;
    parentEmail?: string;
    parentRelation: string;
    requestedGrade: number;
    documents?: Record<string, boolean>;
  }) => api.post('/enrollment/request', data),

  checkCapacity: (schoolId: string, grade: number) =>
    api.get(`/enrollment/capacity/${grade}`, { params: { schoolId } }),

  getAvailableGrades: (schoolId: string) =>
    api.get('/enrollment/grades', { params: { schoolId } }),

  // Protected endpoints (Admin/Registrar)
  listRequests: (params: {
    schoolId: string;
    academicYearId?: string;
    status?: string;
    grade?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get('/enrollment/requests', { params }),

  getStats: (schoolId: string, academicYearId?: string) =>
    api.get('/enrollment/stats', { params: { schoolId, academicYearId } }),

  getRequest: (id: string, schoolId: string) =>
    api.get(`/enrollment/requests/${id}`, { params: { schoolId } }),

  approveEnrollment: (id: string, schoolId: string) =>
    api.post(`/enrollment/requests/${id}/approve`, {}, { params: { schoolId } }),

  rejectEnrollment: (id: string, schoolId: string, reason: string) =>
    api.post(`/enrollment/requests/${id}/reject`, { reason }, { params: { schoolId } }),

  waitlistEnrollment: (id: string, schoolId: string) =>
    api.post(`/enrollment/requests/${id}/waitlist`, {}, { params: { schoolId } }),

  cancelEnrollment: (id: string, schoolId: string) =>
    api.delete(`/enrollment/requests/${id}`, { params: { schoolId } }),

  sendCredentials: (id: string, schoolId: string, data: { sendEmail?: boolean; sendSms?: boolean }) =>
    api.post(`/enrollment/requests/${id}/send-credentials`, data, { params: { schoolId } }),
};
