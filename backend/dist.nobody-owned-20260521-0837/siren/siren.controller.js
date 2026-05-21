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
exports.SirenController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const siren_service_1 = require("./siren.service");
let SirenController = class SirenController {
    sirenService;
    constructor(sirenService) {
        this.sirenService = sirenService;
    }
    async getSchedules(req) {
        return this.sirenService.getSchedules(req.user.schoolId);
    }
    async createSchedule(req, data) {
        return this.sirenService.createSchedule(req.user.schoolId, data);
    }
    async updateSchedule(req, id, data) {
        return this.sirenService.updateSchedule(req.user.schoolId, id, data);
    }
    async deleteSchedule(req, id) {
        return this.sirenService.deleteSchedule(req.user.schoolId, id);
    }
    async getEvents(req, limit) {
        return this.sirenService.getEvents(req.user.schoolId, limit ? parseInt(limit) : 100);
    }
    async getHardwareConfig(req) {
        return this.sirenService.getHardwareConfig(req.user.schoolId);
    }
    async saveHardwareConfig(req, data) {
        return this.sirenService.saveHardwareConfig(req.user.schoolId, data);
    }
    async updateHardwareConfig(req, id, data) {
        return this.sirenService.updateHardwareConfig(req.user.schoolId, id, data);
    }
    async testHardware(data) {
        return this.sirenService.testWebhook(data.webhookUrl, data.timeout);
    }
    async manualTrigger(req, data) {
        return this.sirenService.manualTrigger(req.user.schoolId, data.type);
    }
};
exports.SirenController = SirenController;
__decorate([
    (0, common_1.Get)('schedules'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "getSchedules", null);
__decorate([
    (0, common_1.Post)('schedules'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "createSchedule", null);
__decorate([
    (0, common_1.Put)('schedules/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "updateSchedule", null);
__decorate([
    (0, common_1.Delete)('schedules/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "deleteSchedule", null);
__decorate([
    (0, common_1.Get)('events'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "getEvents", null);
__decorate([
    (0, common_1.Get)('hardware'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "getHardwareConfig", null);
__decorate([
    (0, common_1.Post)('hardware'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "saveHardwareConfig", null);
__decorate([
    (0, common_1.Put)('hardware/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "updateHardwareConfig", null);
__decorate([
    (0, common_1.Post)('hardware/test'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "testHardware", null);
__decorate([
    (0, common_1.Post)('trigger'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SirenController.prototype, "manualTrigger", null);
exports.SirenController = SirenController = __decorate([
    (0, common_1.Controller)('api/siren'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __metadata("design:paramtypes", [siren_service_1.SirenService])
], SirenController);
//# sourceMappingURL=siren.controller.js.map