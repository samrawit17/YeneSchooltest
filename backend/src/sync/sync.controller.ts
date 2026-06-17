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
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { IsArray, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SyncService } from './sync.service';

// ============================================
// DTOs
// ============================================

class SyncAttendanceDto {
  @IsIn(['create', 'update', 'delete'])
  operation: 'create' | 'update' | 'delete';

  @IsString()
  entityId: string;

  @IsObject()
  payload: {
    studentId: string;
    classId: string;
    sectionId: string;
    date: string;
    status: string;
    remarks?: string;
    recordedById?: string;
    recordedBy?: string;
    localId?: string;
    deviceId?: string;
    lastModified: string;
  };

  @IsString()
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
  @IsArray()
  items: Array<{
    operation: 'create' | 'update' | 'delete';
    entity: string;
    entityId: string;
    payload: Record<string, unknown>;
    localModified: string;
  }>;
}

class SyncStatusDto {
  @IsOptional()
  pendingCount: number;

  @IsOptional()
  lastSyncAt: string;

  @IsOptional()
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
  @Permissions('attendance:take')
  async syncAttendance(
    @Body() dto: SyncAttendanceDto,
    @Request() req: any,
    @Headers('x-device-id') deviceId?: string,
  ): Promise<SyncResponseDto> {
    try {
      return await this.syncService.syncAttendance(dto, req.user, deviceId);
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
  @Permissions('attendance:take')
  async batchSyncAttendance(
    @Body() dto: BatchSyncDto,
    @Request() req: any,
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
          req.user,
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
    @Request() req: any,
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
      req.user,
      body.classIds,
      body.sectionIds,
    );
  }

  // ============================================
  // CONFLICTS
  // ============================================

  @Get('conflicts')
  @Permissions('attendance:read')
  async getConflicts(@Request() req: any): Promise<
    Array<{
      id: string;
      entity: string;
      entityId: string;
      conflictType: string;
      detectedAt: string;
      localData: Record<string, unknown>;
      serverData: Record<string, unknown>;
    }>
  > {
    return this.syncService.getConflicts(req.user?.schoolId);
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
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    return this.syncService.resolveConflict(id, body.resolution, body.data, req.user?.id);
  }

  // ============================================
  // STATUS
  // ============================================

  @Get('status')
  @Permissions('attendance:read')
  async getSyncStatus(@Request() req: any): Promise<SyncStatusDto> {
    return this.syncService.getSyncStatus(req.user?.schoolId);
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
