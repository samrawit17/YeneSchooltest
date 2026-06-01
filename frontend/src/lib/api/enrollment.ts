import api from "./core";

export interface EnrollmentRequest {
  id: string;
  schoolId: string;
  academicYearId: string;
  status:
    | "PENDING"
    | "DOCUMENTS_PENDING"
    | "APPROVED"
    | "REJECTED"
    | "WAITLISTED"
    | "CANCELLED";
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  faydaNumber?: string;
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
  requestedStream?: string;
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

export interface PublicEnrollmentSchool {
  id: string;
  name: string;
  code: string | null;
  publicUrlSlug?: string | null;
  logoUrl?: string | null;
  accentColor?: string | null;
  loginImageUrl?: string | null;
}

export interface EnrollmentLandingResponse {
  success: boolean;
  school?: {
    id: string;
    name: string;
  };
  enrollmentToken?: string;
  frontendUrl?: string;
  message?: string;
  error?: string;
  statusCode?: number;
}

export const enrollmentAPI = {
  resolveSchoolByKey: (key: string) =>
    api.get<EnrollmentLandingResponse>("/enroll", {
      params: { key },
      skipAuthErrorRedirect: true,
    }),
  getSchools: () => api.get("/enrollment/schools", { skipAuthErrorRedirect: true }),
  getSchoolById: (id: string) => api.get(`/enrollment/school/${id}`, { skipAuthErrorRedirect: true }),
  getSchoolByUrlSlug: (slug: string) =>
    api.get(`/enrollment/school-url/${encodeURIComponent(slug)}`, {
      skipAuthErrorRedirect: true,
    }),
  getStatus: (schoolId: string) => api.get("/enrollment/status", { params: { schoolId } }),
  submitRequest: (data: {
    schoolId: string;
    academicYearId: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    faydaNumber: string;
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
    requestedStream?: string;
    documents?: Record<string, boolean>;
  }) => api.post("/enrollment/request", data),
  checkCapacity: (schoolId: string, grade: number) =>
    api.get(`/enrollment/capacity/${grade}`, { params: { schoolId } }),
  getAvailableGrades: (schoolId: string) =>
    api.get("/enrollment/grades", { params: { schoolId } }),
  listRequests: (params: {
    schoolId: string;
    academicYearId?: string;
    status?: string;
    grade?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get("/enrollment/requests", { params }),
  getStats: (schoolId: string, academicYearId?: string) =>
    api.get("/enrollment/stats", { params: { schoolId, academicYearId } }),
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
  sendCredentials: (
    id: string,
    schoolId: string,
    data: { sendEmail?: boolean; sendSms?: boolean }
  ) => api.post(`/enrollment/requests/${id}/send-credentials`, data, { params: { schoolId } }),
};
