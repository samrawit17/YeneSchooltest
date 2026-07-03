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
exports.AutomationEngineController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const automation_engine_service_1 = require("./automation-engine.service");
const automation_engine_dto_1 = require("./dto/automation-engine.dto");
let AutomationEngineController = class AutomationEngineController {
    automationService;
    constructor(automationService) {
        this.automationService = automationService;
    }
    listRules(req, query) {
        return this.automationService.listRules(req.user.schoolId, query);
    }
    getRule(req, id) {
        return this.automationService.getRule(req.user.schoolId, id);
    }
    createRule(req, dto) {
        return this.automationService.createRule(req.user.schoolId, req.user.id, dto);
    }
    updateRule(req, id, dto) {
        return this.automationService.updateRule(req.user.schoolId, id, dto);
    }
    deleteRule(req, id) {
        return this.automationService.deleteRule(req.user.schoolId, id);
    }
    toggleRule(req, id, dto) {
        return this.automationService.toggleRule(req.user.schoolId, id, dto.isActive);
    }
    getLogs(req, query) {
        return this.automationService.getLogs(req.user.schoolId, query);
    }
    getLog(req, id) {
        return this.automationService.getLog(req.user.schoolId, id);
    }
    getEventTypes() {
        return this.automationService.getAvailableEventTypes();
    }
    getActionTypes() {
        return this.automationService.getAvailableActionTypes();
    }
};
exports.AutomationEngineController = AutomationEngineController;
__decorate([
    (0, common_1.Get)('rules'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "listRules", null);
__decorate([
    (0, common_1.Get)('rules/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "getRule", null);
__decorate([
    (0, common_1.Post)('rules'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, automation_engine_dto_1.CreateRuleDto]),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "createRule", null);
__decorate([
    (0, common_1.Patch)('rules/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, automation_engine_dto_1.UpdateRuleDto]),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Delete)('rules/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "deleteRule", null);
__decorate([
    (0, common_1.Patch)('rules/:id/toggle'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, automation_engine_dto_1.ToggleRuleDto]),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "toggleRule", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, automation_engine_dto_1.AutomationLogQueryDto]),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Get)('logs/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "getLog", null);
__decorate([
    (0, common_1.Get)('event-types'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.IT_MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "getEventTypes", null);
__decorate([
    (0, common_1.Get)('action-types'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.IT_MANAGER),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AutomationEngineController.prototype, "getActionTypes", null);
exports.AutomationEngineController = AutomationEngineController = __decorate([
    (0, common_1.Controller)('automation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.AllowSuperAdminMixedRole)(),
    __metadata("design:paramtypes", [automation_engine_service_1.AutomationEngineService])
], AutomationEngineController);
//# sourceMappingURL=automation-engine.controller.js.map