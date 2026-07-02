import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppEvent } from './event.interface';

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  async persist(event: AppEvent): Promise<string> {
    try {
      const record = await this.prisma.eventStore.create({
        data: {
          eventType: event.eventType,
          source: event.metadata.source,
          correlationId: event.metadata.correlationId,
          schoolId: event.metadata.schoolId,
          actorId: event.metadata.actorId,
          payload: event.payload,
          metadata: event.metadata,
          status: 'PENDING',
        },
      });
      return record.id;
    } catch (error) {
      this.logger.error(
        `Failed to persist event ${event.eventType}: ${error instanceof Error ? error.message : error}`,
      );
      return '';
    }
  }

  async markProcessing(eventId: string): Promise<void> {
    try {
      await this.prisma.eventStore.update({
        where: { id: eventId },
        data: { status: 'PROCESSING' },
      });
    } catch (error) {
      this.logger.warn(`Failed to mark event ${eventId} as PROCESSING: ${error}`);
    }
  }

  async markCompleted(eventId: string): Promise<void> {
    try {
      await this.prisma.eventStore.update({
        where: { id: eventId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Failed to mark event ${eventId} as COMPLETED: ${error}`);
    }
  }

  async markFailed(eventId: string): Promise<void> {
    try {
      await this.prisma.eventStore.update({
        where: { id: eventId },
        data: { status: 'FAILED', processedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Failed to mark event ${eventId} as FAILED: ${error}`);
    }
  }
}
