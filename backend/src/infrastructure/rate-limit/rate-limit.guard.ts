import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RedisService } from '../cache/redis.service';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
  SKIP_RATE_LIMIT_KEY,
} from './rate-limit.decorator';

interface MemoryRateLimitEntry {
  count: number;
  expiresAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly memoryStore = new Map<string, MemoryRateLimitEntry>();
  private readonly defaultLimit: number;
  private readonly defaultWindowSec: number;

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.defaultLimit = Number(this.configService.get('RATE_LIMIT_MAX') ?? 120);
    this.defaultWindowSec = Number(
      this.configService.get('RATE_LIMIT_WINDOW_SEC') ?? 60,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skip) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: string } }>();
    const response = context.switchToHttp().getResponse<Response>();
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? {
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
      throw new HttpException(
        'Too many requests. Please retry shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private buildKey(request: Request & { user?: { id?: string } }): string {
    const routeKey = request.route?.path || request.originalUrl || request.url;
    const actor =
      request.user?.id ||
      request.ip ||
      request.socket.remoteAddress ||
      'anonymous';
    return `ratelimit:${request.method}:${routeKey}:${actor}`;
  }

  private async increment(
    key: string,
    windowSec: number,
  ): Promise<{ count: number; resetInSec: number }> {
    // Use atomic SET NX for first hit to avoid race with EXPIRE
    const client = this.redisService.getRawClient();
    if (client && client.status === 'ready') {
      // Atomic: SET key 1 EX windowSec NX (creates only if key doesn't exist)
      const created = await client.set(key, '1', 'EX', windowSec, 'NX');
      if (created === 'OK') {
        return { count: 1, resetInSec: windowSec };
      }

      // Key already exists — increment atomically
      const count = await client.incr(key);
      const ttl = await client.ttl(key);
      return {
        count: count ?? 1,
        resetInSec: ttl && ttl > 0 ? ttl : windowSec,
      };
    }

    // Fallback to in-memory when Redis is unavailable
    return this.incrementMemory(key, windowSec);
  }

  private incrementMemory(
    key: string,
    windowSec: number,
  ): { count: number; resetInSec: number } {
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
}
