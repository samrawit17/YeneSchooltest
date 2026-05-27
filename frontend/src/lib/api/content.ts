import api from "./core";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  visibleTo: string[] | null;
  isPublic?: boolean;
  startDate: string;
  endDate: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  createdById: string;
  createdBy?: { id: string; name: string; email: string };
  school?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  visibleTo?: string[];
  isPublic?: boolean;
  startDate: string;
  endDate?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  location?: string;
}

export interface UpdateAnnouncementDto {
  title?: string;
  content?: string;
  visibleTo?: string[];
  isPublic?: boolean;
  startDate?: string;
  endDate?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  location?: string;
}

export const announcementsAPI = {
  create: (data: CreateAnnouncementDto) => api.post("/announcements", data),
  getAll: (
    params?: { role?: string },
    options?: { skipAuthErrorRedirect?: boolean }
  ) =>
    api.get<Announcement[]>("/announcements", {
      params,
      ...(options?.skipAuthErrorRedirect
        ? { skipAuthErrorRedirect: true }
        : {}),
    }),
  getPublic: (schoolId?: string) =>
    api.get<Announcement[]>("/announcements/public", {
      params: schoolId ? { schoolId } : undefined,
      skipAuthErrorRedirect: true,
    }),
  getActiveCount: (params?: { role?: string }) =>
    api.get<{ count: number }>("/announcements/active-count", { params }),
  getById: (id: string) => api.get<Announcement>(`/announcements/${id}`),
  update: (id: string, data: UpdateAnnouncementDto) =>
    api.put<Announcement>(`/announcements/${id}`, data),
  delete: (id: string) => api.delete(`/announcements/${id}`),
};

export interface Event {
  id: string;
  title: string;
  description: string;
  location?: string;
  startDate: string;
  endDate: string | null;
  allDay?: boolean;
  eventType?: "ACADEMIC" | "EXTRACURRICULAR" | "ADMINISTRATIVE" | "SPORTS" | "OTHER";
  visibleTo?: string[] | null;
  audience?: string[] | null;
  category?: "ACADEMIC" | "SPORTS" | "CULTURAL" | "HOLIDAY" | "OTHER";
  color?: string | null;
  createdById: string;
  createdBy?: { id: string; name: string; email: string };
  school?: { id: string; name: string };
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
  eventType?: "ACADEMIC" | "EXTRACURRICULAR" | "ADMINISTRATIVE" | "SPORTS" | "OTHER";
  visibleTo?: string[];
  audience?: string[];
  category?: "ACADEMIC" | "SPORTS" | "CULTURAL" | "HOLIDAY" | "OTHER";
  color?: string;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  eventType?: "ACADEMIC" | "EXTRACURRICULAR" | "ADMINISTRATIVE" | "SPORTS" | "OTHER";
  visibleTo?: string[];
  audience?: string[];
  category?: "ACADEMIC" | "SPORTS" | "CULTURAL" | "HOLIDAY" | "OTHER";
  color?: string;
}

export const eventsAPI = {
  create: (data: CreateEventDto) => api.post("/events", data),
  getAll: (params?: { role?: string }) => api.get<Event[]>("/events", { params }),
  getActiveCount: (params?: { role?: string }) =>
    api.get<{ count: number }>("/events/active-count", { params }),
  getById: (id: string) => api.get<Event>(`/events/${id}`),
  update: (id: string, data: UpdateEventDto) => api.put<Event>(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
};

export interface Lesson {
  id: string;
  schoolId: string;
  academicYearId: string;
  semesterId?: string;
  grade: number;
  section: string;
  stream?: string;
  subjectId: string;
  subject?: { id: string; name: string; code?: string };
  teacherId: string;
  teacher?: { id: string; name: string; email: string };
  title: string;
  objective?: string;
  lessonContent?: string;
  homework?: string | { id?: string; title?: string; description?: string };
  description?: string;
  instructions?: string;
  lessonDate: string;
  periodNumber: number;
  status: "DRAFT" | "PUBLISHED" | "COVERED" | "MISSED" | "RESCHEDULED";
  attachments?: LessonAttachment[];
  academicYear?: { id: string; name: string };
  semester?: { id: string; name: string };
  createdAt: string;
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
  homework?: { title: string; description?: string };
  grade: number;
  section: string;
  academicYearId: string;
  semesterId?: string;
  subjectId: string;
  lessonDate: string;
  periodNumber: number;
  status?: "DRAFT" | "PUBLISHED";
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
  status?: "DRAFT" | "PUBLISHED" | "COVERED" | "MISSED" | "RESCHEDULED";
}

export interface UpdateLessonBundleDto {
  title?: string;
  objective?: string;
  lessonContent?: string;
  periodNumber?: number;
  unitNumber?: number;
  topicName?: string;
  topicId?: string;
  competency?: string;
  status?: "DRAFT" | "PUBLISHED" | "PENDING_REVIEW" | "COVERED" | "MISSED" | "RESCHEDULED";
  isExamPrep?: boolean;
  syllabusMappingId?: string;
  homework?: { title?: string; description?: string };
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
  create: (data: CreateLessonDto) => api.post<Lesson>("/lessons", data),
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
  }) => api.get<{ data: Lesson[]; meta: any }>("/lessons", { params }),
  getById: (id: string) => api.get<Lesson>(`/lessons/${id}`),
  update: (id: string, data: UpdateLessonDto) => api.put<Lesson>(`/lessons/${id}`, data),
  updateBundle: (id: string, data: UpdateLessonBundleDto) =>
    api.put<{ lesson: Lesson }>(`/lessons/bundle/${id}`, data),
  delete: (id: string) => api.delete(`/lessons/${id}`),
  publish: (id: string) => api.patch<Lesson>(`/lessons/${id}/submit-review`),
  getCoverageReport: (academicYearId: string, semesterId?: string) =>
    api.get<LessonCoverageReport>("/lessons/coverage", { params: { academicYearId, semesterId } }),
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
    }>("/lessons/form-data"),
  getForStudent: () => api.get<{ data: Lesson[]; meta: any }>("/lessons"),
  getForParent: (studentId?: string) =>
    api.get<{ data: Lesson[]; meta: any }>("/lessons", { params: { studentId } }),
  listForTeacher: () => api.get<{ data: Lesson[]; meta: any }>("/lessons"),
};
