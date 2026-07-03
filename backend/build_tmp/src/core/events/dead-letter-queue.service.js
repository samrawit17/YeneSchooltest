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
var DeadLetterQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeadLetterQueueService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DeadLetterQueueService = DeadLetterQueueService_1 = class DeadLetterQueueService {
    prisma;
    logger = new common_1.Logger(DeadLetterQueueService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendToDLQ(queueName, job, error) {
        try {
            await this.prisma.deadLetterEvent.create({
                data: {
                    originalQueue: queueName,
                    eventType: job.name,
                    payload: job.data,
                    metadata: {
                        jobId: job.id,
                        attempts: job.attemptsMade,
                        timestamp: job.timestamp,
                        ...(job.data?.metadata || {}),
                    },
                    errorMessage: error.message,
                    errorStack: error.stack,
                    retryCount: job.attemptsMade,
                },
            });
            this.logger.warn(`Job "${job.name}" sent to DLQ after ${job.attemptsMade} attempt(s) on queue "${queueName}": ${error.message}`);
        }
        catch (err) {
            this.logger.error(`Failed to send job to DLQ: ${err instanceof Error ? err.message : err}`);
        }
    }
};
exports.DeadLetterQueueService = DeadLetterQueueService;
exports.DeadLetterQueueService = DeadLetterQueueService = DeadLetterQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DeadLetterQueueService);
//# sourceMappingURL=dead-letter-queue.service.js.map