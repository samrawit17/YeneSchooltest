import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from './redis.service';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

const MAX_MEMORY_ENTRIES = 500;
const CLEANUP_INTERVAL_MS = 60_000;

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();
  private readonly memoryVersions = new Map<string, number>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly redisService: RedisService) {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

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
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch (error) {
      this.logger.warn(`Failed to parse cached value for key "${key}": ${error}`);
      this.memoryCache.delete(key);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number,
    schoolId?: string,
  ): Promise<void> {
    if (key.startsWith('platform-settings') && schoolId) {
      throw new Error(
        'School-specific data cannot be written to platform-settings. Use a school-scoped key instead.',
      );
    }

    const serializedValue = JSON.stringify(value);

    this.setMemory(key, serializedValue, ttlSeconds);

    await this.redisService.set(key, serializedValue, ttlSeconds);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    for (const key of keys) {
      this.memoryCache.delete(key);
    }

    await this.redisService.del(...keys);
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
    schoolId?: string,
  ): Promise<T> {
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) return cachedValue;

    const value = await factory();
    await this.set(key, value, ttlSeconds, schoolId);
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
    schoolId?: string,
  ): Promise<T> {
    const version = await this.getVersion(namespace);
    return this.getOrSet(
      `${namespace}:v${version}:${suffix}`,
      ttlSeconds,
      factory,
      schoolId,
    );
  }

  private setMemory(key: string, value: string, ttlSeconds: number): void {
    if (this.memoryCache.size >= MAX_MEMORY_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next();
      if (!oldestKey.done) {
        this.memoryCache.delete(oldestKey.value);
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  private getVersionKey(namespace: string): string {
    return `cache-version:${namespace}`;
  }
}
