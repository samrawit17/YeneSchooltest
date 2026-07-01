import { Injectable } from '@nestjs/common';
import { AutomationEvent } from './interfaces/event.interface';

export type EventHandler = (event: AutomationEvent) => void | Promise<void>;

@Injectable()
export class EventEmitterService {
  private handlers = new Map<string, EventHandler[]>();

  on(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;
    this.handlers.set(
      eventType,
      handlers.filter((h) => h !== handler),
    );
  }

  emit(eventType: string, payload: Record<string, any>, schoolId: string): void {
    const event: AutomationEvent = {
      eventType,
      payload,
      schoolId,
      timestamp: new Date(),
    };

    const handlers = this.handlers.get(eventType) || [];
    for (const handler of handlers) {
      Promise.resolve(handler(event)).catch((err) =>
        console.error(`Automation handler error for ${eventType}:`, err),
      );
    }

    // Also notify wildcard handlers matching by prefix (e.g. "attendance.*" for "attendance.marked")
    const wildcard = eventType.split('.').slice(0, -1).join('.') + '.*';
    const wildcardHandlers = this.handlers.get(wildcard) || [];
    for (const handler of wildcardHandlers) {
      Promise.resolve(handler(event)).catch((err) =>
        console.error(`Automation handler error for ${wildcard}:`, err),
      );
    }
  }
}
