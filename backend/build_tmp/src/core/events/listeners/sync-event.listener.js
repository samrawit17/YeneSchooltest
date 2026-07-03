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
var SyncEventListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../event-bus.service");
const sync_service_1 = require("../../../sync/sync.service");
let SyncEventListener = SyncEventListener_1 = class SyncEventListener {
    eventBus;
    syncService;
    logger = new common_1.Logger(SyncEventListener_1.name);
    constructor(eventBus, syncService) {
        this.eventBus = eventBus;
        this.syncService = syncService;
        this.eventBus.on('sync.attendance.batch', this.handleAttendanceBatch);
        this.eventBus.on('sync.mark-entry.batch', this.handleMarkEntryBatch);
        this.eventBus.on('sync.setting.changed', this.handleSettingChanged);
    }
    handleAttendanceBatch = async (event) => {
        const { schoolId, items, deviceId, actorId } = event.payload;
        try {
            for (const item of items) {
                if (item.entity !== 'attendance')
                    continue;
                await this.syncService.syncAttendance(item, { id: actorId, schoolId, role: 'TEACHER' }, deviceId);
            }
            this.logger.log(`Synced ${items.length} attendance records (school=${schoolId})`);
        }
        catch (error) {
            this.logger.error(`Failed to sync attendance batch: ${error}`);
        }
    };
    handleMarkEntryBatch = async (event) => {
        const { schoolId, items, actorId } = event.payload;
        try {
            for (const item of items) {
                if (item.entity !== 'mark_entry')
                    continue;
                this.logger.log(`Mark entry sync queued: ${item.entityId} (school=${schoolId})`);
            }
            this.logger.log(`Queued ${items.length} mark entries for sync (school=${schoolId})`);
        }
        catch (error) {
            this.logger.error(`Failed to queue mark entry batch: ${error}`);
        }
    };
    handleSettingChanged = async (event) => {
        const { schoolId, key, value, scope, scopeId, changedBy } = event.payload;
        try {
            this.logger.log(`Setting changed: ${key}=${JSON.stringify(value)} (school=${schoolId}, scope=${scope})`);
        }
        catch (error) {
            this.logger.error(`Failed to process setting change: ${error}`);
        }
    };
};
exports.SyncEventListener = SyncEventListener;
exports.SyncEventListener = SyncEventListener = SyncEventListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        sync_service_1.SyncService])
], SyncEventListener);
//# sourceMappingURL=sync-event.listener.js.map