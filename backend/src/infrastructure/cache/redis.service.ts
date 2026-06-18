import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis, RedisOptions } from 'ioredis';

const CACHE_KEY_PREFIX = 'sms:';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly redisUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl = this.configService.get<string>('REDIS_URL') || undefined;
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    if (!client) return null;
    try {
      return await client.get(this.prefix(key));
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    try {
      await client.set(this.prefix(key), value, 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Redis SET failed: ${error}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const client = await this.getClient();
    if (!client) return;
    try {
      await client.del(keys.map((k) => this.prefix(k)));
    } catch (error) {
      this.logger.warn(`Redis DEL failed: ${error}`);
    }
  }

  async incr(key: string): Promise<number | null> {
    const client = await this.getClient();
    if (!client) return null;
    try {
      return await client.incr(this.prefix(key));
    } catch {
      return null;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    try {
      await client.expire(this.prefix(key), ttlSeconds);
    } catch (error) {
      this.logger.warn(`Redis EXPIRE failed: ${error}`);
    }
  }

  async ttl(key: string): Promise<number | null> {
    const client = await this.getClient();
    if (!client) return null;
    try {
      return await client.ttl(this.prefix(key));
    } catch {
      return null;
    }
  }

  /** Expose the ioredis client for advanced use (e.g. multi-key commands, pipelines). */
  getRawClient(): Redis | null {
    return this.client;
  }

  private async getClient(): Promise<Redis | null> {
    if (!this.redisUrl) return null;
    if (this.client && this.client.status === 'ready') return this.client;

    if (this.client) {
      this.client.removeAllListeners();
      try { await this.client.quit(); } catch { /* ignore */ }
      this.client = null;
    }

    try {
      this.client = await this.createClient();
    } catch (error) {
      this.logger.warn(`Redis connection failed: ${error}`);
      this.client = null;
    }
    return this.client;
  }

  private createClient(): Promise<Redis> {
    return new Promise<Redis>((resolve, reject) => {
      const opts: RedisOptions = {
        retryStrategy: (times) => {
          if (times > 5) return null;
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
        if (db) opts.db = Number(db);
      }

      const client = new Redis(opts);

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

  private async disconnect(): Promise<void> {
    if (!this.client) return;
    this.client.removeAllListeners();
    try { await this.client.quit(); } catch { /* ignore */ }
    this.client = null;
  }

  private prefix(key: string): string {
    return `${CACHE_KEY_PREFIX}${key}`;
  }
}
