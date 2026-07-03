"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var QueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const queue_constants_1 = require("./queue.constants");
let QueueService = QueueService_1 = class QueueService {
    configService;
    logger = new common_1.Logger(QueueService_1.name);
    connection = null;
    queues = new Map();
    queueEvents = new Map();
    constructor(configService) {
        this.configService = configService;
    }
    async onModuleInit() {
        await this.initialize();
    }
    async onModuleDestroy() {
        await this.shutdown();
    }
    async addEmailJob(jobName, data, opts) {
        return this.addJob(queue_constants_1.QueueName.EMAIL, jobName, data, opts);
    }
    async addNotificationJob(jobName, data, opts) {
        return this.addJob(queue_constants_1.QueueName.NOTIFICATION, jobName, data, opts);
    }
    async addCommunicationJob(jobName, data, opts) {
        return this.addJob(queue_constants_1.QueueName.COMMUNICATION, jobName, data, opts);
    }
    async addFileProcessingJob(jobName, data, opts) {
        return this.addJob(queue_constants_1.QueueName.FILE_PROCESSING, jobName, data, opts);
    }
    async addSyncJob(jobName, data, opts) {
        return this.addJob(queue_constants_1.QueueName.SYNC, jobName, data, opts);
    }
    getQueue(queueName) {
        return this.queues.get(queueName);
    }
    getConnection() {
        if (!this.connection) {
            throw new Error('QueueService not initialized');
        }
        return this.connection;
    }
    getConfig(queueName) {
        return queue_constants_1.QUEUE_CONFIGS[queueName];
    }
    async addJob(queueName, jobName, data, opts) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue "${queueName}" is not available`);
        }
        const jobOptions = {};
        if (opts?.priority !== undefined) {
            jobOptions.priority = opts.priority;
        }
        if (opts?.delay !== undefined) {
            jobOptions.delay = opts.delay;
        }
        if (opts?.jobId !== undefined) {
            jobOptions.jobId = opts.jobId;
        }
        return queue.add(jobName, data, jobOptions);
    }
    async initialize() {
        const redisUrl = this.configService.get('REDIS_URL');
        if (!redisUrl) {
            this.logger.warn('REDIS_URL not set — queue service will be inactive');
            return;
        }
        this.connection = new ioredis_1.Redis(redisUrl, {
            maxRetriesPerRequest: null,
            enableOfflineQueue: true,
            retryStrategy: (times) => {
                if (times > 10)
                    return null;
                return Math.min(times * 200, 5000);
            },
        });
        this.connection.on('connect', () => {
            this.logger.log('BullMQ Redis connection established');
        });
        this.connection.on('error', (error) => {
            this.logger.error(`BullMQ Redis error: ${error.message}`);
        });
        for (const config of Object.values(queue_constants_1.QUEUE_CONFIGS)) {
            await this.createQueue(config);
        }
        this.logger.log(`Queue service initialized with ${this.queues.size} queues`);
    }
    async createQueue(config) {
        const queue = new bullmq_1.Queue(config.name, {
            connection: this.connection,
            defaultJobOptions: config.defaultJobOptions,
        });
        const events = new bullmq_1.QueueEvents(config.name, {
            connection: this.connection,
        });
        await queue.waitUntilReady();
        await events.waitUntilReady();
        this.queues.set(config.name, queue);
        this.queueEvents.set(config.name, events);
        this.logger.log(`Queue "${config.name}" ready (attempts=${config.defaultJobOptions.attempts}, ` +
            `backoff=${config.defaultJobOptions.backoff.type}/${config.defaultJobOptions.backoff.delay}ms)`);
    }
    async shutdown() {
        this.logger.log('Shutting down queue service...');
        for (const [name, events] of this.queueEvents) {
            try {
                await events.close();
            }
            catch (error) {
                this.logger.warn(`Error closing QueueEvents for "${name}": ${error}`);
            }
        }
        this.queueEvents.clear();
        for (const [name, queue] of this.queues) {
            try {
                await queue.close();
            }
            catch (error) {
                this.logger.warn(`Error closing Queue "${name}": ${error}`);
            }
        }
        this.queues.clear();
        if (this.connection) {
            try {
                await this.connection.quit();
            }
            catch (error) {
                this.logger.warn(`Error closing Redis connection: ${error}`);
            }
            this.connection = null;
        }
        this.logger.log('Queue service shut down');
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = QueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], QueueService);
//# sourceMappingURL=queue.service.js.map