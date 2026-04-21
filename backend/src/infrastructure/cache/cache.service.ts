import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();
  private readonly memoryVersions = new Map<string, number>();

  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const redisValue = await this.redisService.get(key);
    if (redisValue !== null && redisValue !== undefined) {
      try {
        return JSON.parse(redisValue) as T;
      } catch {
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
      return JSON.parse(entry.value) as T;
    } catch (error) {
      this.logger.warn(
        `Failed to parse cached value for key "${key}": ${error}`,
      );
      this.memoryCache.delete(key);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serializedValue = JSON.stringify(value);

    this.memoryCache.set(key, {
      value: serializedValue,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    await this.redisService.set(key, serializedValue, ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    for (const key of keys) {
      this.memoryCache.delete(key);
    }

    await this.redisService.del(...keys);
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async getVersion(namespace: string): Promise<number> {
    const redisValue = await this.redisService.get(
      this.getVersionKey(namespace),
    );
    if (redisValue !== null) {
      const parsed = Number(redisValue);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return this.memoryVersions.get(namespace) ?? 0;
  }

  async bumpVersion(namespace: string): Promise<number> {
    const nextMemoryVersion = (this.memoryVersions.get(namespace) ?? 0) + 1;
    this.memoryVersions.set(namespace, nextMemoryVersion);

    const redisValue = await this.redisService.incr(
      this.getVersionKey(namespace),
    );
    return redisValue ?? nextMemoryVersion;
  }

  async getOrSetVersioned<T>(
    namespace: string,
    suffix: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const version = await this.getVersion(namespace);
    return this.getOrSet(
      `${namespace}:v${version}:${suffix}`,
      ttlSeconds,
      factory,
    );
  }

  private getVersionKey(namespace: string): string {
    return `cache-version:${namespace}`;
  }
}
