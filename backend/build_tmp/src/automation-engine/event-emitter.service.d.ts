import { AutomationEvent } from './interfaces/event.interface';
export type EventHandler = (event: AutomationEvent) => void | Promise<void>;
export declare class EventEmitterService {
    private handlers;
    on(eventType: string, handler: EventHandler): void;
    off(eventType: string, handler: EventHandler): void;
    emit(eventType: string, payload: Record<string, any>, schoolId: string): void;
}
