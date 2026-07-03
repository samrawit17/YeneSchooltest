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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
let RolesService = class RolesService {
    prismaService;
    eventBus;
    constructor(prismaService, eventBus) {
        this.prismaService = prismaService;
        this.eventBus = eventBus;
    }
    async getRolePermissions(role) {
        return this.prismaService.rolePermission.findMany({
            where: { role },
            include: { permission: true },
        });
    }
    async assignPermissionToRole(role, permissionId) {
        const result = await this.prismaService.rolePermission.create({
            data: { role, permissionId },
            include: { permission: true },
        });
        void this.eventBus.emit('role.permission.assigned', {
            role: result.role,
            permissionId: result.permissionId,
            permissionName: result.permission.name,
        });
        return result;
    }
    async removePermissionFromRole(role, permissionId) {
        const permission = await this.prismaService.permission.findUnique({
            where: { id: permissionId },
            select: { name: true },
        });
        await this.prismaService.rolePermission.delete({
            where: { role_permissionId: { role, permissionId } },
        });
        void this.eventBus.emit('role.permission.removed', {
            role,
            permissionId,
            permissionName: permission?.name || permissionId,
        });
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], RolesService);
//# sourceMappingURL=roles.service.js.map