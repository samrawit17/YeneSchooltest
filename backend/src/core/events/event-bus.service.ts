import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { AppEvent, EventHandler, EventMap } from './event.interface';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private handlers = new Map<string, Set<EventHandler>>();

  on<E extends keyof EventMap>(
    eventType: E,
    handler: EventHandler<EventMap[E]>,
  ): void;
  on(eventType: string, handler: EventHandler): void;
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  off<E extends keyof EventMap>(
    eventType: E,
    handler: EventHandler<EventMap[E]>,
  ): void;
  off(eventType: string, handler: EventHandler): void;
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.handlers.delete(eventType);
    }
  }

  emit(eventType: string, payload: Record<string, any>): void {
    const event: AppEvent = {
      eventType,
      payload,
      timestamp: new Date(),
      metadata: {
        correlationId: randomUUID(),
      },
    };

    const matchedListeners = this.getMatchedHandlers(eventType);

    if (matchedListeners.length === 0) {
      this.logger.debug(`No listeners for event "${eventType}"`);
      return;
    }

    for (const handler of matchedListeners) {
      Promise.resolve(handler(event)).catch((err) => {
        this.logger.error(
          `Handler failed for event "${eventType}": ${err.message}`,
          err.stack,
        );
      });
    }
  }

  private getMatchedHandlers(eventType: string): EventHandler[] {
    const results: EventHandler[] = [];
    const parts = eventType.split('.');

    for (let i = 0; i <= parts.length; i++) {
      const pattern =
        i === 0
          ? '*'
          : i === parts.length
            ? eventType
            : parts.slice(0, i).join('.') + '.*';
      const handlers = this.handlers.get(pattern);
      if (handlers) {
        results.push(...handlers);
      }
    }

    // Also add exact match handlers (already covered by loop when i === parts.length)
    return results;
  }

  listenerCount(eventType: string): number {
    return this.getMatchedHandlers(eventType).length;
  }

  clear(): void {
    this.handlers.clear();
  }

  registeredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
