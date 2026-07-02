import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CacheService } from './cache/cache.service';
import { RedisService } from './cache/redis.service';
import { RateLimitGuard } from './rate-limit/rate-limit.guard';
import { QueueModule } from './queue/queue.module';

@Global()
@Module({
  imports: [QueueModule],
  providers: [
    CacheService,
    RedisService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [CacheService, RedisService, QueueModule],
})
export class InfrastructureModule {}
