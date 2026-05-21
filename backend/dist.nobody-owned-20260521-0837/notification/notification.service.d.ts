import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
type PushSubscriptionPayload = {
    endpoint: string;
    expirationTime?: number | null;
    keys?: {
        p256dh?: string;
        auth?: string;
    };
};
export declare enum NotificationType {
    ATTENDANCE_MARKED = "ATTENDANCE_MARKED",
    ATTENDANCE_ABSENT = "ATTENDANCE_ABSENT",
    ATTENDANCE_LATE = "ATTENDANCE_LATE",
    ATTENDANCE_SESSION_OPENED = "ATTENDANCE_SESSION_OPENED",
    ATTENDANCE_SESSION_SUBMITTED = "ATTENDANCE_SESSION_SUBMITTED",
    ENROLLMENT_SUBMITTED = "ENROLLMENT_SUBMITTED",
    ENROLLMENT_APPROVED = "ENROLLMENT_APPROVED",
    ENROLLMENT_REJECTED = "ENROLLMENT_REJECTED",
    ENROLLMENT_PENDING = "ENROLLMENT_PENDING",
    ASSIGNMENT_CREATED = "ASSIGNMENT_CREATED",
    ASSIGNMENT_DUE = "ASSIGNMENT_DUE",
    ASSIGNMENT_GRADED = "ASSIGNMENT_GRADED",
    RESULT_PUBLISHED = "RESULT_PUBLISHED",
    GRADE_UPDATED = "GRADE_UPDATED",
    ASSESSMENT_CREATED = "ASSESSMENT_CREATED",
    SCHEDULE_CHANGED = "SCHEDULE_CHANGED",
    CLASS_CANCELLED = "CLASS_CANCELLED",
    TIMETABLE_UPDATED = "TIMETABLE_UPDATED",
    PICKUP_REMINDER = "PICKUP_REMINDER",
    MESSAGE_RECEIVED = "MESSAGE_RECEIVED",
    ANNOUNCEMENT = "ANNOUNCEMENT",
    COMMUNICATION = "COMMUNICATION",
    EVENT = "EVENT",
    EVENT_UPDATED = "EVENT_UPDATED",
    EVENT_DELETED = "EVENT_DELETED",
    LESSON_PUBLISHED = "LESSON_PUBLISHED",
    LESSON = "LESSON",
    FEE_DUE = "FEE_DUE",
    FEE_PAID = "FEE_PAID",
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
    SYSTEM_ALERT = "SYSTEM_ALERT",
    SIREN_ALERT = "SIREN_ALERT",
    ACCOUNT_CREATED = "ACCOUNT_CREATED",
    PASSWORD_RESET = "PASSWORD_RESET",
    INFO = "INFO",
    WARNING = "WARNING",
    ALERT = "ALERT"
}
type NotificationPreferenceRecord = {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    commBookEnabled: boolean;
    timetableEnabled: boolean;
    attendanceEnabled: boolean;
    announcementsEnabled: boolean;
    assignmentsEnabled: boolean;
    examsEnabled: boolean;
    feesEnabled: boolean;
    eventsEnabled: boolean;
};
export declare class NotificationService {
    private prisma;
    private readonly logger;
    private canViewSchoolGlobalNotifications;
    constructor(prisma: PrismaService);
    private getUserLanguage;
    private parseDateOnlyAsLocalDay;
    private getSchoolCalendarType;
    private translate;
    private buildDefaultPreferencesForRole;
    private getPreferenceCategoryForNotificationType;
    private isNotificationTypeEnabled;
    private ensureNotificationPreferences;
    getNotificationPreferences(userId: string, userRole: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        commBookEnabled: boolean;
        timetableEnabled: boolean;
        attendanceEnabled: boolean;
        announcementsEnabled: boolean;
        assignmentsEnabled: boolean;
        examsEnabled: boolean;
        feesEnabled: boolean;
        eventsEnabled: boolean;
        emailEnabled: boolean;
        smsEnabled: boolean;
        pushEnabled: boolean;
    }>;
    updateNotificationPreferences(userId: string, userRole: string, data: Partial<NotificationPreferenceRecord>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        commBookEnabled: boolean;
        timetableEnabled: boolean;
        attendanceEnabled: boolean;
        announcementsEnabled: boolean;
        assignmentsEnabled: boolean;
        examsEnabled: boolean;
        feesEnabled: boolean;
        eventsEnabled: boolean;
        emailEnabled: boolean;
        smsEnabled: boolean;
        pushEnabled: boolean;
    }>;
    private getPreferenceSnapshotsForUsers;
    private filterEligibleUserIdsForNotification;
    private filterPushEligibleUserIdsForNotification;
    private configureWebPush;
    isWebPushConfigured(): boolean;
    getWebPushPublicKey(): string | null;
    getUserNotifications(userId: string, userRole: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
        type?: string;
        types?: string[];
        category?: string;
        schoolId?: string;
    }): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }[]>;
    private getTypesForCategory;
    getNotificationCategories(userId: string, userRole: string, schoolId?: string): Promise<{
        all: {
            total: number;
            unread: number;
        };
        attendance: {
            total: number;
            unread: number;
        };
        enrollment: {
            total: number;
            unread: number;
        };
        academic: {
            total: number;
            unread: number;
        };
        schedule: {
            total: number;
            unread: number;
        };
        communication: {
            total: number;
            unread: number;
        };
        event: {
            total: number;
            unread: number;
        };
        finance: {
            total: number;
            unread: number;
        };
        system: {
            total: number;
            unread: number;
        };
    }>;
    getUnreadCount(userId: string, userRole: string, schoolId?: string, types?: string[]): Promise<number>;
    markAsRead(notificationId: string, userId: string, schoolId?: string, userRole?: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    } | null>;
    markAllAsRead(userId: string, schoolId?: string, types?: string[]): Promise<{
        success: boolean;
    }>;
    createNotification(data: {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
    }): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    createBulkNotifications(data: {
        schoolId: string;
        userIds: string[];
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
    }): Promise<Prisma.BatchPayload>;
    private toHHMM;
    private normalizeHHMM;
    private parseSettingValue;
    private isWeekend;
    private getLocalDayRange;
    sendSchoolPickupReminders(): Promise<void>;
    private sendPickupReminderForSchool;
    createGlobalNotification(data: {
        schoolId: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
    }): Promise<Prisma.BatchPayload>;
    savePushSubscription(data: {
        schoolId: string;
        userId: string;
        subscription: PushSubscriptionPayload;
        userAgent?: string;
    }): Promise<{
        id: string;
        endpoint: string;
    }>;
    removePushSubscription(userId: string, endpoint: string): Promise<{
        success: boolean;
    }>;
    private buildPushPayload;
    private sendPushToSubscriptions;
    private sendPushToUsers;
    private sendPushToSchool;
    notifyAdminsOfNewEnrollment(schoolId: string, studentName: string, grade: string): Promise<{
        count: number;
    } | undefined>;
    notifyEnrollmentApproval(schoolId: string, userId: string, studentName: string, className: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyEnrollmentRejection(schoolId: string, userId: string, studentName: string, reason?: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyParentOfAbsence(schoolId: string, parentId: string, studentName: string, date: string, className: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyParentOfLate(schoolId: string, parentId: string, studentName: string, time: string, className: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyTeacherAttendanceSession(schoolId: string, teacherId: string, className: string, subject: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyTeacherAttendanceReminder(schoolId: string, teacherId: string, className: string, subject: string, startTime: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyHomeroomMissingAttendance(schoolId: string, teacherId: string, className: string, grade: number, section: string, date: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyStudentsOfAssignment(schoolId: string, studentIds: string[], assignmentTitle: string, dueDate: string, className: string): Promise<{
        count: number;
    }>;
    notifyParentsOfAssignment(schoolId: string, parentIds: string[], assignmentTitle: string, dueDate: string, studentName: string): Promise<{
        count: number;
    }>;
    notifyStudentOfGrade(schoolId: string, studentId: string, assignmentTitle: string, grade: string, className: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyParentOfChildGrade(schoolId: string, parentId: string, studentName: string, assignmentTitle: string, grade: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyResultPublished(schoolId: string, userIds: string[], term: string, className: string): Promise<{
        count: number;
    }>;
    notifyAssessmentStarted(schoolId: string, teacherIds: string[], assessmentTitle: string, assessmentType: string, className: string, subjectName: string, metadata?: Record<string, unknown>): Promise<{
        count: number;
    }>;
    notifyScheduleChange(schoolId: string, userIds: string[], message: string): Promise<{
        count: number;
    }>;
    notifyTimetableUpdate(schoolId: string, userIds: string[], className: string): Promise<{
        count: number;
    }>;
    notifyFeeDue(schoolId: string, userId: string, amount: string, dueDate: string, studentName?: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyPaymentReceived(schoolId: string, userId: string, amount: string, receiptNumber: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyNewMessage(schoolId: string, userId: string, senderName: string, preview: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyAccountCreated(schoolId: string, userId: string, tempPassword?: boolean): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    sendSchoolAnnouncement(schoolId: string, title: string, message: string): Promise<Prisma.BatchPayload>;
    sendRoleAnnouncement(schoolId: string, role: string, title: string, message: string): Promise<Prisma.BatchPayload | undefined>;
    createSystemAlert(schoolId: string, title: string, message: string, actionUrl?: string): Promise<Prisma.BatchPayload>;
    notifyClassCancellation(schoolId: string, teacherIds: string[], className: string, date: string, reason?: string): Promise<{
        count: number;
    }>;
    notifyStudentsOfClassCancellation(schoolId: string, studentIds: string[], className: string, subject: string, date: string): Promise<{
        count: number;
    }>;
    notifyAccountDeactivated(userId: string, schoolId: string, reason?: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyAccountActivated(userId: string, schoolId: string): Promise<{
        message: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string | null;
        title: string;
        type: string;
        isRead: boolean;
        actionUrl: string | null;
        metadata: string | null;
    }>;
    notifyTeachersOfSiren(schoolId: string, type: string, triggerType: string, targetTeacherIds?: string[]): Promise<{
        count: number;
    } | undefined>;
    private formatSirenLabel;
}
export {};
