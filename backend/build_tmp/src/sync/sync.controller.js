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
var SyncController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const event_bus_service_1 = require("../core/events/event-bus.service");
const sync_service_1 = require("./sync.service");
class SyncAttendanceDto {
    operation;
    entityId;
    payload;
    localModified;
}
__decorate([
    (0, class_validator_1.IsIn)(['create', 'update', 'delete']),
    __metadata("design:type", String)
], SyncAttendanceDto.prototype, "operation", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncAttendanceDto.prototype, "entityId", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], SyncAttendanceDto.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncAttendanceDto.prototype, "localModified", void 0);
class SyncResponseDto {
    success;
    serverId;
    version;
    message;
    serverVersion;
    conflicts;
}
class BatchSyncDto {
    items;
}
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], BatchSyncDto.prototype, "items", void 0);
class SyncStatusDto {
    pendingCount;
    lastSyncAt;
    conflicts;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SyncStatusDto.prototype, "pendingCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SyncStatusDto.prototype, "lastSyncAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], SyncStatusDto.prototype, "conflicts", void 0);
let SyncController = SyncController_1 = class SyncController {
    syncService;
    eventBus;
    logger = new common_1.Logger(SyncController_1.name);
    constructor(syncService, eventBus) {
        this.syncService = syncService;
        this.eventBus = eventBus;
    }
    async syncAttendance(dto, req, deviceId) {
        try {
            return await this.syncService.syncAttendance(dto, req.user, deviceId);
        }
        catch (error) {
            if (error instanceof common_1.ConflictException) {
                throw error;
            }
            throw new common_1.BadRequestException(error instanceof Error ? error.message : 'Sync failed');
        }
    }
    async batchSyncAttendance(dto, req, deviceId) {
        const results = [];
        let successful = 0;
        let failed = 0;
        for (const item of dto.items) {
            if (item.entity !== 'attendance')
                continue;
            try {
                const result = await this.syncService.syncAttendance(item, req.user, deviceId);
                results.push(result);
                successful++;
            }
            catch (error) {
                results.push({
                    success: false,
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
                failed++;
            }
        }
        void this.eventBus.emit('sync.attendance.batch', {
            schoolId: req.user.schoolId,
            items: dto.items,
            deviceId,
            actorId: req.user.id,
        });
        return { results, successful, failed };
    }
    async enqueueSync(dto, req, deviceId) {
        const attendanceItems = dto.items.filter(i => i.entity === 'attendance');
        const markItems = dto.items.filter(i => i.entity === 'mark_entry');
        const settingItems = dto.items.filter(i => i.entity === 'setting');
        if (attendanceItems.length > 0) {
            void this.eventBus.emit('sync.attendance.batch', {
                schoolId: req.user.schoolId,
                items: attendanceItems,
                deviceId,
                actorId: req.user.id,
            });
        }
        if (markItems.length > 0) {
            void this.eventBus.emit('sync.mark-entry.batch', {
                schoolId: req.user.schoolId,
                items: markItems,
                deviceId,
                actorId: req.user.id,
            });
        }
        this.logger.log(`Enqueued ${dto.items.length} items for sync (attendance=${attendanceItems.length}, marks=${markItems.length}, settings=${settingItems.length})`);
        return { accepted: dto.items.length, total: dto.items.length };
    }
    async getStudentsForOffline(body, req) {
        return this.syncService.getStudentsForOffline(req.user, body.classIds, body.sectionIds);
    }
    async getConflicts(req) {
        return this.syncService.getConflicts(req.user?.schoolId);
    }
    async resolveConflict(id, body, req) {
        return this.syncService.resolveConflict(id, body.resolution, body.data, req.user?.id);
    }
    async getSyncStatus(req) {
        return this.syncService.getSyncStatus(req.user?.schoolId);
    }
    async healthCheck() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
};
exports.SyncController = SyncController;
__decorate([
    (0, common_1.Post)('attendance'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Headers)('x-device-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SyncAttendanceDto, Object, String]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "syncAttendance", null);
__decorate([
    (0, common_1.Post)('attendance/batch'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Headers)('x-device-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BatchSyncDto, Object, String]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "batchSyncAttendance", null);
__decorate([
    (0, common_1.Post)('queue'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, permissions_decorator_1.Permissions)('attendance:take'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Headers)('x-device-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BatchSyncDto, Object, String]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "enqueueSync", null);
__decorate([
    (0, common_1.Post)('students'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)('student:read'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "getStudentsForOffline", null);
__decorate([
    (0, common_1.Get)('conflicts'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "getConflicts", null);
__decorate([
    (0, common_1.Post)('conflicts/:id/resolve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, permissions_decorator_1.Permissions)('attendance:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "resolveConflict", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, permissions_decorator_1.Permissions)('attendance:read'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "getSyncStatus", null);
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SyncController.prototype, "healthCheck", null);
exports.SyncController = SyncController = SyncController_1 = __decorate([
    (0, common_1.Controller)('api/sync'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [sync_service_1.SyncService,
        event_bus_service_1.EventBusService])
], SyncController);
//# sourceMappingURL=sync.controller.js.map