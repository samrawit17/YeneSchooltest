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
exports.ClassSubjectController = void 0;
const common_1 = require("@nestjs/common");
const class_subject_service_1 = require("./class-subject.service");
const create_class_subject_dto_1 = require("./dto/create-class-subject.dto");
const update_class_subject_dto_1 = require("./dto/update-class-subject.dto");
const bulk_assign_dto_1 = require("./dto/bulk-assign.dto");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
let ClassSubjectController = class ClassSubjectController {
    classSubjectService;
    constructor(classSubjectService) {
        this.classSubjectService = classSubjectService;
    }
    async create(data, req) {
        return this.classSubjectService.create(data, req.user.schoolId);
    }
    async bulkAssign(data, req) {
        return this.classSubjectService.bulkAssign(data, req.user.schoolId);
    }
    async findAll(req, academicYearId) {
        return this.classSubjectService.findAll(req.user.schoolId, academicYearId);
    }
    async getMatrix(req, academicYearId) {
        return this.classSubjectService.getMatrixData(req.user.schoolId, academicYearId);
    }
    async findByClass(classId, req, sectionId) {
        return this.classSubjectService.findByClass(classId, req.user.schoolId, sectionId);
    }
    async findByTeacher(teacherId, req, academicYearId) {
        return this.classSubjectService.findByTeacher(teacherId, req.user.schoolId, academicYearId);
    }
    async findOne(id, req) {
        return this.classSubjectService.findOne(id, req.user.schoolId);
    }
    async update(id, data, req) {
        return this.classSubjectService.update(id, data, req.user.schoolId);
    }
    async delete(id, req) {
        return this.classSubjectService.delete(id, req.user.schoolId);
    }
};
exports.ClassSubjectController = ClassSubjectController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_decorator_1.Permissions)('class:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_class_subject_dto_1.CreateClassSubjectDto, Object]),
    __metadata("design:returntype", Promise)
], ClassSubjectController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk-assign'),
    (0, permissions_decorator_1.Permissions)('class:create'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_assign_dto_1.BulkAssignDto, Object]),
    __metadata("design:returntype", Promise)
], ClassSubjectController.prototype, "bulkAssign", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClassSubjectController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('matrix'),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClassSubjectController.prototype, "getMatrix", null);
__decorate([
    (0, common_1.Get)('by-class/:classId'),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Param)('classId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('sectionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ClassSubjectController.prototype, "findByClass", null);
__decorate([
    (0, common_1.Get)('by-teacher/:teacherId'),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Param)('teacherId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('academicYearId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], ClassSubjectController.prototype, "findByTeacher", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('class:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClassSubjectController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, permissions_decorator_1.Permissions)('class:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_class_subject_dto_1.UpdateClassSubjectDto, Object]),
    __metadata("design:returntype", Promise)
], ClassSubjectController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_decorator_1.Permissions)('class:delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClassSubjectController.prototype, "delete", null);
exports.ClassSubjectController = ClassSubjectController = __decorate([
    (0, common_1.Controller)('class-subjects'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [class_subject_service_1.ClassSubjectService])
], ClassSubjectController);
//# sourceMappingURL=class-subject.controller.js.map