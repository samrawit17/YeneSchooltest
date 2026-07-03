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
exports.EventController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const event_service_1 = require("./event.service");
const event_dto_1 = require("./dto/event.dto");
const role_enum_1 = require("../auth/types/role.enum");
let EventController = class EventController {
    eventService;
    constructor(eventService) {
        this.eventService = eventService;
    }
    async create(req, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.eventService.create(body, req.user.id, schoolId);
    }
    async findAll(req, role) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        const userRole = role || req.user.role;
        return this.eventService.findAll(schoolId, userRole);
    }
    async getCalendarFeed(req, from, to) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.eventService.findCalendarFeed(schoolId, req.user, {
            from,
            to,
        });
    }
    async getUpcomingCount(req, role) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        const userRole = role || req.user.role;
        const count = await this.eventService.getUpcomingCount(schoolId, userRole);
        return { count };
    }
    async getActiveCount(req, role) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        const userRole = role || req.user.role;
        const count = await this.eventService.getActiveCount(schoolId, userRole);
        return { count };
    }
    async findOne(id, req) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.eventService.findOne(id, schoolId);
    }
    async update(id, req, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.eventService.update(id, body, schoolId);
    }
    async delete(id, req) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { success: false, message: 'School ID is required' };
        }
        return this.eventService.delete(id, schoolId);
    }
};
exports.EventController = EventController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('event:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, event_dto_1.CreateEventDto]),
    __metadata("design:returntype", Promise)
], EventController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('event:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EventController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('calendar-feed'),
    (0, permissions_decorator_1.Permissions)('event:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], EventController.prototype, "getCalendarFeed", null);
__decorate([
    (0, common_1.Get)('upcoming-count'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EventController.prototype, "getUpcomingCount", null);
__decorate([
    (0, common_1.Get)('active-count'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], EventController.prototype, "getActiveCount", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('event:read'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EventController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('event:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, event_dto_1.UpdateEventDto]),
    __metadata("design:returntype", Promise)
], EventController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('event:delete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EventController.prototype, "delete", null);
exports.EventController = EventController = __decorate([
    (0, common_1.Controller)('events'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [event_service_1.EventService])
], EventController);
//# sourceMappingURL=event.controller.js.map