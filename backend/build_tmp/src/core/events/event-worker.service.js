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
var EventWorkerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventWorkerService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const queue_service_1 = require("../../infrastructure/queue/queue.service");
const queue_constants_1 = require("../../infrastructure/queue/queue.constants");
const event_bus_service_1 = require("./event-bus.service");
const dead_letter_queue_service_1 = require("./dead-letter-queue.service");
let EventWorkerService = EventWorkerService_1 = class EventWorkerService {
    queueService;
    eventBus;
    dlq;
    logger = new common_1.Logger(EventWorkerService_1.name);
    workers = [];
    constructor(queueService, eventBus, dlq) {
        this.queueService = queueService;
        this.eventBus = eventBus;
        this.dlq = dlq;
    }
    onModuleInit() {
        this.registerWorkers();
    }
    async onModuleDestroy() {
        await this.stopWorkers();
    }
    registerWorkers() {
        const connection = this.queueService.getConnection();
        for (const queueName of Object.values(queue_constants_1.QueueName)) {
            const worker = new bullmq_1.Worker(queueName, async (job) => {
                const { eventType, payload, metadata } = job.data;
                if (!eventType) {
                    this.logger.warn(`Job ${job.id} on ${queueName} missing eventType`);
                    return;
                }
                this.logger.debug(`Processing async event "${eventType}" (job=${job.id}, queue=${queueName})`);
                const synchronousHandlers = this.eventBus['getMatchedHandlers'](eventType);
                if (synchronousHandlers.length === 0) {
                    this.logger.debug(`No async handlers for event "${eventType}"`);
                    return;
                }
                const results = await Promise.allSettled(synchronousHandlers.map((handler) => {
                    const event = {
                        eventId: metadata?.eventId || job.id || '',
                        eventType,
                        payload,
                        timestamp: new Date(job.timestamp || Date.now()),
                        metadata: {
                            correlationId: metadata?.correlationId || '',
                            source: metadata?.source || 'async-worker',
                            schoolId: metadata?.schoolId,
                            actorId: metadata?.actorId,
                        },
                    };
                    return handler(event);
                }));
                const failures = results.filter((r) => r.status === 'rejected');
                if (failures.length > 0) {
                    throw new Error(`${failures.length} handler(s) failed for "${eventType}": ${failures.map((f) => f.reason?.message).join('; ')}`);
                }
            }, {
                connection: connection,
                concurrency: 10,
                maxStalledCount: 3,
            });
            worker.on('failed', async (job, error) => {
                if (job) {
                    this.logger.error(`Event job failed (${job.name}) on "${queueName}" attempt ${job.attemptsMade}: ${error.message}`);
                    await this.dlq.sendToDLQ(queueName, job, error);
                }
            });
            worker.on('error', (error) => {
                this.logger.error(`Worker error on "${queueName}": ${error.message}`);
            });
            this.workers.push(worker);
            this.logger.log(`Event worker registered for queue "${queueName}"`);
        }
    }
    async stopWorkers() {
        for (const worker of this.workers) {
            try {
                await worker.close();
            }
            catch (error) {
                this.logger.warn(`Error closing worker: ${error}`);
            }
        }
        this.workers.length = 0;
    }
};
exports.EventWorkerService = EventWorkerService;
exports.EventWorkerService = EventWorkerService = EventWorkerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [queue_service_1.QueueService,
        event_bus_service_1.EventBusService,
        dead_letter_queue_service_1.DeadLetterQueueService])
], EventWorkerService);
//# sourceMappingURL=event-worker.service.js.map