import { PrismaService } from '../prisma/prisma.service';
import { InAppNotificationProvider } from './providers/in-app.provider';
import { PushNotificationProvider } from './providers/push.provider';
import { NotificationChannelRouter } from './providers/channel-router.service';
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
    DISCIPLINE_INCIDENT_CREATED = "DISCIPLINE_INCIDENT_CREATED",
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
    PAYROLL_PAYMENT_DUE = "PAYROLL_PAYMENT_DUE",
    PAYROLL_RUN_REQUIRED = "PAYROLL_RUN_REQUIRED",
    SYSTEM_ALERT = "SYSTEM_ALERT",
    SIREN_ALERT = "SIREN_ALERT",
    ACCOUNT_CREATED = "ACCOUNT_CREATED",
    PASSWORD_RESET = "PASSWORD_RESET",
    INFO = "INFO",
    WARNING = "WARNING",
    ALERT = "ALERT"
}
export declare class NotificationService {
    private readonly prisma;
    private readonly inAppProvider;
    private readonly pushProvider;
    private readonly router;
    private readonly logger;
    private readonly platformBackupReminderDays;
    private readonly platformDangerDbSizeMb;
    constructor(prisma: PrismaService, inAppProvider: InAppNotificationProvider, pushProvider: PushNotificationProvider, router: NotificationChannelRouter);
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
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    createBulkNotifications(data: {
        schoolId: string;
        userIds: string[];
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
    }): Promise<{
        count: number;
    }>;
    createGlobalNotification(data: {
        schoolId: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
    }): Promise<{
        count: number;
    }>;
    createPlatformNotification(data: {
        userId: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
    }): Promise<{
        schoolId: any;
        userId: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    getUserNotifications(userId: string, userRole: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
        type?: string;
        types?: string[];
        category?: string;
        schoolId?: string;
    }): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    }[]>;
    getNotificationCategories(userId: string, userRole: string, schoolId?: string): Promise<Record<string, {
        total: number;
        unread: number;
    }>>;
    getUnreadCount(userId: string, userRole: string, schoolId?: string, types?: string[]): Promise<number>;
    markAsRead(notificationId: string, userId: string, schoolId?: string, userRole?: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | null>;
    markAllAsRead(userId: string, schoolId?: string, types?: string[]): Promise<{
        success: boolean;
    }>;
    getNotificationPreferences(userId: string, userRole: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
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
    } | null>;
    updateNotificationPreferences(userId: string, userRole: string, data: Record<string, any>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
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
    } | null>;
    savePushSubscription(data: {
        schoolId: string;
        userId: string;
        subscription: {
            endpoint: string;
            keys?: {
                p256dh?: string;
                auth?: string;
            };
            expirationTime?: number | null;
        };
        userAgent?: string;
    }): Promise<any>;
    removePushSubscription(userId: string, endpoint: string): Promise<{
        success: boolean;
    }>;
    isWebPushConfigured(): boolean;
    getWebPushPublicKey(): string | null;
    notifyAdminsOfNewEnrollment(schoolId: string, studentName: string, grade: string): Promise<{
        count: number;
    }>;
    notifyEnrollmentApproval(schoolId: string, userId: string, studentName: string, className: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyEnrollmentRejection(schoolId: string, userId: string, studentName: string, reason?: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyParentOfAbsence(schoolId: string, parentId: string, studentName: string, date: string, className: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyParentOfLate(schoolId: string, parentId: string, studentName: string, time: string, className: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyTeacherAttendanceSession(schoolId: string, teacherId: string, className: string, subject: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyTeacherAttendanceReminder(schoolId: string, teacherId: string, className: string, subject: string, startTime: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyHomeroomMissingAttendance(schoolId: string, teacherId: string, className: string, grade: number, section: string, date: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyStudentsOfAssignment(schoolId: string, studentIds: string[], assignmentTitle: string, dueDate: string, className: string): Promise<{
        count: number;
    }>;
    notifyParentsOfAssignment(schoolId: string, parentIds: string[], assignmentTitle: string, dueDate: string, studentName: string): Promise<{
        count: number;
    }>;
    notifyStudentOfGrade(schoolId: string, studentId: string, assignmentTitle: string, grade: string, className: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyParentOfChildGrade(schoolId: string, parentId: string, studentName: string, assignmentTitle: string, grade: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
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
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyPaymentReceived(schoolId: string, userId: string, amount: string, receiptNumber: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyNewMessage(schoolId: string, userId: string, senderName: string, preview: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyAccountCreated(schoolId: string, userId: string, tempPassword?: boolean): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    sendSchoolAnnouncement(schoolId: string, title: string, message: string): Promise<{
        count: number;
    }>;
    sendRoleAnnouncement(schoolId: string, role: string, title: string, message: string): Promise<{
        count: number;
    }>;
    createSystemAlert(schoolId: string, title: string, message: string, actionUrl?: string): Promise<{
        count: number;
    }>;
    notifyClassCancellation(schoolId: string, teacherIds: string[], className: string, date: string, reason?: string): Promise<{
        count: number;
    }>;
    notifyStudentsOfClassCancellation(schoolId: string, studentIds: string[], className: string, subject: string, date: string): Promise<{
        count: number;
    }>;
    notifyAccountDeactivated(userId: string, schoolId: string, reason?: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyAccountActivated(userId: string, schoolId: string): Promise<{
        id: string;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        message: string;
        userId: string | null;
        type: string;
        metadata: string | null;
        title: string;
        isRead: boolean;
        actionUrl: string | null;
    } | {
        schoolId: string;
        userId?: string;
        title: string;
        message: string;
        type: string;
        actionUrl?: string;
        metadata?: any;
        bypassPreferences?: boolean;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    notifyTeachersOfSiren(schoolId: string, type: string, triggerType: string, targetTeacherIds?: string[]): Promise<{
        count: number;
    }>;
    sendSchoolPickupReminders(): Promise<void>;
    sendSuperAdminPlatformNotifications(): Promise<void>;
    private parsePositiveInt;
}
