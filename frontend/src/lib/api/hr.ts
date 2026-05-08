import api from "./core";

export const hrAPI = {
  createEmployee: (data: {
    email: string;
    name: string;
    phone?: string;
    employeeId?: string;
    position?: string;
    hireDate?: string;
  }) => api.post("/hr/employees", data),
  getEmployees: (params?: {
    search?: string;
    position?: string;
    department?: string;
    page?: number;
    limit?: number;
  }) => api.get("/hr/employees", { params }),
  getEmployeeById: (id: string) => api.get(`/hr/employees/${id}`),
  updateEmployee: (id: string, data: any) => api.put(`/hr/employees/${id}`, data),
  deleteEmployee: (id: string) => api.delete(`/hr/employees/${id}`),
  createPayroll: (data: { academicYear: string; month: number; year: number; paymentDate?: string }) =>
    api.post("/hr/payroll", data),
  calculatePayroll: (payrollId: string, items: any[]) =>
    api.post(`/hr/payroll/${payrollId}/calculate`, { items }),
  submitPayrollToFinance: (payrollId: string) => api.post(`/hr/payroll/${payrollId}/submit`),
  getPayrolls: (params?: {
    academicYear?: string;
    month?: number;
    year?: number;
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get("/hr/payroll", { params }),
  getPayrollById: (id: string) => api.get(`/hr/payroll/${id}`),
  processPayroll: (payrollId: string, items: any[]) =>
    api.post(`/hr/payroll/${payrollId}/process`, { items }),
  getPayrollsFinance: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get("/finance/payroll", { params }),
  getPayrollByIdFinance: (id: string) => api.get(`/finance/payroll/${id}`),
  processPaymentToBank: (payrollId: string) =>
    api.post(`/finance/payroll/${payrollId}/process-payment`),
  markPayrollPaid: (id: string, paymentReference?: string) =>
    api.patch(`/finance/payroll/${id}/mark-paid`, { paymentReference }),
  getPayrollReports: (params?: { startDate?: string; endDate?: string }) =>
    api.get("/finance/payroll/reports", { params }),
  createSalaryStructure: (data: {
    name: string;
    position: string;
    baseSalary: number;
    houseAllowance?: number;
    medicalAllowance?: number;
    otherAllowances?: number;
    pensionRate?: number;
    taxRate?: number;
  }) => api.post("/hr/salary-structure", data),
  getSalaryStructures: () => api.get("/hr/salary-structure"),
  updateSalaryStructure: (id: string, data: any) => api.put(`/hr/salary-structure/${id}`, data),
  deleteSalaryStructure: (id: string) => api.delete(`/hr/salary-structure/${id}`),
  recordAttendance: (employeeId: string, attendances: { date: string; status: string; remarks?: string }[]) =>
    api.post(`/hr/attendance/${employeeId}`, { attendances }),
  getAttendance: (params?: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get("/hr/attendance", { params }),
  getEmployeeAttendance: (employeeId: string, startDate?: string, endDate?: string) =>
    api.get(`/hr/attendance/${employeeId}`, { params: { startDate, endDate } }),
  getMyAttendance: (startDate?: string, endDate?: string) =>
    api.get("/hr/attendance/me", { params: { startDate, endDate } }),
  getDashboardStats: () => api.get("/hr/dashboard/stats"),
  createLeaveRequest: (data: {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    contactDuringLeave?: string;
  }) => api.post("/leave-requests", data),
  getLeaveRequests: (params?: {
    status?: string;
    leaveType?: string;
    employeeId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get("/leave-requests", { params }),
  getMyLeaveRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get("/leave-requests/my", { params }),
  getMyLeaveBalance: () => api.get("/leave-requests/my/balance"),
  getLeaveRequestById: (id: string) => api.get(`/leave-requests/${id}`),
  approveLeaveRequest: (id: string, comments?: string) =>
    api.patch(`/leave-requests/${id}/approve`, { comments }),
  rejectLeaveRequest: (id: string, rejectionReason: string) =>
    api.patch(`/leave-requests/${id}/reject`, { rejectionReason }),
  cancelLeaveRequest: (id: string) => api.delete(`/leave-requests/${id}`),
};

export interface BulkUploadResult {
  status: "success" | "partial" | "failed";
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
  uploadUsers: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (academicYear) formData.append("academicYear", academicYear);
    return api.post<BulkUploadResult>("/bulk-upload/users", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadStudents: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (academicYear) formData.append("academicYear", academicYear);
    return api.post<BulkUploadResult>("/bulk-upload/students", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadStaff: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (academicYear) formData.append("academicYear", academicYear);
    return api.post<BulkUploadResult>("/bulk-upload/staff", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadParents: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (academicYear) formData.append("academicYear", academicYear);
    return api.post<BulkUploadResult>("/bulk-upload/parents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadStudentsAuto: (file: File, academicYear?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (academicYear) formData.append("academicYear", academicYear);
    return api.post<BulkUploadResult>("/bulk-upload/students-auto", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getTemplate: (type: "student" | "staff" | "parent" | "students-auto" = "student") =>
    api.get(`/bulk-upload/template?type=${type}`, { responseType: "blob" }),
  validateFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/bulk-upload/validate", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  generateReport: (credentials: Array<{
    name: string;
    email: string;
    username: string;
    temporaryPassword: string;
    role: string;
  }>) => api.post("/bulk-upload/report", { credentials }, { responseType: "blob" }),
  getPendingCredentials: (options?: {
    includeSent?: boolean;
    role?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.includeSent) params.append("includeSent", "true");
    if (options?.role) params.append("role", options.role);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    return api.get(`/bulk-upload/credentials?${params.toString()}`);
  },
  markCredentialSent: (id: string, sentVia?: string) =>
    api.post(`/bulk-upload/credentials/${id}/mark-sent`, { sentVia }),
  markCredentialsSentBulk: (credentialIds: string[], sentVia?: string) =>
    api.post("/bulk-upload/credentials/mark-sent-bulk", { credentialIds, sentVia }),
  deleteCredential: (id: string) => api.post(`/bulk-upload/credentials/${id}/delete`),
  exportCredentials: (options?: { includeSent?: boolean; role?: string }) => {
    const params = new URLSearchParams();
    if (options?.includeSent) params.append("includeSent", "true");
    if (options?.role) params.append("role", options.role);
    return api.get(`/bulk-upload/credentials/export?${params.toString()}`, {
      responseType: "blob",
    });
  },
};
