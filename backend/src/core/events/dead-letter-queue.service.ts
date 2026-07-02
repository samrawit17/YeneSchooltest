import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Job } from 'bullmq';

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendToDLQ(
    queueName: string,
    job: Job,
    error: Error,
  ): Promise<void> {
    try {
      await this.prisma.deadLetterEvent.create({
        data: {
          originalQueue: queueName,
          eventType: job.name,
          payload: job.data,
          metadata: {
            jobId: job.id,
            attempts: job.attemptsMade,
            timestamp: job.timestamp,
            ...(job.data?.metadata || {}),
          },
          errorMessage: error.message,
          errorStack: error.stack,
          retryCount: job.attemptsMade,
        },
      });

      this.logger.warn(
        `Job "${job.name}" sent to DLQ after ${job.attemptsMade} attempt(s) on queue "${queueName}": ${error.message}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send job to DLQ: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
