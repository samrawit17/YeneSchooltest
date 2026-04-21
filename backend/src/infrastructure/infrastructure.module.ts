import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CacheService } from './cache/cache.service';
import { RedisService } from './cache/redis.service';
import { RateLimitGuard } from './rate-limit/rate-limit.guard';

@Global()
@Module({
  providers: [
    CacheService,
    RedisService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [CacheService, RedisService],
})
export class InfrastructureModule {}
