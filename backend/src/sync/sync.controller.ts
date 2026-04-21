/**
 * Sync Controller
 *
 * Handles offline data synchronization from IndexedDB clients
 * - Validates incoming data
 * - Deduplicates records
 * - Handles conflicts with latest-wins strategy
 * - Returns server version for client updates
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SyncService } from './sync.service';

// ============================================
// DTOs
// ============================================

class SyncAttendanceDto {
  operation: 'create' | 'update' | 'delete';
  entityId: string;
  payload: {
    studentId: string;
    classId: string;
    sectionId: string;
    date: string;
    status: string;
    remarks?: string;
    recordedById?: string;
    localId?: string;
    deviceId?: string;
    lastModified: string;
  };
  localModified: string;
}

class SyncResponseDto {
  success: boolean;
  serverId?: string;
  version?: number;
  message?: string;
  serverVersion?: Record<string, unknown>;
  conflicts?: Array<{
    entity: string;
    entityId: string;
    serverData: Record<string, unknown>;
  }>;
}

class BatchSyncDto {
  items: Array<{
    operation: 'create' | 'update' | 'delete';
    entity: string;
    entityId: string;
    payload: Record<string, unknown>;
    localModified: string;
  }>;
}

class SyncStatusDto {
  pendingCount: number;
  lastSyncAt: string;
  conflicts: number;
}

// ============================================
// CONTROLLER
// ============================================

@Controller('api/sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  // ============================================
  // ATTENDANCE SYNC
  // ============================================

  @Post('attendance')
  @HttpCode(HttpStatus.OK)
  @Permissions('attendance:create', 'attendance:update')
  async syncAttendance(
    @Body() dto: SyncAttendanceDto,
    @Headers('x-device-id') deviceId?: string,
  ): Promise<SyncResponseDto> {
    try {
      return await this.syncService.syncAttendance(dto, deviceId);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Sync failed',
      );
    }
  }

  @Post('attendance/batch')
  @HttpCode(HttpStatus.OK)
  @Permissions('attendance:create', 'attendance:update')
  async batchSyncAttendance(
    @Body() dto: BatchSyncDto,
    @Headers('x-device-id') deviceId?: string,
  ): Promise<{
    results: SyncResponseDto[];
    successful: number;
    failed: number;
  }> {
    const results: SyncResponseDto[] = [];
    let successful = 0;
    let failed = 0;

    for (const item of dto.items) {
      if (item.entity !== 'attendance') continue;

      try {
        const result = await this.syncService.syncAttendance(
          item as unknown as SyncAttendanceDto,
          deviceId,
        );
        results.push(result);
        successful++;
      } catch (error) {
        results.push({
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return { results, successful, failed };
  }

  // ============================================
  // STUDENT SYNC
  // ============================================

  @Post('students')
  @HttpCode(HttpStatus.OK)
  @Permissions('student:read')
  async getStudentsForOffline(
    @Body() body: { classIds?: string[]; sectionIds?: string[] },
  ): Promise<{
    students: Array<{
      id: string;
      firstName: string;
      lastName: string;
      studentId: string;
      classId: string;
      className?: string;
      sectionId?: string;
      sectionName?: string;
      photo?: string;
      email?: string;
      phone?: string;
      enrollmentStatus: string;
      updatedAt: string;
    }>;
    cachedAt: string;
  }> {
    return this.syncService.getStudentsForOffline(
      body.classIds,
      body.sectionIds,
    );
  }

  // ============================================
  // CONFLICTS
  // ============================================

  @Get('conflicts')
  @Permissions('attendance:read')
  async getConflicts(): Promise<
    Array<{
      id: number;
      entity: string;
      entityId: string;
      conflictType: string;
      detectedAt: string;
      localData: Record<string, unknown>;
      serverData: Record<string, unknown>;
    }>
  > {
    return this.syncService.getConflicts();
  }

  @Post('conflicts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @Permissions('attendance:update')
  async resolveConflict(
    @Param('id') id: string,
    @Body()
    body: {
      resolution: 'local_wins' | 'server_wins' | 'merged';
      data?: Record<string, unknown>;
    },
  ): Promise<{ success: boolean }> {
    return this.syncService.resolveConflict(+id, body.resolution, body.data);
  }

  // ============================================
  // STATUS
  // ============================================

  @Get('status')
  @Permissions('attendance:read')
  async getSyncStatus(): Promise<SyncStatusDto> {
    return this.syncService.getSyncStatus();
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
