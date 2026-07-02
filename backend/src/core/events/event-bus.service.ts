import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { QueueName } from '../../infrastructure/queue/queue.constants';
import { EventStoreService } from './event-store.service';
import {
  AppEvent,
  EventHandler,
  EventMap,
  EmitOptions,
  EventType,
} from './event.interface';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private handlers = new Map<string, Set<EventHandler>>();

  constructor(
    private readonly queueService: QueueService,
    private readonly eventStore: EventStoreService,
  ) {}

  on<E extends EventType>(
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

  off<E extends EventType>(
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

  async emit<E extends EventType>(
    eventType: E,
    payload: EventMap[E],
    options?: EmitOptions,
  ): Promise<string>;
  async emit(
    eventType: string,
    payload: Record<string, any>,
    options?: EmitOptions,
  ): Promise<string>;
  async emit(
    eventType: string,
    payload: Record<string, any>,
    options?: EmitOptions,
  ): Promise<string> {
    const correlationId = randomUUID();
    const eventId = randomUUID();

    const event: AppEvent = {
      eventId,
      eventType,
      payload,
      timestamp: new Date(),
      metadata: {
        correlationId,
        source: options?.actorId
          ? `user:${options.actorId}`
          : 'system',
        schoolId: options?.schoolId,
        actorId: options?.actorId,
      },
    };

    await this.eventStore.persist(event);

    const matchedHandlers = this.getMatchedHandlers(eventType);
    const syncHandlers: EventHandler[] = [];
    const asyncHandlers: EventHandler[] = [];

    for (const handler of matchedHandlers) {
      if ((handler as any)._async) {
        asyncHandlers.push(handler);
      } else {
        syncHandlers.push(handler);
      }
    }

    if (syncHandlers.length === 0 && !options?.async) {
      this.logger.debug(`No handlers for event "${eventType}"`);
      return eventId;
    }

    for (const handler of syncHandlers) {
      Promise.resolve(handler(event)).catch((err) => {
        this.logger.error(
          `Sync handler failed for event "${eventType}": ${err.message}`,
          err.stack,
        );
      });
    }

    const shouldEnqueue = options?.async === true || asyncHandlers.length > 0;

    if (shouldEnqueue) {
      const queue = options?.queue || this.resolveQueue(eventType);
      const queueInstance = this.queueService.getQueue(queue);

      if (queueInstance) {
        await queueInstance.add(
          eventType,
          {
            eventType,
            payload,
            metadata: {
              ...event.metadata,
              eventId,
            },
          },
          {
            delay: options?.delay,
            jobId: eventId,
          },
        ).catch((err) => {
          this.logger.error(
            `Failed to enqueue event "${eventType}" to "${queue}": ${err.message}`,
          );
        });
      }
    }

    return eventId;
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

  getMatchedHandlers(eventType: string): EventHandler[] {
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

    return results;
  }

  private resolveQueue(eventType: string): QueueName {
    if (eventType.startsWith('email.') || eventType.includes('email')) {
      return QueueName.EMAIL;
    }
    if (eventType.startsWith('communication.') || eventType.includes('sms') || eventType.includes('whatsapp')) {
      return QueueName.COMMUNICATION;
    }
    if (eventType.startsWith('file.') || eventType.includes('upload') || eventType.includes('pdf') || eventType.includes('export')) {
      return QueueName.FILE_PROCESSING;
    }
    if (eventType.startsWith('sync.') || eventType.includes('sync')) {
      return QueueName.SYNC;
    }
    return QueueName.NOTIFICATION;
  }
}
