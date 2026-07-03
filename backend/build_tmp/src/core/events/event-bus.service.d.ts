import { QueueService } from '../../infrastructure/queue/queue.service';
import { EventStoreService } from './event-store.service';
import { EventHandler, EventMap, EmitOptions, EventType } from './event.interface';
export declare class EventBusService {
    private readonly queueService;
    private readonly eventStore;
    private readonly logger;
    private handlers;
    constructor(queueService: QueueService, eventStore: EventStoreService);
    on<E extends EventType>(eventType: E, handler: EventHandler<EventMap[E]>): void;
    on(eventType: string, handler: EventHandler): void;
    off<E extends EventType>(eventType: E, handler: EventHandler<EventMap[E]>): void;
    off(eventType: string, handler: EventHandler): void;
    emit<E extends EventType>(eventType: E, payload: EventMap[E], options?: EmitOptions): Promise<string>;
    emit(eventType: string, payload: Record<string, any>, options?: EmitOptions): Promise<string>;
    listenerCount(eventType: string): number;
    clear(): void;
    registeredEventTypes(): string[];
    getMatchedHandlers(eventType: string): EventHandler[];
    private resolveQueue;
}
