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
var SchoolActivityEventListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolActivityEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../event-bus.service");
const notification_service_1 = require("../../../notification/notification.service");
const prisma_service_1 = require("../../../prisma/prisma.service");
let SchoolActivityEventListener = SchoolActivityEventListener_1 = class SchoolActivityEventListener {
    eventBus;
    notificationService;
    prisma;
    logger = new common_1.Logger(SchoolActivityEventListener_1.name);
    constructor(eventBus, notificationService, prisma) {
        this.eventBus = eventBus;
        this.notificationService = notificationService;
        this.prisma = prisma;
        this.eventBus.on('academic-year.created', this.handleAcademicYearCreated);
        this.eventBus.on('academic-year.activated', this.handleAcademicYearActivated);
        this.eventBus.on('term.activated', this.handleTermActivated);
        this.eventBus.on('teacher.assigned', this.handleTeacherAssigned);
        this.eventBus.on('teacher.unassigned', this.handleTeacherUnassigned);
        this.eventBus.on('parent.linked', this.handleParentLinked);
        this.eventBus.on('parent.unlinked', this.handleParentUnlinked);
        this.eventBus.on('class.created', this.handleClassCreated);
        this.eventBus.on('class.updated', this.handleClassUpdated);
        this.eventBus.on('class.deleted', this.handleClassDeleted);
        this.eventBus.on('timetable.created', this.handleTimetableCreated);
        this.eventBus.on('timetable.updated', this.handleTimetableUpdated);
        this.eventBus.on('timetable.deleted', this.handleTimetableDeleted);
    }
    handleAcademicYearCreated = async (event) => {
        try {
            await this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'ACADEMIC_YEAR_CREATED',
                title: 'Academic Year Created',
                message: `New academic year "${event.payload.name}" has been created.`,
                userId: event.payload.createdBy,
            });
        }
        catch (error) {
            this.logger.error(`academic-year.created handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleAcademicYearActivated = async (event) => {
        try {
            const admins = await this.prisma.user.findMany({
                where: { schoolId: event.payload.schoolId, role: 'ADMIN', isActive: true },
                select: { id: true },
            });
            await Promise.allSettled(admins.map((admin) => this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'ACADEMIC_YEAR_ACTIVATED',
                title: 'Academic Year Activated',
                message: `Academic year "${event.payload.name}" is now active.`,
                userId: admin.id,
            })));
        }
        catch (error) {
            this.logger.error(`academic-year.activated handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleTermActivated = async (event) => {
        try {
            const admins = await this.prisma.user.findMany({
                where: { schoolId: event.payload.schoolId, role: 'ADMIN', isActive: true },
                select: { id: true },
            });
            await Promise.allSettled(admins.map((admin) => this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'TERM_ACTIVATED',
                title: 'Term Created',
                message: `Term "${event.payload.name}" has been created.`,
                userId: admin.id,
            })));
        }
        catch (error) {
            this.logger.error(`term.activated handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleTeacherAssigned = async (event) => {
        try {
            await this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'TEACHER_ASSIGNED',
                title: 'Teacher Assignment',
                message: `${event.payload.teacherName} assigned as ${event.payload.role}${event.payload.className ? ` to ${event.payload.className}` : ''}${event.payload.subjectName ? ` (${event.payload.subjectName})` : ''}.`,
                userId: event.payload.teacherId,
            });
        }
        catch (error) {
            this.logger.error(`teacher.assigned handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleTeacherUnassigned = async (event) => {
        try {
            await this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'TEACHER_UNASSIGNED',
                title: 'Teacher Unassigned',
                message: `${event.payload.teacherName} removed from ${event.payload.role} role${event.payload.className ? ` in ${event.payload.className}` : ''}.`,
                userId: event.payload.teacherId,
            });
        }
        catch (error) {
            this.logger.error(`teacher.unassigned handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleParentLinked = async (event) => {
        try {
            await this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'PARENT_LINKED',
                title: 'Parent Linked',
                message: `${event.payload.parentName} linked to student ${event.payload.studentName}.`,
                userId: event.payload.parentId,
            });
        }
        catch (error) {
            this.logger.error(`parent.linked handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleParentUnlinked = async (event) => {
        try {
            await this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'PARENT_UNLINKED',
                title: 'Parent Unlinked',
                message: `${event.payload.parentName} unlinked from student ${event.payload.studentName}.`,
                userId: event.payload.parentId,
            });
        }
        catch (error) {
            this.logger.error(`parent.unlinked handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleClassCreated = async (event) => {
        try {
            const admins = await this.prisma.user.findMany({
                where: { schoolId: event.payload.schoolId, role: 'ADMIN', isActive: true },
                select: { id: true },
            });
            await Promise.allSettled(admins.map((admin) => this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'CLASS_CREATED',
                title: 'Class Created',
                message: `Class "${event.payload.name}" grade ${event.payload.grade} section ${event.payload.section} has been created.`,
                userId: admin.id,
            })));
        }
        catch (error) {
            this.logger.error(`class.created handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleClassUpdated = async (event) => {
        try {
            await this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'CLASS_UPDATED',
                title: 'Class Updated',
                message: `Class "${event.payload.name}" has been updated (${event.payload.changes.join(', ')}).`,
                userId: event.payload.updatedBy,
            });
        }
        catch (error) {
            this.logger.error(`class.updated handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleClassDeleted = async (event) => {
        try {
            const admins = await this.prisma.user.findMany({
                where: { schoolId: event.payload.schoolId, role: 'ADMIN', isActive: true },
                select: { id: true },
            });
            await Promise.allSettled(admins.map((admin) => this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'CLASS_DELETED',
                title: 'Class Deleted',
                message: `Class "${event.payload.name}" grade ${event.payload.grade} section ${event.payload.section} has been deleted.`,
                userId: admin.id,
            })));
        }
        catch (error) {
            this.logger.error(`class.deleted handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleTimetableCreated = async (event) => {
        try {
            await this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'TIMETABLE_CREATED',
                title: 'Timetable Slot Created',
                message: `New timetable slot created: ${event.payload.subjectName} on ${event.payload.day} (${event.payload.startTime}-${event.payload.endTime}).`,
                userId: event.payload.teacherId,
            });
        }
        catch (error) {
            this.logger.error(`timetable.created handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleTimetableUpdated = async (event) => {
        try {
            await this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'TIMETABLE_UPDATED',
                title: 'Timetable Slot Updated',
                message: `Timetable slot ${event.payload.subjectName} has been updated (${event.payload.changes.join(', ')}).`,
                userId: event.payload.updatedBy,
            });
        }
        catch (error) {
            this.logger.error(`timetable.updated handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleTimetableDeleted = async (event) => {
        try {
            const teachers = await this.prisma.teacherSubjectAssignment.findMany({
                where: { classId: event.payload.classId, schoolId: event.payload.schoolId },
                select: { teacherId: true },
            });
            await Promise.allSettled(teachers.map((t) => this.notificationService.createNotification({
                schoolId: event.payload.schoolId,
                type: 'TIMETABLE_DELETED',
                title: 'Timetable Slot Deleted',
                message: `Timetable slot for ${event.payload.subjectName} on ${event.payload.day} has been removed.`,
                userId: t.teacherId,
            })));
        }
        catch (error) {
            this.logger.error(`timetable.deleted handler failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
};
exports.SchoolActivityEventListener = SchoolActivityEventListener;
exports.SchoolActivityEventListener = SchoolActivityEventListener = SchoolActivityEventListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        notification_service_1.NotificationService,
        prisma_service_1.PrismaService])
], SchoolActivityEventListener);
//# sourceMappingURL=school-activity-event.listener.js.map