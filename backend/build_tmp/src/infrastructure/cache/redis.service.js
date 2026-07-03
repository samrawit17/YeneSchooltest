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
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const CACHE_KEY_PREFIX = 'sms:';
let RedisService = RedisService_1 = class RedisService {
    configService;
    logger = new common_1.Logger(RedisService_1.name);
    client = null;
    redisUrl;
    constructor(configService) {
        this.configService = configService;
        this.redisUrl = this.configService.get('REDIS_URL') || undefined;
    }
    async onModuleDestroy() {
        await this.disconnect();
    }
    async get(key) {
        const client = await this.getClient();
        if (!client)
            return null;
        try {
            return await client.get(this.prefix(key));
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        const client = await this.getClient();
        if (!client)
            return;
        try {
            await client.set(this.prefix(key), value, 'EX', ttlSeconds);
        }
        catch (error) {
            this.logger.warn(`Redis SET failed: ${error}`);
        }
    }
    async del(...keys) {
        if (keys.length === 0)
            return;
        const client = await this.getClient();
        if (!client)
            return;
        try {
            await client.del(keys.map((k) => this.prefix(k)));
        }
        catch (error) {
            this.logger.warn(`Redis DEL failed: ${error}`);
        }
    }
    async incr(key) {
        const client = await this.getClient();
        if (!client)
            return null;
        try {
            return await client.incr(this.prefix(key));
        }
        catch {
            return null;
        }
    }
    async expire(key, ttlSeconds) {
        const client = await this.getClient();
        if (!client)
            return;
        try {
            await client.expire(this.prefix(key), ttlSeconds);
        }
        catch (error) {
            this.logger.warn(`Redis EXPIRE failed: ${error}`);
        }
    }
    async ttl(key) {
        const client = await this.getClient();
        if (!client)
            return null;
        try {
            return await client.ttl(this.prefix(key));
        }
        catch {
            return null;
        }
    }
    getRawClient() {
        return this.client;
    }
    async getClient() {
        if (!this.redisUrl)
            return null;
        if (this.client && this.client.status === 'ready')
            return this.client;
        if (this.client) {
            this.client.removeAllListeners();
            try {
                await this.client.quit();
            }
            catch { }
            this.client = null;
        }
        try {
            this.client = await this.createClient();
        }
        catch (error) {
            this.logger.warn(`Redis connection failed: ${error}`);
            this.client = null;
        }
        return this.client;
    }
    createClient() {
        return new Promise((resolve, reject) => {
            const opts = {
                retryStrategy: (times) => {
                    if (times > 5)
                        return null;
                    return Math.min(times * 200, 2000);
                },
                maxRetriesPerRequest: 1,
                enableOfflineQueue: false,
                lazyConnect: true,
            };
            if (this.redisUrl) {
                const parsed = new URL(this.redisUrl);
                opts.host = parsed.hostname;
                opts.port = parsed.port ? Number(parsed.port) : 6379;
                opts.username = parsed.username || undefined;
                opts.password = parsed.password || undefined;
                const db = parsed.pathname.replace('/', '') || undefined;
                if (db)
                    opts.db = Number(db);
            }
            const client = new ioredis_1.Redis(opts);
            client.once('ready', () => {
                client.removeAllListeners('error');
                resolve(client);
            });
            client.once('error', (error) => {
                client.removeAllListeners('ready');
                client.disconnect();
                reject(error);
            });
            client.connect().catch((error) => {
                client.removeAllListeners('ready');
                client.removeAllListeners('error');
                reject(error);
            });
        });
    }
    async disconnect() {
        if (!this.client)
            return;
        this.client.removeAllListeners();
        try {
            await this.client.quit();
        }
        catch { }
        this.client = null;
    }
    prefix(key) {
        return `${CACHE_KEY_PREFIX}${key}`;
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map