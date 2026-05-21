import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../cache/redis.service';
export declare class RateLimitGuard implements CanActivate {
    private readonly reflector;
    private readonly redisService;
    private readonly configService;
    private readonly memoryStore;
    private readonly defaultLimit;
    private readonly defaultWindowSec;
    constructor(reflector: Reflector, redisService: RedisService, configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private buildKey;
    private increment;
}
