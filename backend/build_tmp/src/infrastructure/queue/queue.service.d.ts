import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { QueueName, QueueConfig, QueuePriority } from './queue.constants';
export declare class QueueService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private connection;
    private readonly queues;
    private readonly queueEvents;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    addEmailJob<T = unknown>(jobName: string, data: T, opts?: {
        priority?: QueuePriority;
        delay?: number;
        jobId?: string;
    }): Promise<Job<T>>;
    addNotificationJob<T = unknown>(jobName: string, data: T, opts?: {
        priority?: QueuePriority;
        delay?: number;
        jobId?: string;
    }): Promise<Job<T>>;
    addCommunicationJob<T = unknown>(jobName: string, data: T, opts?: {
        priority?: QueuePriority;
        delay?: number;
        jobId?: string;
    }): Promise<Job<T>>;
    addFileProcessingJob<T = unknown>(jobName: string, data: T, opts?: {
        priority?: QueuePriority;
        delay?: number;
        jobId?: string;
    }): Promise<Job<T>>;
    addSyncJob<T = unknown>(jobName: string, data: T, opts?: {
        priority?: QueuePriority;
        delay?: number;
        jobId?: string;
    }): Promise<Job<T>>;
    getQueue(queueName: QueueName): Queue | undefined;
    getConnection(): Redis;
    getConfig(queueName: QueueName): QueueConfig;
    private addJob;
    private initialize;
    private createQueue;
    private shutdown;
}
