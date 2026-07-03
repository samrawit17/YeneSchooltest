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
exports.PermissionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
let PermissionsService = class PermissionsService {
    prismaService;
    eventBus;
    constructor(prismaService, eventBus) {
        this.prismaService = prismaService;
        this.eventBus = eventBus;
    }
    async createPermission(data) {
        const permission = await this.prismaService.permission.create({
            data,
        });
        void this.eventBus.emit('permission.created', {
            permissionId: permission.id,
            name: permission.name,
            module: permission.module,
        });
        return permission;
    }
    async getPermissions() {
        return this.prismaService.permission.findMany();
    }
    async getPermissionById(id) {
        return this.prismaService.permission.findUnique({
            where: { id },
        });
    }
    async getPermissionByName(name) {
        return this.prismaService.permission.findUnique({
            where: { name },
        });
    }
    async updatePermission(id, data) {
        const oldPermission = await this.prismaService.permission.findUnique({
            where: { id },
            select: { name: true },
        });
        const permission = await this.prismaService.permission.update({
            where: { id },
            data,
        });
        const changes = Object.keys(data).filter((key) => data[key] !== undefined);
        void this.eventBus.emit('permission.updated', {
            permissionId: permission.id,
            name: permission.name,
            changes,
        });
        return permission;
    }
    async deletePermission(id) {
        const permission = await this.prismaService.permission.findUnique({
            where: { id },
            select: { id: true, name: true },
        });
        await this.prismaService.permission.delete({
            where: { id },
        });
        if (permission) {
            void this.eventBus.emit('permission.deleted', {
                permissionId: permission.id,
                name: permission.name,
            });
        }
    }
    async getPermissionsByModule(module) {
        return this.prismaService.permission.findMany({
            where: { module },
        });
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map