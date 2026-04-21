/**
 * Sync Module
 *
 * Provides offline data synchronization functionality:
 * - Sync controller for REST endpoints
 * - Sync service for business logic
 */

import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
