import { PrismaService } from '../../prisma/prisma.service';
import { AppEvent } from './event.interface';
export declare class EventStoreService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    persist(event: AppEvent): Promise<string>;
    markProcessing(eventId: string): Promise<void>;
    markCompleted(eventId: string): Promise<void>;
    markFailed(eventId: string): Promise<void>;
}
