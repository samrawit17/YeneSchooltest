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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const attendance_service_1 = require("./attendance.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../../auth/decorators/permissions.decorator");
let AttendanceController = class AttendanceController {
    attendanceService;
    constructor(attendanceService) {
        this.attendanceService = attendanceService;
    }
    getTodayTimetable(req, query) {
        return this.attendanceService.getTodayTimetable(req.user, query.date, query.academicYearId);
    }
    createSession(req, slotId, dto) {
        return this.attendanceService.openAttendanceSession(req.user, slotId, dto.date);
    }
    getStudentsForAttendance(req, classId, sectionId, className, section, date, academicYearId) {
        return this.attendanceService.getStudentsForAttendance(req.user, className, section, date, classId, sectionId, academicYearId);
    }
    getSession(req, sessionId) {
        return this.attendanceService.getSession(sessionId, req.user);
    }
    markAttendance(req, sessionId, dto) {
        return this.attendanceService.bulkMarkAttendance(req.user, sessionId, dto.records);
    }
    submitSession(req, sessionId) {
        return this.attendanceService.submitSession(req.user, sessionId);
    }
    getMyAttendance(req, query) {
        return this.attendanceService.getMyAttendance(req.user, query);
    }
    getMySummary(req, query) {
        return this.attendanceService.getStudentAttendanceSummary(req.user, req.user.id, query.startDate, query.endDate);
    }
    getStudentAttendance(req, studentId, query) {
        return this.attendanceService.getStudentAttendance(req.user, studentId, query);
    }
    getStudentSummary(req, studentId, query) {
        return this.attendanceService.getStudentAttendanceSummary(req.user, studentId, query.startDate, query.endDate);
    }
    getAllSessions(req, startDate, endDate, classId, status, grade, section) {
        return this.attendanceService.getAllSessions(req.user, {
            startDate,
            endDate,
            classId,
            status,
            grade,
            section,
        });
    }
    getSummary(req, query) {
        return this.attendanceService.getSummary(req.user, query);
    }
    getMissing(req, date, grade, section) {
        return this.attendanceService.getMissingClasses(req.user, date, grade, section);
    }
    async notifyMissing(req, date, grade, section) {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return this.attendanceService.notifyMissing(req.user, targetDate, grade, section);
    }
    overrideRecord(req, recordId, dto) {
        return this.attendanceService.overrideAttendance(req.user, recordId, dto);
    }
    getTeacherDashboard(req, academicYearId) {
        return this.attendanceService.getTeacherDashboard(req.user, academicYearId);
    }
    getStudentDashboard(req) {
        return this.attendanceService.getStudentDashboard(req.user);
    }
    getParentDashboard(req, studentId) {
        return this.attendanceService.getParentDashboard(req.user, studentId);
    }
    getAdminDashboard(req, date, startDate, endDate, grade, section, range, academicYearId) {
        return this.attendanceService.getAdminDashboard(req.user, date, startDate, endDate, grade, section, range, academicYearId);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Get)('today'),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.AttendanceQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getTodayTimetable", null);
__decorate([
    (0, common_1.Post)('session/:slotId'),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('slotId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CreateAttendanceSessionDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)('students'),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('classId')),
    __param(2, (0, common_1.Query)('sectionId')),
    __param(3, (0, common_1.Query)('className')),
    __param(4, (0, common_1.Query)('section')),
    __param(5, (0, common_1.Query)('date')),
    __param(6, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getStudentsForAttendance", null);
__decorate([
    (0, common_1.Get)('session/:id'),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getSession", null);
__decorate([
    (0, common_1.Post)('session/:sessionId/records'),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.BulkMarkAttendanceDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "markAttendance", null);
__decorate([
    (0, common_1.Put)('session/:id/submit'),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "submitSession", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.AttendanceQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getMyAttendance", null);
__decorate([
    (0, common_1.Get)('me/summary'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.AttendanceQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getMySummary", null);
__decorate([
    (0, common_1.Get)('student/:id'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.AttendanceQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getStudentAttendance", null);
__decorate([
    (0, common_1.Get)('student/:id/summary'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.AttendanceQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getStudentSummary", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('classId')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('grade')),
    __param(6, (0, common_1.Query)('section')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getAllSessions", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_decorator_1.Permissions)('attendance:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.AttendanceQueryDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('missing'),
    (0, permissions_decorator_1.Permissions)('attendance:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Query)('grade')),
    __param(3, (0, common_1.Query)('section')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getMissing", null);
__decorate([
    (0, common_1.Post)('missing/notify'),
    (0, permissions_decorator_1.Permissions)('attendance:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Query)('grade')),
    __param(3, (0, common_1.Query)('section')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AttendanceController.prototype, "notifyMissing", null);
__decorate([
    (0, common_1.Put)('record/:id'),
    (0, permissions_decorator_1.Permissions)('attendance:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.OverrideAttendanceDto]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "overrideRecord", null);
__decorate([
    (0, common_1.Get)('dashboard/teacher'),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getTeacherDashboard", null);
__decorate([
    (0, common_1.Get)('dashboard/student'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getStudentDashboard", null);
__decorate([
    (0, common_1.Get)('dashboard/parent/:studentId'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getParentDashboard", null);
__decorate([
    (0, common_1.Get)('dashboard/admin'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('grade')),
    __param(5, (0, common_1.Query)('section')),
    __param(6, (0, common_1.Query)('range')),
    __param(7, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getAdminDashboard", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, common_1.Controller)('attendance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map