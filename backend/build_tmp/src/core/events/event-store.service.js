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
var EventStoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStoreService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let EventStoreService = EventStoreService_1 = class EventStoreService {
    prisma;
    logger = new common_1.Logger(EventStoreService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async persist(event) {
        try {
            const record = await this.prisma.eventStore.create({
                data: {
                    eventType: event.eventType,
                    source: event.metadata.source,
                    correlationId: event.metadata.correlationId,
                    schoolId: event.metadata.schoolId,
                    actorId: event.metadata.actorId,
                    payload: event.payload,
                    metadata: event.metadata,
                    status: 'PENDING',
                },
            });
            return record.id;
        }
        catch (error) {
            this.logger.error(`Failed to persist event ${event.eventType}: ${error instanceof Error ? error.message : error}`);
            return '';
        }
    }
    async markProcessing(eventId) {
        try {
            await this.prisma.eventStore.update({
                where: { id: eventId },
                data: { status: 'PROCESSING' },
            });
        }
        catch (error) {
            this.logger.warn(`Failed to mark event ${eventId} as PROCESSING: ${error}`);
        }
    }
    async markCompleted(eventId) {
        try {
            await this.prisma.eventStore.update({
                where: { id: eventId },
                data: { status: 'COMPLETED', processedAt: new Date() },
            });
        }
        catch (error) {
            this.logger.warn(`Failed to mark event ${eventId} as COMPLETED: ${error}`);
        }
    }
    async markFailed(eventId) {
        try {
            await this.prisma.eventStore.update({
                where: { id: eventId },
                data: { status: 'FAILED', processedAt: new Date() },
            });
        }
        catch (error) {
            this.logger.warn(`Failed to mark event ${eventId} as FAILED: ${error}`);
        }
    }
};
exports.EventStoreService = EventStoreService;
exports.EventStoreService = EventStoreService = EventStoreService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventStoreService);
//# sourceMappingURL=event-store.service.js.map