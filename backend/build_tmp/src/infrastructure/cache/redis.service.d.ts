import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
export declare class RedisService implements OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private client;
    private readonly redisUrl?;
    constructor(configService: ConfigService);
    onModuleDestroy(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
    del(...keys: string[]): Promise<void>;
    incr(key: string): Promise<number | null>;
    expire(key: string, ttlSeconds: number): Promise<void>;
    ttl(key: string): Promise<number | null>;
    getRawClient(): Redis | null;
    private getClient;
    private createClient;
    private disconnect;
    private prefix;
}
