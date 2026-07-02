import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents, JobsOptions, Job } from 'bullmq';
import { Redis } from 'ioredis';
import {
  QueueName,
  QueueConfig,
  QUEUE_CONFIGS,
  QueuePriority,
} from './queue.constants';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: Redis | null = null;
  private readonly queues = new Map<QueueName, Queue>();
  private readonly queueEvents = new Map<QueueName, QueueEvents>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }



  async addEmailJob<T = unknown>(
    jobName: string,
    data: T,
    opts?: { priority?: QueuePriority; delay?: number; jobId?: string },
  ): Promise<Job<T>> {
    return this.addJob(QueueName.EMAIL, jobName, data, opts);
  }

  async addNotificationJob<T = unknown>(
    jobName: string,
    data: T,
    opts?: { priority?: QueuePriority; delay?: number; jobId?: string },
  ): Promise<Job<T>> {
    return this.addJob(QueueName.NOTIFICATION, jobName, data, opts);
  }

  async addCommunicationJob<T = unknown>(
    jobName: string,
    data: T,
    opts?: { priority?: QueuePriority; delay?: number; jobId?: string },
  ): Promise<Job<T>> {
    return this.addJob(QueueName.COMMUNICATION, jobName, data, opts);
  }

  async addFileProcessingJob<T = unknown>(
    jobName: string,
    data: T,
    opts?: { priority?: QueuePriority; delay?: number; jobId?: string },
  ): Promise<Job<T>> {
    return this.addJob(QueueName.FILE_PROCESSING, jobName, data, opts);
  }

  async addSyncJob<T = unknown>(
    jobName: string,
    data: T,
    opts?: { priority?: QueuePriority; delay?: number; jobId?: string },
  ): Promise<Job<T>> {
    return this.addJob(QueueName.SYNC, jobName, data, opts);
  }



  getQueue(queueName: QueueName): Queue | undefined {
    return this.queues.get(queueName);
  }

  getConnection(): Redis {
    if (!this.connection) {
      throw new Error('QueueService not initialized');
    }
    return this.connection;
  }

  getConfig(queueName: QueueName): QueueConfig {
    return QUEUE_CONFIGS[queueName];
  }



  private async addJob<T>(
    queueName: QueueName,
    jobName: string,
    data: T,
    opts?: { priority?: QueuePriority; delay?: number; jobId?: string },
  ): Promise<Job<T>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" is not available`);
    }

    const jobOptions: JobsOptions = {};

    if (opts?.priority !== undefined) {
      jobOptions.priority = opts.priority;
    }
    if (opts?.delay !== undefined) {
      jobOptions.delay = opts.delay;
    }
    if (opts?.jobId !== undefined) {
      jobOptions.jobId = opts.jobId;
    }

    return queue.add(jobName, data as any, jobOptions) as Promise<Job<T>>;
  }

  private async initialize(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — queue service will be inactive');
      return;
    }

    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      retryStrategy: (times) => {
        if (times > 10) return null;
        return Math.min(times * 200, 5000);
      },
    });

    this.connection.on('connect', () => {
      this.logger.log('BullMQ Redis connection established');
    });

    this.connection.on('error', (error) => {
      this.logger.error(`BullMQ Redis error: ${error.message}`);
    });

    for (const config of Object.values(QUEUE_CONFIGS)) {
      await this.createQueue(config);
    }

    this.logger.log(`Queue service initialized with ${this.queues.size} queues`);
  }

  private async createQueue(config: QueueConfig): Promise<void> {
    const queue = new Queue(config.name, {
      connection: this.connection! as any,
      defaultJobOptions: config.defaultJobOptions,
    });

    const events = new QueueEvents(config.name, {
      connection: this.connection! as any,
    });

    await queue.waitUntilReady();
    await events.waitUntilReady();

    this.queues.set(config.name, queue);
    this.queueEvents.set(config.name, events);

    this.logger.log(
      `Queue "${config.name}" ready (attempts=${config.defaultJobOptions.attempts}, ` +
        `backoff=${config.defaultJobOptions.backoff.type}/${config.defaultJobOptions.backoff.delay}ms)`,
    );
  }

  private async shutdown(): Promise<void> {
    this.logger.log('Shutting down queue service...');

    for (const [name, events] of this.queueEvents) {
      try {
        await events.close();
      } catch (error) {
        this.logger.warn(`Error closing QueueEvents for "${name}": ${error}`);
      }
    }
    this.queueEvents.clear();

    for (const [name, queue] of this.queues) {
      try {
        await queue.close();
      } catch (error) {
        this.logger.warn(`Error closing Queue "${name}": ${error}`);
      }
    }
    this.queues.clear();

    if (this.connection) {
      try {
        await this.connection.quit();
      } catch (error) {
        this.logger.warn(`Error closing Redis connection: ${error}`);
      }
      this.connection = null;
    }

    this.logger.log('Queue service shut down');
  }
}
