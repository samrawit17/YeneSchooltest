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
var EventBusService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const queue_constants_1 = require("../../infrastructure/queue/queue.constants");
const event_store_service_1 = require("./event-store.service");
let EventBusService = EventBusService_1 = class EventBusService {
    queueService;
    eventStore;
    logger = new common_1.Logger(EventBusService_1.name);
    handlers = new Map();
    constructor(queueService, eventStore) {
        this.queueService = queueService;
        this.eventStore = eventStore;
    }
    on(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, new Set());
        }
        this.handlers.get(eventType).add(handler);
    }
    off(eventType, handler) {
        const handlers = this.handlers.get(eventType);
        if (!handlers)
            return;
        handlers.delete(handler);
        if (handlers.size === 0) {
            this.handlers.delete(eventType);
        }
    }
    async emit(eventType, payload, options) {
        const correlationId = (0, node_crypto_1.randomUUID)();
        const eventId = (0, node_crypto_1.randomUUID)();
        const event = {
            eventId,
            eventType,
            payload,
            timestamp: new Date(),
            metadata: {
                correlationId,
                source: options?.actorId
                    ? `user:${options.actorId}`
                    : 'system',
                schoolId: options?.schoolId,
                actorId: options?.actorId,
            },
        };
        await this.eventStore.persist(event);
        const matchedHandlers = this.getMatchedHandlers(eventType);
        const syncHandlers = [];
        const asyncHandlers = [];
        for (const handler of matchedHandlers) {
            if (handler._async) {
                asyncHandlers.push(handler);
            }
            else {
                syncHandlers.push(handler);
            }
        }
        if (syncHandlers.length === 0 && !options?.async) {
            this.logger.debug(`No handlers for event "${eventType}"`);
            return eventId;
        }
        for (const handler of syncHandlers) {
            Promise.resolve(handler(event)).catch((err) => {
                this.logger.error(`Sync handler failed for event "${eventType}": ${err.message}`, err.stack);
            });
        }
        const shouldEnqueue = options?.async === true || asyncHandlers.length > 0;
        if (shouldEnqueue) {
            const queue = options?.queue || this.resolveQueue(eventType);
            const queueInstance = this.queueService.getQueue(queue);
            if (queueInstance) {
                await queueInstance.add(eventType, {
                    eventType,
                    payload,
                    metadata: {
                        ...event.metadata,
                        eventId,
                    },
                }, {
                    delay: options?.delay,
                    jobId: eventId,
                }).catch((err) => {
                    this.logger.error(`Failed to enqueue event "${eventType}" to "${queue}": ${err.message}`);
                });
            }
        }
        return eventId;
    }
    listenerCount(eventType) {
        return this.getMatchedHandlers(eventType).length;
    }
    clear() {
        this.handlers.clear();
    }
    registeredEventTypes() {
        return Array.from(this.handlers.keys());
    }
    getMatchedHandlers(eventType) {
        const results = [];
        const parts = eventType.split('.');
        for (let i = 0; i <= parts.length; i++) {
            const pattern = i === 0
                ? '*'
                : i === parts.length
                    ? eventType
                    : parts.slice(0, i).join('.') + '.*';
            const handlers = this.handlers.get(pattern);
            if (handlers) {
                results.push(...handlers);
            }
        }
        return results;
    }
    resolveQueue(eventType) {
        if (eventType.startsWith('email.') || eventType.includes('email')) {
            return queue_constants_1.QueueName.EMAIL;
        }
        if (eventType.startsWith('communication.') || eventType.includes('sms') || eventType.includes('whatsapp')) {
            return queue_constants_1.QueueName.COMMUNICATION;
        }
        if (eventType.startsWith('file.') || eventType.includes('upload') || eventType.includes('pdf') || eventType.includes('export')) {
            return queue_constants_1.QueueName.FILE_PROCESSING;
        }
        if (eventType.startsWith('sync.') || eventType.includes('sync')) {
            return queue_constants_1.QueueName.SYNC;
        }
        return queue_constants_1.QueueName.NOTIFICATION;
    }
};
exports.EventBusService = EventBusService;
exports.EventBusService = EventBusService = EventBusService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [queue_service_1.QueueService,
        event_store_service_1.EventStoreService])
], EventBusService);
//# sourceMappingURL=event-bus.service.js.map