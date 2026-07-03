import { OnModuleDestroy } from '@nestjs/common';
import { RedisService } from './redis.service';
export declare class CacheService implements OnModuleDestroy {
    private readonly redisService;
    private readonly logger;
    private readonly memoryCache;
    private readonly memoryVersions;
    private cleanupTimer;
    constructor(redisService: RedisService);
    onModuleDestroy(): void;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds: number, schoolId?: string): Promise<void>;
    del(...keys: string[]): Promise<void>;
    getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>, schoolId?: string): Promise<T>;
    getVersion(namespace: string): Promise<number>;
    bumpVersion(namespace: string): Promise<number>;
    getOrSetVersioned<T>(namespace: string, suffix: string, ttlSeconds: number, factory: () => Promise<T>, schoolId?: string): Promise<T>;
    private setMemory;
    private cleanup;
    private getVersionKey;
}
