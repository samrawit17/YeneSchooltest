import { RedisService } from './redis.service';
export declare class CacheService {
    private readonly redisService;
    private readonly logger;
    private readonly memoryCache;
    private readonly memoryVersions;
    constructor(redisService: RedisService);
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
    del(...keys: string[]): Promise<void>;
    getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T>;
    getVersion(namespace: string): Promise<number>;
    bumpVersion(namespace: string): Promise<number>;
    getOrSetVersioned<T>(namespace: string, suffix: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T>;
    private getVersionKey;
}
