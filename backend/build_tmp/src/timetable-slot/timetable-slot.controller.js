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
exports.TimetableSlotController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const timetable_slot_service_1 = require("./timetable-slot.service");
const role_enum_1 = require("../auth/types/role.enum");
const create_timetable_slot_dto_1 = require("./dto/create-timetable-slot.dto");
const update_timetable_slot_dto_1 = require("./dto/update-timetable-slot.dto");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
let TimetableSlotController = class TimetableSlotController {
    timetableSlotService;
    constructor(timetableSlotService) {
        this.timetableSlotService = timetableSlotService;
    }
    async create(req, body) {
        const schoolId = req.user.schoolId || body.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.timetableSlotService.create({
            ...body,
            schoolId,
        });
    }
    async findAll(req, dayOfWeek, classId, teacherId, academicYearId) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.timetableSlotService.findAll(schoolId, {
            dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : undefined,
            classId,
            teacherId,
            academicYearId,
        });
    }
    async findByStudent(req, studentId) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        const resolvedStudentId = studentId === 'me' ? req.user.id : studentId;
        return this.timetableSlotService.getByStudent(schoolId, resolvedStudentId);
    }
    async findByClass(req, classId) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.timetableSlotService.findByClass(schoolId, classId);
    }
    async findByTeacher(req, targetTeacherId, academicYearId) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        const resolvedTeacherId = await this.timetableSlotService.resolveTeacherTimetableTarget(schoolId, req.user, targetTeacherId);
        const result = await this.timetableSlotService.findByTeacher(schoolId, resolvedTeacherId, academicYearId);
        return result;
    }
    async bulkCreate(req, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.timetableSlotService.bulkCreate(schoolId, body.slots);
    }
    async autoGenerate(req, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.timetableSlotService.autoGenerateSectionTimetable(schoolId, body);
    }
    async deleteByClassSection(req, classId, sectionId, academicYearId) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.timetableSlotService.deleteByClassSection(schoolId, classId, sectionId, academicYearId);
    }
    async getTimetableGrid(req, classId, sectionId, academicYearId) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.timetableSlotService.getTimetableGrid(schoolId, classId, sectionId, academicYearId);
    }
    async findOne(req, id) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.timetableSlotService.findOne(id, schoolId);
    }
    async update(req, id, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.timetableSlotService.update(id, schoolId, body);
    }
    async delete(req, id) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.timetableSlotService.delete(id, schoolId);
    }
};
exports.TimetableSlotController = TimetableSlotController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('timetable:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_timetable_slot_dto_1.CreateTimetableSlotDto]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('timetable:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('dayOfWeek')),
    __param(2, (0, common_1.Query)('classId')),
    __param(3, (0, common_1.Query)('teacherId')),
    __param(4, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('student/:studentId'),
    (0, permissions_decorator_1.Permissions)('timetable:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('studentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "findByStudent", null);
__decorate([
    (0, common_1.Get)('class/:classId'),
    (0, permissions_decorator_1.Permissions)('timetable:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('classId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "findByClass", null);
__decorate([
    (0, common_1.Get)('teacher/:teacherId'),
    (0, permissions_decorator_1.Permissions)('timetable:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('teacherId')),
    __param(2, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "findByTeacher", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('timetable:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Post)('auto-generate'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('timetable:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "autoGenerate", null);
__decorate([
    (0, common_1.Delete)('class/:classId/section/:sectionId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('timetable:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('classId')),
    __param(2, (0, common_1.Param)('sectionId')),
    __param(3, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "deleteByClassSection", null);
__decorate([
    (0, common_1.Get)('grid/class/:classId'),
    (0, permissions_decorator_1.Permissions)('timetable:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('classId')),
    __param(2, (0, common_1.Query)('sectionId')),
    __param(3, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "getTimetableGrid", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('timetable:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('timetable:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_timetable_slot_dto_1.UpdateTimetableSlotDto]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('timetable:manage'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TimetableSlotController.prototype, "delete", null);
exports.TimetableSlotController = TimetableSlotController = __decorate([
    (0, common_1.Controller)('timetable-slots'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard, subscription_guard_1.SubscriptionGuard),
    (0, subscription_decorator_1.RequiresFeature)('TIMETABLE_MANAGEMENT'),
    __metadata("design:paramtypes", [timetable_slot_service_1.TimetableSlotService])
], TimetableSlotController);
//# sourceMappingURL=timetable-slot.controller.js.map