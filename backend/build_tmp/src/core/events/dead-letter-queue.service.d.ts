import { PrismaService } from '../../prisma/prisma.service';
import { Job } from 'bullmq';
export declare class DeadLetterQueueService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    sendToDLQ(queueName: string, job: Job, error: Error): Promise<void>;
}
