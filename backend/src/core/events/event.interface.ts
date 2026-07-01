export interface AppEvent {
  eventType: string;
  payload: Record<string, any>;
  timestamp: Date;
  metadata?: {
    correlationId?: string;
    source?: string;
  };
}

export interface EventHandler<T = Record<string, any>> {
  (event: AppEvent & { payload: T }): void | Promise<void>;
}

export type EventWildcardHandler = (event: AppEvent) => void | Promise<void>;

export type EventMap = {
  'attendance.session.opened': {
    schoolId: string;
    sessionId: string;
    classId: string;
    sectionId?: string;
    date: string;
    openedBy: string;
  };
  'attendance.marked': {
    schoolId: string;
    sessionId: string;
    studentId: string;
    status: string;
  };
  'attendance.session.submitted': {
    schoolId: string;
    sessionId: string;
    classId: string;
    sectionId?: string;
    date: string;
    totalStudents: number;
    submittedBy: string;
  };
  'attendance.overridden': {
    schoolId: string;
    recordId: string;
    studentId: string;
    previousStatus: string;
    newStatus: string;
    overriddenBy: string;
    reason?: string;
  };
  'assessment.created': {
    schoolId: string;
    assessmentId: string;
    type: string;
    title: string;
    subjectIds: string[];
    createdBy: string;
  };
  'assessment.updated': {
    schoolId: string;
    assessmentId: string;
    changes: string[];
    updatedBy: string;
  };
  'assessment.locked': {
    schoolId: string;
    assessmentId: string;
  };
  'assessment.scored': {
    schoolId: string;
    assessmentSubjectId: string;
    studentId: string;
    score: number | null;
    isAbsent: boolean;
    scoredBy: string;
  };
  'exam.created': {
    schoolId: string;
    examId: string;
    classId: string;
    subjectId: string;
    type: string;
    maxMarks: number;
  };
  'exam.updated': {
    schoolId: string;
    examId: string;
    changes: string[];
  };
  'exam.results.entered': {
    schoolId: string;
    examId: string;
    studentCount: number;
    enteredBy: string;
  };
  'exam.results.published': {
    schoolId: string;
    classId: string;
    termId: string;
    examCount: number;
  };
  'fee.paid': { schoolId: string; studentId: string; amount: number };
  'fee.overdue': { schoolId: string; studentId: string; amount: number };
  'student.created': { schoolId: string; studentId: string; grade: string };
  'grade.updated': { schoolId: string; studentId: string; grade: string };
  'enrollment.created': { schoolId: string; studentId: string; classId: string };
};
