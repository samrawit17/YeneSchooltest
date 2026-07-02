import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { QueueService } from '../../infrastructure/queue/queue.service';
import { QueueName } from '../../infrastructure/queue/queue.constants';
import { EventBusService } from './event-bus.service';
import { DeadLetterQueueService } from './dead-letter-queue.service';

@Injectable()
export class EventWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventWorkerService.name);
  private readonly workers: Worker[] = [];

  constructor(
    private readonly queueService: QueueService,
    private readonly eventBus: EventBusService,
    private readonly dlq: DeadLetterQueueService,
  ) {}

  onModuleInit(): void {
    this.registerWorkers();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopWorkers();
  }

  private registerWorkers(): void {
    const connection = this.queueService.getConnection();

    for (const queueName of Object.values(QueueName)) {
      const worker = new Worker(
        queueName,
        async (job: Job) => {
          const { eventType, payload, metadata } = job.data;

          if (!eventType) {
            this.logger.warn(`Job ${job.id} on ${queueName} missing eventType`);
            return;
          }

          this.logger.debug(
            `Processing async event "${eventType}" (job=${job.id}, queue=${queueName})`,
          );

          const synchronousHandlers = this.eventBus['getMatchedHandlers'](eventType);

          if (synchronousHandlers.length === 0) {
            this.logger.debug(`No async handlers for event "${eventType}"`);
            return;
          }

          const results = await Promise.allSettled(
            synchronousHandlers.map((handler: any) => {
              const event = {
                eventId: metadata?.eventId || job.id || '',
                eventType,
                payload,
                timestamp: new Date(job.timestamp || Date.now()),
                metadata: {
                  correlationId: metadata?.correlationId || '',
                  source: metadata?.source || 'async-worker',
                  schoolId: metadata?.schoolId,
                  actorId: metadata?.actorId,
                },
              };
              return handler(event);
            }),
          );

          const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
          if (failures.length > 0) {
            throw new Error(
              `${failures.length} handler(s) failed for "${eventType}": ${failures.map((f) => (f.reason as Error)?.message).join('; ')}`,
            );
          }
        },
        {
          connection: connection as any,
          concurrency: 10,
          maxStalledCount: 3,
        },
      );

      worker.on('failed', async (job: Job | undefined, error: Error) => {
        if (job) {
          this.logger.error(
            `Event job failed (${job.name}) on "${queueName}" attempt ${job.attemptsMade}: ${error.message}`,
          );
          await this.dlq.sendToDLQ(queueName, job, error);
        }
      });

      worker.on('error', (error: Error) => {
        this.logger.error(`Worker error on "${queueName}": ${error.message}`);
      });

      this.workers.push(worker);
      this.logger.log(`Event worker registered for queue "${queueName}"`);
    }
  }

  private async stopWorkers(): Promise<void> {
    for (const worker of this.workers) {
      try {
        await worker.close();
      } catch (error) {
        this.logger.warn(`Error closing worker: ${error}`);
      }
    }
    this.workers.length = 0;
  }
}
