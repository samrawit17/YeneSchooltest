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
    (event: AppEvent & {
        payload: T;
    }): void | Promise<void>;
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
    'fee.paid': {
        schoolId: string;
        studentId: string;
        amount: number;
    };
    'fee.overdue': {
        schoolId: string;
        studentId: string;
        amount: number;
        dueDate?: string;
    };
    'student.created': {
        schoolId: string;
        studentId: string;
        grade: string;
    };
    'grade.updated': {
        schoolId: string;
        studentId: string;
        grade: string;
        previousGrade?: string;
        updatedBy?: string;
    };
    'grade.published': {
        schoolId: string;
        gradeId: string;
        studentCount: number;
        publishedBy: string;
    };
    'enrollment.created': {
        schoolId: string;
        studentId: string;
        classId: string;
        gradeId: string;
    };
    'enrollment.approved': {
        schoolId: string;
        studentId: string;
        studentName: string;
        className?: string;
        approvedBy: string;
    };
    'enrollment.rejected': {
        schoolId: string;
        studentId: string;
        studentName: string;
        className?: string;
        rejectedBy: string;
        reason?: string;
    };
    'lesson.created': {
        schoolId: string;
        lessonId: string;
        classId: string;
        subjectId: string;
        title: string;
        createdBy: string;
    };
    'lesson.updated': {
        schoolId: string;
        lessonId: string;
        changes: string[];
        updatedBy: string;
    };
    'lesson.deleted': {
        schoolId: string;
        lessonId: string;
        title: string;
        deletedBy: string;
    };
    'grading.completed': {
        schoolId: string;
        gradingId: string;
        classId: string;
        subjectId: string;
        studentIds: string[];
        gradedBy: string;
    };
    'grading.published': {
        schoolId: string;
        reportCardId: string;
        classId: string;
        termId: string;
        publishedBy: string;
    };
    'communication.sent': {
        schoolId: string;
        communicationId: string;
        type: string;
        channel: string;
        recipientCount: number;
        sentBy: string;
    };
    'communication.send-sms': {
        schoolId: string;
        userId: string;
        to: string;
        message: string;
        title?: string;
    };
    'communication.send-bulk-sms': {
        schoolId: string;
        userIds: string[];
        messages: Array<{
            userId: string;
            to: string;
        }>;
        title?: string;
        message: string;
    };
    'announcement.created': {
        schoolId: string;
        announcementId: string;
        title: string;
        audience: string;
        createdBy: string;
    };
    'message.sent': {
        schoolId: string;
        messageId: string;
        senderId: string;
        recipientId: string;
        conversationId: string;
    };
    'discipline.created': {
        schoolId: string;
        incidentId: string;
        studentId: string;
        severity: string;
        reportedBy: string;
    };
    'school-event.created': {
        schoolId: string;
        eventId: string;
        title: string;
        audience: string;
        startDate: string;
        createdBy: string;
    };
    'school-event.updated': {
        schoolId: string;
        eventId: string;
        changes: string[];
        updatedBy: string;
    };
    'school-event.deleted': {
        schoolId: string;
        eventId: string;
        title: string;
        deletedBy: string;
    };
    'siren.triggered': {
        schoolId: string;
        sirenId: string;
        type: string;
        triggerType: string;
        triggeredBy: string;
    };
    'siren.resolved': {
        schoolId: string;
        sirenId: string;
        resolvedBy: string;
    };
    'school.created': {
        schoolId: string;
        schoolName: string;
        email: string;
        createdBy?: string | null;
    };
    'school.updated': {
        schoolId: string;
        schoolName: string;
        changes: string[];
        updatedBy?: string | null;
    };
    'school.deleted': {
        schoolId: string;
        schoolName: string;
        deletedBy?: string | null;
    };
    'subscription.plan.created': {
        planId: string;
        name: string;
        tier: string;
        createdBy?: string | null;
    };
    'subscription.plan.updated': {
        planId: string;
        name: string;
        tier: string;
        changes: string[];
        updatedBy?: string | null;
    };
    'subscription.plan.deleted': {
        planId: string;
        name: string;
        tier: string;
        deletedBy?: string | null;
    };
    'subscription.assigned': {
        schoolId: string;
        schoolName: string;
        planId: string | null;
        planName: string | null;
        assignedBy?: string | null;
    };
    'admin.created': {
        adminId: string;
        email: string;
        name: string;
        schoolId: string;
        createdBy?: string | null;
    };
    'admin.deleted': {
        adminId: string;
        email: string;
        schoolId: string;
        deletedBy?: string | null;
    };
    'it-manager.created': {
        itManagerId: string;
        email: string;
        name: string;
        schoolId: string;
        createdBy?: string | null;
    };
    'platform.settings.updated': {
        settings: Record<string, any>;
        keys: string[];
        updatedBy?: string | null;
    };
    'backup.downloaded': {
        schoolId?: string;
        backupType: string;
        fileName: string;
        downloadedBy?: string | null;
    };
    'permission.created': {
        permissionId: string;
        name: string;
        module: string;
        createdBy?: string | null;
    };
    'permission.updated': {
        permissionId: string;
        name: string;
        changes: string[];
        updatedBy?: string | null;
    };
    'permission.deleted': {
        permissionId: string;
        name: string;
        deletedBy?: string | null;
    };
    'role.permission.assigned': {
        role: string;
        permissionId: string;
        permissionName: string;
        assignedBy?: string | null;
    };
    'role.permission.removed': {
        role: string;
        permissionId: string;
        permissionName: string;
        removedBy?: string | null;
    };
    'academic-year.activated': {
        schoolId: string;
        academicYearId: string;
        name: string;
        activatedBy: string;
    };
    'academic-year.created': {
        schoolId: string;
        academicYearId: string;
        name: string;
        createdBy: string;
    };
    'term.activated': {
        schoolId: string;
        academicYearId: string;
        termId: string;
        name: string;
    };
    'term.ended': {
        schoolId: string;
        academicYearId: string;
        termId: string;
        name: string;
    };
    'teacher.assigned': {
        schoolId: string;
        teacherId: string;
        teacherName: string;
        classId?: string;
        className?: string;
        subjectId?: string;
        subjectName?: string;
        role: 'homeroom' | 'subject';
        assignedBy: string;
    };
    'teacher.unassigned': {
        schoolId: string;
        teacherId: string;
        teacherName: string;
        classId?: string;
        className?: string;
        subjectId?: string;
        subjectName?: string;
        role: 'homeroom' | 'subject';
        unassignedBy: string;
    };
    'parent.linked': {
        schoolId: string;
        parentId: string;
        parentName: string;
        studentId: string;
        studentName: string;
        linkedBy: string;
    };
    'parent.unlinked': {
        schoolId: string;
        parentId: string;
        parentName: string;
        studentId: string;
        studentName: string;
        unlinkedBy: string;
    };
    'class.created': {
        schoolId: string;
        classId: string;
        name: string;
        grade: number;
        section: string;
        academicYearId: string;
        createdBy: string;
    };
    'class.updated': {
        schoolId: string;
        classId: string;
        name: string;
        grade: number;
        section: string;
        changes: string[];
        updatedBy: string;
    };
    'class.deleted': {
        schoolId: string;
        classId: string;
        name: string;
        grade: number;
        section: string;
        deletedBy: string;
    };
    'timetable.created': {
        schoolId: string;
        slotId: string;
        classId: string;
        sectionId?: string;
        subjectName: string;
        day: string;
        startTime: string;
        endTime: string;
        teacherId: string;
        createdBy: string;
    };
    'timetable.updated': {
        schoolId: string;
        slotId: string;
        classId: string;
        sectionId?: string;
        subjectName: string;
        changes: string[];
        updatedBy: string;
    };
    'timetable.deleted': {
        schoolId: string;
        slotId: string;
        classId: string;
        sectionId?: string;
        subjectName: string;
        day: string;
        deletedBy: string;
    };
    'sync.attendance.batch': {
        schoolId: string;
        items: Array<{
            operation: string;
            entity: string;
            entityId: string;
            payload: Record<string, any>;
            localModified: string;
        }>;
        deviceId?: string;
        actorId: string;
    };
    'sync.mark-entry.batch': {
        schoolId: string;
        items: Array<{
            operation: string;
            entity: string;
            entityId: string;
            payload: Record<string, any>;
            localModified: string;
        }>;
        deviceId?: string;
        actorId: string;
    };
    'sync.setting.changed': {
        schoolId: string;
        key: string;
        value: any;
        scope: string;
        scopeId: string;
        changedBy: string;
    };
};
export type EventType = keyof EventMap;
