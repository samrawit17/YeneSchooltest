import api from './core';

export const financeAPI = {
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
  updateFeeStructure: (
    id: string,
    schoolId: string,
    data: {
      feeType?: string;
      amount?: number;
      grade?: number | null;
      semester?: number | null;
      description?: string | null;
      isActive?: boolean;
    }
  ) => api.put(`/finance/fee-structures/${id}?schoolId=${schoolId}`, data),
  deleteFeeStructure: (id: string, schoolId: string) =>
    api.delete(`/finance/fee-structures/${id}?schoolId=${schoolId}`),
  clearFeeStructures: (schoolId: string, academicYearId?: string) =>
    api.delete(`/finance/fee-structures?schoolId=${schoolId}${academicYearId ? `&academicYearId=${academicYearId}` : ''}`),
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
  getCurriculumInfo: (schoolId: string, academicYearId: string) =>
    api.get('/finance/curriculum-info', { params: { schoolId, academicYearId } }),
  recordPayment: (data: {
    schoolId: string;
    studentFeeId: string;
    studentId: string;
    termId?: string;
    amountPaid: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';
    transactionReference?: string;
    paymentDate?: string;
    notes?: string;
  }) => api.post('/finance/payments/record', data),
  reversePayment: (paymentId: string, data: { schoolId: string; reason?: string }) =>
    api.post(`/finance/payments/${paymentId}/reverse`, data),
  sendPeriodFeeReminders: (data: { schoolId: string; termId: string }) =>
    api.post('/finance/reminders/period-fees', data),
  getAllPayments: (params: { schoolId: string }) => api.get('/finance/payments', { params }),
  getDailyReport: (params: {
    schoolId: string;
    from?: string;
    to?: string;
    termId?: string;
    academicYearId?: string;
  }) => api.get('/finance/reports/daily', { params }),
  getMonthlyReport: (schoolId: string, month: number, year: number) =>
    api.get('/finance/reports/monthly', { params: { schoolId, month, year } }),
  getOutstandingBalances: (
    schoolId: string,
    academicYearId: string,
    termId?: string,
    calendarType?: 'ETHIOPIAN' | 'GREGORIAN',
  ) =>
    api.get('/finance/reports/outstanding', {
      params: { schoolId, academicYearId, termId, calendarType },
    }),
  getStudentPaymentHistory: (studentId: string, schoolId: string) =>
    api.get(`/finance/reports/student/${studentId}/history`, { params: { schoolId } }),
  getStudentFees: (studentId: string, schoolId: string, academicYearId?: string, termId?: string) =>
    api.get(`/finance/student-fees/${studentId}`, { params: { schoolId, academicYearId, termId } }),
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
    annualAmount?: number;
    grade?: number;
    description?: string;
  }) => api.post('/finance/fee-structures/generate-installments', data),
  getFeeCollectionMode: (schoolId: string) =>
    api.get('/finance/fee-collection-mode', { params: { schoolId } }),
  markOverdueFees: (data: { schoolId: string; academicYearId: string; termId?: string }) =>
    api.post('/finance/fees/mark-overdue', data),
  getOverdueReport: (schoolId: string, academicYearId: string, termId?: string) =>
    api.get('/finance/reports/overdue', { params: { schoolId, academicYearId, termId } }),
  getAuditLogs: (schoolId: string, entityType?: string, entityId?: string, limit?: number) =>
    api.get('/finance/audit-logs', { params: { schoolId, entityType, entityId, limit } }),
};
