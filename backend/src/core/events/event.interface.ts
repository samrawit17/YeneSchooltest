import { QueueName } from '../../infrastructure/queue/queue.constants';

export interface AppEvent {
  eventId: string;
  eventType: string;
  payload: Record<string, any>;
  timestamp: Date;
  metadata: {
    correlationId: string;
    source: string;
    schoolId?: string;
    actorId?: string;
  };
}

export interface EventHandler<T = Record<string, any>> {
  (event: AppEvent & { payload: T }): void | Promise<void>;
}

export type EventWildcardHandler = (event: AppEvent) => void | Promise<void>;

export interface EmitOptions {
  async?: boolean;
  queue?: QueueName;
  delay?: number;
  schoolId?: string;
  actorId?: string;
}

export type EventMap = {
  // ── Attendance ───────────────────────────────────────────────
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
  'attendance.missing.detected': {
    schoolId: string;
    date: string;
    missingClasses: Array<{
      classId: string;
      className: string;
      grade: number | null;
      sectionName: string;
      teacherId: string | null;
      teacherName?: string;
    }>;
    detectedBy: string;
  };

  // ── Assessment ───────────────────────────────────────────────
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

  // ── Exam ─────────────────────────────────────────────────────
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

  // ── Finance ──────────────────────────────────────────────────
  'fee.paid': { schoolId: string; studentId: string; amount: number };
  'fee.overdue': { schoolId: string; studentId: string; amount: number; dueDate?: string };

  // ── Student ──────────────────────────────────────────────────
  'student.created': { schoolId: string; studentId: string; grade: string };
  'grade.updated': { schoolId: string; studentId: string; grade: string; previousGrade?: string; updatedBy?: string };
  'grade.published': { schoolId: string; gradeId: string; studentCount: number; publishedBy: string };

  // ── Enrollment ───────────────────────────────────────────────
  'enrollment.created': { schoolId: string; studentId: string; classId: string; gradeId: string };
  'enrollment.approved': { schoolId: string; studentId: string; studentName: string; className?: string; approvedBy: string };
  'enrollment.rejected': { schoolId: string; studentId: string; studentName: string; className?: string; rejectedBy: string; reason?: string };

  // ── Lesson ───────────────────────────────────────────────────
  'lesson.created': { schoolId: string; lessonId: string; classId: string; subjectId: string; title: string; createdBy: string };
  'lesson.updated': { schoolId: string; lessonId: string; changes: string[]; updatedBy: string };
  'lesson.deleted': { schoolId: string; lessonId: string; title: string; deletedBy: string };

  // ── Grading ──────────────────────────────────────────────────
  'grading.completed': { schoolId: string; gradingId: string; classId: string; subjectId: string; studentIds: string[]; gradedBy: string };
  'grading.published': { schoolId: string; reportCardId: string; classId: string; termId: string; publishedBy: string };

  // ── Communication ────────────────────────────────────────────
  'communication.sent': { schoolId: string; communicationId: string; type: string; channel: string; recipientCount: number; sentBy: string };

  // ── Announcement ─────────────────────────────────────────────
  'announcement.created': { schoolId: string; announcementId: string; title: string; audience: string; createdBy: string };

  // ── Messaging ────────────────────────────────────────────────
  'message.sent': { schoolId: string; messageId: string; senderId: string; recipientId: string; conversationId: string };

  // ── Discipline ───────────────────────────────────────────────
  'discipline.created': { schoolId: string; incidentId: string; studentId: string; severity: string; reportedBy: string };

  // ── School Event (calendar) ──────────────────────────────────
  'school-event.created': { schoolId: string; eventId: string; title: string; audience: string; startDate: string; createdBy: string };
  'school-event.updated': { schoolId: string; eventId: string; changes: string[]; updatedBy: string };
  'school-event.deleted': { schoolId: string; eventId: string; title: string; deletedBy: string };

  // ── Siren ────────────────────────────────────────────────────
  'siren.triggered': { schoolId: string; sirenId: string; type: string; triggerType: string; triggeredBy: string };
  'siren.resolved': { schoolId: string; sirenId: string; resolvedBy: string };

  // ── School (Superadmin) ──────────────────────────────────────
  'school.created': { schoolId: string; schoolName: string; email: string; createdBy?: string | null };
  'school.updated': { schoolId: string; schoolName: string; changes: string[]; updatedBy?: string | null };
  'school.deleted': { schoolId: string; schoolName: string; deletedBy?: string | null };

  // ── Subscription (Superadmin) ────────────────────────────────
  'subscription.plan.created': { planId: string; name: string; tier: string; createdBy?: string | null };
  'subscription.plan.updated': { planId: string; name: string; tier: string; changes: string[]; updatedBy?: string | null };
  'subscription.plan.deleted': { planId: string; name: string; tier: string; deletedBy?: string | null };
  'subscription.assigned': { schoolId: string; schoolName: string; planId: string | null; planName: string | null; assignedBy?: string | null };

  // ── Admin / User (Superadmin) ────────────────────────────────
  'admin.created': { adminId: string; email: string; name: string; schoolId: string; createdBy?: string | null };
  'admin.deleted': { adminId: string; email: string; schoolId: string; deletedBy?: string | null };
  'it-manager.created': { itManagerId: string; email: string; name: string; schoolId: string; createdBy?: string | null };

  // ── Platform Settings ────────────────────────────────────────
  'platform.settings.updated': { settings: Record<string, any>; keys: string[]; updatedBy?: string | null };

  // ── Backup ───────────────────────────────────────────────────
  'backup.downloaded': { schoolId?: string; backupType: string; fileName: string; downloadedBy?: string | null };

  // ── RBAC ─────────────────────────────────────────────────────
  'permission.created': { permissionId: string; name: string; module: string; createdBy?: string | null };
  'permission.updated': { permissionId: string; name: string; changes: string[]; updatedBy?: string | null };
  'permission.deleted': { permissionId: string; name: string; deletedBy?: string | null };
  'role.permission.assigned': { role: string; permissionId: string; permissionName: string; assignedBy?: string | null };
  'role.permission.removed': { role: string; permissionId: string; permissionName: string; removedBy?: string | null };
};

export type EventType = keyof EventMap;
