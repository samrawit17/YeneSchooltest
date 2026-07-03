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
exports.SubscriptionController = void 0;
const common_1 = require("@nestjs/common");
const subscription_service_1 = require("./subscription.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
let SubscriptionController = class SubscriptionController {
    subscriptionService;
    constructor(subscriptionService) {
        this.subscriptionService = subscriptionService;
    }
    async getAllPlans() {
        try {
            return await this.subscriptionService.getAllPlans();
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get plans: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getPlanById(id) {
        try {
            const plan = await this.subscriptionService.getPlanById(id);
            if (!plan) {
                throw new common_1.HttpException('Plan not found', common_1.HttpStatus.NOT_FOUND);
            }
            return plan;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get plan: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async createPlan(body) {
        try {
            return await this.subscriptionService.createPlan(body);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to create plan: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async updatePlan(id, body) {
        try {
            const plan = await this.subscriptionService.updatePlan(id, body);
            if (!plan) {
                throw new common_1.HttpException('Plan not found', common_1.HttpStatus.NOT_FOUND);
            }
            return plan;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to update plan: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async deletePlan(id) {
        try {
            return await this.subscriptionService.deletePlan(id);
        }
        catch (error) {
            throw new common_1.HttpException(error.message || 'Failed to delete plan', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async assignPlanToSchool(body) {
        try {
            return await this.subscriptionService.assignPlanToSchool(body.schoolId, body.planId);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to assign plan: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getSchoolPlan(req, schoolId) {
        try {
            this.assertSameSchoolOrSuperAdmin(req.user, schoolId);
            const plan = await this.subscriptionService.getSchoolPlan(schoolId);
            return plan || { tier: 'CORE', features: [] };
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to get school plan: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getSchoolSubscription(req, schoolId) {
        try {
            this.assertSameSchoolOrSuperAdmin(req.user, schoolId);
            return await this.subscriptionService.getSchoolSubscription(schoolId);
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to get subscription: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async createSubscription(body) {
        try {
            return await this.subscriptionService.createSubscription({
                ...body,
                endDate: body.endDate ? new Date(body.endDate) : undefined,
            });
        }
        catch (error) {
            throw new common_1.HttpException('Failed to create subscription: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async updateSubscription(id, body) {
        try {
            return await this.subscriptionService.updateSubscription(id, {
                ...body,
                endDate: body.endDate ? new Date(body.endDate) : undefined,
            });
        }
        catch (error) {
            throw new common_1.HttpException('Failed to update subscription: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getSchoolsByPlan(planId) {
        try {
            return await this.subscriptionService.getSchoolsByPlan(planId);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get schools: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getSchoolsWithPlans(planId) {
        try {
            if (planId) {
                return await this.subscriptionService.getSchoolsByPlan(planId);
            }
            return await this.subscriptionService.getSchoolsWithPlans();
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get schools: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async checkFeature(req, schoolId, feature) {
        try {
            if (!schoolId || !feature) {
                throw new common_1.BadRequestException('schoolId and feature are required');
            }
            this.assertSameSchoolOrSuperAdmin(req.user, schoolId);
            const plan = await this.subscriptionService.getSchoolPlan(schoolId);
            const hasAccess = plan
                ? this.subscriptionService.isFeatureAccessible(plan, feature)
                : false;
            return { hasAccess, feature: feature.trim().toUpperCase(), tier: plan?.tier || 'CORE' };
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException('Failed to check feature: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    assertSameSchoolOrSuperAdmin(user, schoolId) {
        if (user?.role === role_enum_1.Role.SUPER_ADMIN)
            return;
        if (user?.schoolId && user.schoolId === schoolId)
            return;
        throw new common_1.ForbiddenException('You can only access your own school subscription');
    }
};
exports.SubscriptionController = SubscriptionController;
__decorate([
    (0, common_1.Get)('plans'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getAllPlans", null);
__decorate([
    (0, common_1.Get)('plans/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getPlanById", null);
__decorate([
    (0, common_1.Post)('plans'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "createPlan", null);
__decorate([
    (0, common_1.Put)('plans/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "updatePlan", null);
__decorate([
    (0, common_1.Delete)('plans/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "deletePlan", null);
__decorate([
    (0, common_1.Post)('assign'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "assignPlanToSchool", null);
__decorate([
    (0, common_1.Get)('school/:schoolId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getSchoolPlan", null);
__decorate([
    (0, common_1.Get)('school/:schoolId/subscription'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('schoolId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getSchoolSubscription", null);
__decorate([
    (0, common_1.Post)('subscription'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "createSubscription", null);
__decorate([
    (0, common_1.Put)('subscription/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "updateSubscription", null);
__decorate([
    (0, common_1.Get)('plan/:planId/schools'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('planId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getSchoolsByPlan", null);
__decorate([
    (0, common_1.Get)('schools'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Query)('planId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "getSchoolsWithPlans", null);
__decorate([
    (0, common_1.Get)('check-feature'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('schoolId')),
    __param(2, (0, common_1.Query)('feature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], SubscriptionController.prototype, "checkFeature", null);
exports.SubscriptionController = SubscriptionController = __decorate([
    (0, common_1.Controller)('subscription'),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService])
], SubscriptionController);
//# sourceMappingURL=subscription.controller.js.map