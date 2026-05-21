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
exports.SeatingController = void 0;
const common_1 = require("@nestjs/common");
const seating_service_1 = require("./seating.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const subscription_decorator_1 = require("../subscription/decorators/subscription.decorator");
const subscription_guard_1 = require("../subscription/guards/subscription.guard");
const seating_dto_1 = require("./dto/seating.dto");
let SeatingController = class SeatingController {
    seatingService;
    constructor(seatingService) {
        this.seatingService = seatingService;
    }
    async getSeatingPlans(req) {
        return this.seatingService.getSeatingPlans(req.user.schoolId);
    }
    async getSeatingPlanByExamType(req, examType) {
        return this.seatingService.getSeatingPlanByExamType(req.user.schoolId, examType);
    }
    async createSeatingPlanByExamType(req, examType, dto) {
        return this.seatingService.createSeatingPlanByExamType(req.user.schoolId, req.user.id, examType, dto);
    }
    async deleteSeatingStudents(req, planId) {
        return this.seatingService.deleteSeatingStudents(req.user.schoolId, planId);
    }
    async generateSeating(req, planId) {
        return this.seatingService.generateSeating(req.user.schoolId, planId);
    }
    async getSeatingOverview(req, planId) {
        return this.seatingService.getSeatingOverview(req.user.schoolId, planId);
    }
    async printSeatingPlan(req, planId, res) {
        return this.seatingService.generatePdfReport(req.user.schoolId, planId, res);
    }
    async exportSeatingExcel(req, planId, res) {
        return this.seatingService.generateExcelReport(req.user.schoolId, planId, res);
    }
    async deleteSeatingPlan(req, planId) {
        return this.seatingService.deleteSeatingPlan(req.user.schoolId, planId);
    }
};
exports.SeatingController = SeatingController;
__decorate([
    (0, common_1.Get)('plans'),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_SEATING'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SeatingController.prototype, "getSeatingPlans", null);
__decorate([
    (0, common_1.Get)('type/:examType/seating-plan'),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_SEATING'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SeatingController.prototype, "getSeatingPlanByExamType", null);
__decorate([
    (0, common_1.Post)('type/:examType/seating-plan'),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_SEATING'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('examType')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, seating_dto_1.CreateSeatingPlanDto]),
    __metadata("design:returntype", Promise)
], SeatingController.prototype, "createSeatingPlanByExamType", null);
__decorate([
    (0, common_1.Delete)('plan/:id/students'),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_SEATING'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SeatingController.prototype, "deleteSeatingStudents", null);
__decorate([
    (0, common_1.Post)('plan/:id/generate'),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_SEATING'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SeatingController.prototype, "generateSeating", null);
__decorate([
    (0, common_1.Get)('plan/:id'),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_SEATING'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SeatingController.prototype, "getSeatingOverview", null);
__decorate([
    (0, common_1.Get)('plan/:id/print'),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_SEATING'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SeatingController.prototype, "printSeatingPlan", null);
__decorate([
    (0, common_1.Get)('plan/:id/excel'),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_SEATING'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.TEACHER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SeatingController.prototype, "exportSeatingExcel", null);
__decorate([
    (0, common_1.Delete)('plan/:id'),
    (0, subscription_decorator_1.RequiresFeature)('EXAM_SEATING'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SeatingController.prototype, "deleteSeatingPlan", null);
exports.SeatingController = SeatingController = __decorate([
    (0, common_1.Controller)('exams/seating'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, subscription_guard_1.SubscriptionGuard),
    __metadata("design:paramtypes", [seating_service_1.SeatingService])
], SeatingController);
//# sourceMappingURL=seating.controller.js.map