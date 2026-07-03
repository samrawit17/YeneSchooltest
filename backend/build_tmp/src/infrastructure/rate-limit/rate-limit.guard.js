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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const redis_service_1 = require("../cache/redis.service");
const rate_limit_decorator_1 = require("./rate-limit.decorator");
let RateLimitGuard = class RateLimitGuard {
    reflector;
    redisService;
    configService;
    memoryStore = new Map();
    defaultLimit;
    defaultWindowSec;
    constructor(reflector, redisService, configService) {
        this.reflector = reflector;
        this.redisService = redisService;
        this.configService = configService;
        this.defaultLimit = Number(this.configService.get('RATE_LIMIT_MAX') ?? 120);
        this.defaultWindowSec = Number(this.configService.get('RATE_LIMIT_WINDOW_SEC') ?? 60);
    }
    async canActivate(context) {
        const skip = this.reflector.getAllAndOverride(rate_limit_decorator_1.SKIP_RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
        if (skip)
            return true;
        const request = context
            .switchToHttp()
            .getRequest();
        const response = context.switchToHttp().getResponse();
        const options = this.reflector.getAllAndOverride(rate_limit_decorator_1.RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]) ?? {
            limit: this.defaultLimit,
            windowSec: this.defaultWindowSec,
        };
        const key = this.buildKey(request);
        const { count, resetInSec } = await this.increment(key, options.windowSec);
        const remaining = Math.max(options.limit - count, 0);
        response.setHeader('X-RateLimit-Limit', String(options.limit));
        response.setHeader('X-RateLimit-Remaining', String(remaining));
        response.setHeader('X-RateLimit-Reset', String(resetInSec));
        if (count > options.limit) {
            response.setHeader('Retry-After', String(resetInSec));
            throw new common_1.HttpException('Too many requests. Please retry shortly.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
    }
    buildKey(request) {
        const routeKey = request.route?.path || request.originalUrl || request.url;
        const actor = request.user?.id ||
            request.ip ||
            request.socket.remoteAddress ||
            'anonymous';
        return `ratelimit:${request.method}:${routeKey}:${actor}`;
    }
    async increment(key, windowSec) {
        const client = this.redisService.getRawClient();
        if (client && client.status === 'ready') {
            const created = await client.set(key, '1', 'EX', windowSec, 'NX');
            if (created === 'OK') {
                return { count: 1, resetInSec: windowSec };
            }
            const count = await client.incr(key);
            const ttl = await client.ttl(key);
            return {
                count: count ?? 1,
                resetInSec: ttl && ttl > 0 ? ttl : windowSec,
            };
        }
        return this.incrementMemory(key, windowSec);
    }
    incrementMemory(key, windowSec) {
        const now = Date.now();
        const existing = this.memoryStore.get(key);
        if (!existing || existing.expiresAt <= now) {
            this.memoryStore.set(key, {
                count: 1,
                expiresAt: now + windowSec * 1000,
            });
            return { count: 1, resetInSec: windowSec };
        }
        existing.count += 1;
        this.memoryStore.set(key, existing);
        return {
            count: existing.count,
            resetInSec: Math.max(1, Math.ceil((existing.expiresAt - now) / 1000)),
        };
    }
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        redis_service_1.RedisService,
        config_1.ConfigService])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map