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
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("./redis.service");
let CacheService = CacheService_1 = class CacheService {
    redisService;
    logger = new common_1.Logger(CacheService_1.name);
    memoryCache = new Map();
    memoryVersions = new Map();
    constructor(redisService) {
        this.redisService = redisService;
    }
    async get(key) {
        const redisValue = await this.redisService.get(key);
        if (redisValue !== null && redisValue !== undefined) {
            try {
                return JSON.parse(redisValue);
            }
            catch {
                return null;
            }
        }
        const entry = this.memoryCache.get(key);
        if (!entry) {
            return null;
        }
        if (entry.expiresAt <= Date.now()) {
            this.memoryCache.delete(key);
            return null;
        }
        try {
            return JSON.parse(entry.value);
        }
        catch (error) {
            this.logger.warn(`Failed to parse cached value for key "${key}": ${error}`);
            this.memoryCache.delete(key);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        const serializedValue = JSON.stringify(value);
        this.memoryCache.set(key, {
            value: serializedValue,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
        await this.redisService.set(key, serializedValue, ttlSeconds);
    }
    async del(...keys) {
        if (keys.length === 0) {
            return;
        }
        for (const key of keys) {
            this.memoryCache.delete(key);
        }
        await this.redisService.del(...keys);
    }
    async getOrSet(key, ttlSeconds, factory) {
        const cachedValue = await this.get(key);
        if (cachedValue !== null) {
            return cachedValue;
        }
        const value = await factory();
        await this.set(key, value, ttlSeconds);
        return value;
    }
    async getVersion(namespace) {
        const redisValue = await this.redisService.get(this.getVersionKey(namespace));
        if (redisValue !== null) {
            const parsed = Number(redisValue);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return this.memoryVersions.get(namespace) ?? 0;
    }
    async bumpVersion(namespace) {
        const nextMemoryVersion = (this.memoryVersions.get(namespace) ?? 0) + 1;
        this.memoryVersions.set(namespace, nextMemoryVersion);
        const redisValue = await this.redisService.incr(this.getVersionKey(namespace));
        return redisValue ?? nextMemoryVersion;
    }
    async getOrSetVersioned(namespace, suffix, ttlSeconds, factory) {
        const version = await this.getVersion(namespace);
        return this.getOrSet(`${namespace}:v${version}:${suffix}`, ttlSeconds, factory);
    }
    getVersionKey(namespace) {
        return `cache-version:${namespace}`;
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], CacheService);
//# sourceMappingURL=cache.service.js.map