import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { EventBusService } from './event-bus.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';
export declare class EventWorkerService implements OnModuleInit, OnModuleDestroy {
    private readonly queueService;
    private readonly eventBus;
    private readonly dlq;
    private readonly logger;
    private readonly workers;
    constructor(queueService: QueueService, eventBus: EventBusService, dlq: DeadLetterQueueService);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    private registerWorkers;
    private stopWorkers;
}
