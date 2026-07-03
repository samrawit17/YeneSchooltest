"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AttendanceEventListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../../core/events/event-bus.service");
const notification_service_1 = require("../../notification/notification.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const school_settings_service_1 = require("../../school-settings/school-settings.service");
const date_util_1 = require("../../common/date.util");
const school_settings_service_2 = require("../../school-settings/school-settings.service");
let AttendanceEventListener = AttendanceEventListener_1 = class AttendanceEventListener {
    eventBus;
    notificationService;
    prisma;
    schoolSettings;
    logger = new common_1.Logger(AttendanceEventListener_1.name);
    constructor(eventBus, notificationService, prisma, schoolSettings) {
        this.eventBus = eventBus;
        this.notificationService = notificationService;
        this.prisma = prisma;
        this.schoolSettings = schoolSettings;
        this.eventBus.on('attendance.session.submitted', this.handleSessionSubmitted);
        this.eventBus.on('attendance.overridden', this.handleOverridden);
    }
    handleSessionSubmitted = async (event) => {
        const { schoolId, sessionId, classId, sectionId, date } = event.payload;
        try {
            const absentRecords = await this.prisma.attendanceRecord.findMany({
                where: {
                    attendanceSessionId: sessionId,
                    status: { in: ['ABSENT', 'LATE'] },
                },
                include: {
                    student: {
                        select: { id: true, name: true },
                    },
                },
            });
            if (absentRecords.length === 0)
                return;
            let className = '';
            if (classId && classId !== 'unknown') {
                const cls = await this.prisma.class.findUnique({
                    where: { id: classId },
                    select: { name: true, grade: true, section: true },
                });
                if (cls) {
                    className = cls.name || `Grade ${cls.grade}`;
                    const secName = sectionId || cls.section;
                    if (secName)
                        className += ` - ${secName}`;
                }
            }
            const calendarType = (await this.schoolSettings.getSetting(schoolId, school_settings_service_2.SCHOOL_SETTING_KEYS.CALENDAR_TYPE)) || 'ETHIOPIAN';
            const dateStr = (0, date_util_1.formatSchoolDate)(new Date(date), {
                calendarType: calendarType === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN',
            });
            const studentUserIds = absentRecords.map((r) => r.student.id);
            const profiles = await this.prisma.studentProfile.findMany({
                where: { userId: { in: studentUserIds } },
                select: { id: true, userId: true },
            });
            const profileIdByUserId = new Map(profiles.map((p) => [p.userId, p.id]));
            const profileIds = profiles.map((p) => p.id);
            const parentRelations = await this.prisma.parentStudent.findMany({
                where: { studentId: { in: profileIds } },
                include: {
                    parent: {
                        select: {
                            user: {
                                select: { id: true },
                            },
                        },
                    },
                },
            });
            const parentByStudentProfile = new Map();
            for (const rel of parentRelations) {
                const existing = parentByStudentProfile.get(rel.studentId) || [];
                existing.push(rel.parent.user.id);
                parentByStudentProfile.set(rel.studentId, existing);
            }
            const results = await Promise.allSettled(absentRecords.map(async (record) => {
                const profileId = profileIdByUserId.get(record.student.id);
                if (!profileId)
                    return;
                const parentIds = parentByStudentProfile.get(profileId) || [];
                if (parentIds.length === 0)
                    return;
                const parentPromises = parentIds.map((parentId) => {
                    if (record.status === 'ABSENT') {
                        return this.notificationService.notifyParentOfAbsence(schoolId, parentId, record.student.name, dateStr, className);
                    }
                    return this.notificationService.notifyParentOfLate(schoolId, parentId, record.student.name, dateStr, className);
                });
                await Promise.allSettled(parentPromises);
            }));
            const failed = results.filter((r) => r.status === 'rejected');
            if (failed.length > 0) {
                this.logger.error(`[correlationId=${event.metadata?.correlationId}] ${failed.length}/${absentRecords.length} absent-notification batches failed for session ${sessionId}`);
            }
        }
        catch (error) {
            this.logger.error(`[correlationId=${event.metadata?.correlationId}] Failed to process attendance.session.submitted for session ${sessionId}: ${error instanceof Error ? error.message : error}`);
        }
    };
    handleOverridden = async (event) => {
        const { schoolId, studentId, newStatus, previousStatus, recordId } = event.payload;
        if (newStatus === previousStatus)
            return;
        try {
            const student = await this.prisma.user.findUnique({
                where: { id: studentId },
                select: { name: true },
            });
            if (!student)
                return;
            const record = await this.prisma.attendanceRecord.findUnique({
                where: { id: recordId },
                include: {
                    session: {
                        select: {
                            date: true,
                            class: { select: { name: true, grade: true, section: true } },
                        },
                    },
                },
            });
            if (!record)
                return;
            const className = record.session.class?.name
                ? record.session.class.name
                : `Grade ${record.session.class?.grade ?? ''}`;
            const calendarType = (await this.schoolSettings.getSetting(schoolId, school_settings_service_2.SCHOOL_SETTING_KEYS.CALENDAR_TYPE)) || 'ETHIOPIAN';
            const dateStr = (0, date_util_1.formatSchoolDate)(record.session.date, {
                calendarType: calendarType === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN',
            });
            const profile = await this.prisma.studentProfile.findUnique({
                where: { userId: studentId },
                select: { id: true },
            });
            if (!profile)
                return;
            const parentRelations = await this.prisma.parentStudent.findMany({
                where: { studentId: profile.id },
                include: {
                    parent: { select: { user: { select: { id: true } } } },
                },
            });
            if (parentRelations.length === 0)
                return;
            await Promise.allSettled(parentRelations.map((rel) => {
                if (newStatus === 'ABSENT' &&
                    previousStatus !== 'ABSENT') {
                    return this.notificationService.notifyParentOfAbsence(schoolId, rel.parent.user.id, student.name, dateStr, className);
                }
                if (newStatus === 'LATE' &&
                    previousStatus !== 'LATE') {
                    return this.notificationService.notifyParentOfLate(schoolId, rel.parent.user.id, student.name, dateStr, className);
                }
                return Promise.resolve();
            }));
        }
        catch (error) {
            this.logger.error(`[correlationId=${event.metadata?.correlationId}] Failed to process attendance.overridden for record ${recordId}: ${error instanceof Error ? error.message : error}`);
        }
    };
};
exports.AttendanceEventListener = AttendanceEventListener;
exports.AttendanceEventListener = AttendanceEventListener = AttendanceEventListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        notification_service_1.NotificationService,
        prisma_service_1.PrismaService,
        school_settings_service_1.SchoolSettingsService])
], AttendanceEventListener);
//# sourceMappingURL=attendance-event.listener.js.map