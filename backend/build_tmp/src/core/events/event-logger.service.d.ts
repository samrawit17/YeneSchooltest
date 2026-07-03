import { EventBusService } from './event-bus.service';
export declare class EventLoggerService {
    private readonly eventBus;
    private readonly logger;
    constructor(eventBus: EventBusService);
    private logAllEvents;
}
