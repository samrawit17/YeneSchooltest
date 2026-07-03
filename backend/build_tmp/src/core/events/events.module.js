"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../../prisma/prisma.module");
const notification_module_1 = require("../../notification/notification.module");
const queue_module_1 = require("../../infrastructure/queue/queue.module");
const sync_module_1 = require("../../sync/sync.module");
const event_bus_service_1 = require("./event-bus.service");
const event_store_service_1 = require("./event-store.service");
const event_worker_service_1 = require("./event-worker.service");
const dead_letter_queue_service_1 = require("./dead-letter-queue.service");
const superadmin_event_listener_1 = require("./superadmin-event.listener");
const notification_event_listener_1 = require("./listeners/notification-event.listener");
const school_activity_event_listener_1 = require("./listeners/school-activity-event.listener");
const sync_event_listener_1 = require("./listeners/sync-event.listener");
const event_logger_service_1 = require("./event-logger.service");
let EventsModule = class EventsModule {
};
exports.EventsModule = EventsModule;
exports.EventsModule = EventsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, notification_module_1.NotificationModule, queue_module_1.QueueModule, sync_module_1.SyncModule],
        providers: [
            event_bus_service_1.EventBusService,
            event_store_service_1.EventStoreService,
            dead_letter_queue_service_1.DeadLetterQueueService,
            event_worker_service_1.EventWorkerService,
            superadmin_event_listener_1.SuperadminEventListener,
            notification_event_listener_1.NotificationEventListener,
            school_activity_event_listener_1.SchoolActivityEventListener,
            sync_event_listener_1.SyncEventListener,
            event_logger_service_1.EventLoggerService,
        ],
        exports: [event_bus_service_1.EventBusService, event_store_service_1.EventStoreService, dead_letter_queue_service_1.DeadLetterQueueService],
    })
], EventsModule);
//# sourceMappingURL=events.module.js.map