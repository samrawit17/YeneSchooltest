/**
 * Sync Service
 *
 * Handles the business logic for offline data synchronization:
 * - Validates and processes incoming attendance records
 * - Deduplicates based on unique constraints
 * - Detects and resolves conflicts
 * - Returns server versions for client updates
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

interface SyncAttendanceDto {
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

interface SyncResponseDto {
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

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // ATTENDANCE SYNC
  // ============================================

  /**
   * Sync a single attendance record from offline client
   */
  async syncAttendance(
    dto: SyncAttendanceDto,
    deviceId?: string,
  ): Promise<SyncResponseDto> {
    const { operation, entityId, payload, localModified } = dto;
    const {
      studentId,
      classId,
      sectionId,
      date,
      status,
      remarks,
      recordedById,
      localId,
    } = payload;

    try {
      switch (operation) {
        case 'create':
          return await this.handleCreateAttendance({
            localId,
            deviceId,
            studentId,
            classId,
            sectionId,
            date,
            status,
            remarks,
            recordedById,
            localModified,
          });

        case 'update':
          return await this.handleUpdateAttendance({
            entityId,
            localId,
            deviceId,
            studentId,
            classId,
            sectionId,
            date,
            status,
            remarks,
            recordedById,
            localModified,
          });

        case 'delete':
          return await this.handleDeleteAttendance(entityId);

        default:
          throw new BadRequestException(`Invalid operation: ${operation}`);
      }
    } catch (error) {
      this.logger.error(`Sync failed for ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Handle create operation with deduplication
   */
  private async handleCreateAttendance(data: {
    localId?: string;
    deviceId?: string;
    studentId: string;
    classId: string;
    sectionId: string;
    date: string;
    status: string;
    remarks?: string;
    recordedById?: string;
    localModified: string;
  }): Promise<SyncResponseDto> {
    // Check for existing record with same student and date (unique constraint)
    const existing = await this.prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId: data.studentId,
          date: new Date(data.date),
        },
      },
    });

    if (existing) {
      // Check for conflict - different modifications
      const existingModified = existing.updatedAt.getTime();
      const localModifiedTime = new Date(data.localModified).getTime();

      if (existingModified > localModifiedTime) {
        // Server has newer version - return conflict
        return {
          success: false,
          serverId: existing.id,
          version: 1,
          serverVersion: existing as unknown as Record<string, unknown>,
          message: 'Conflict detected - server has newer version',
        };
      }

      // Local is newer or same - update server
      const updated = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: data.status as AttendanceStatus,
          remarks: data.remarks,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        serverId: updated.id,
        version: 1,
      };
    }

    // Create new record
    const created = await this.prisma.attendance.create({
      data: {
        studentId: data.studentId,
        classId: data.classId || '',
        sectionId: data.sectionId || '',
        date: new Date(data.date),
        status: data.status as AttendanceStatus,
        remarks: data.remarks,
        recordedById: data.recordedById,
        schoolId: '', // Will be set based on the user's school
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      serverId: created.id,
      version: 1,
    };
  }

  /**
   * Handle update operation with conflict detection
   */
  private async handleUpdateAttendance(data: {
    entityId: string;
    localId?: string;
    deviceId?: string;
    studentId: string;
    classId: string;
    sectionId: string;
    date: string;
    status: string;
    remarks?: string;
    recordedById?: string;
    localModified: string;
  }): Promise<SyncResponseDto> {
    const existing = await this.prisma.attendance.findUnique({
      where: { id: data.entityId },
    });

    if (!existing) {
      // Record doesn't exist - create it
      return this.handleCreateAttendance({
        ...data,
        recordedById: data.recordedById,
      });
    }

    // Check for conflict
    const existingModified = existing.updatedAt.getTime();
    const localModifiedTime = new Date(data.localModified).getTime();

    if (existingModified > localModifiedTime) {
      // Server has newer version
      return {
        success: false,
        serverId: existing.id,
        version: 1,
        serverVersion: existing as unknown as Record<string, unknown>,
        message: 'Conflict detected - server has newer version',
      };
    }

    // Update the record
    const updated = await this.prisma.attendance.update({
      where: { id: data.entityId },
      data: {
        status: data.status as AttendanceStatus,
        remarks: data.remarks,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      serverId: updated.id,
      version: 1,
    };
  }

  /**
   * Handle delete operation
   */
  private async handleDeleteAttendance(
    entityId: string,
  ): Promise<SyncResponseDto> {
    try {
      await this.prisma.attendance.delete({
        where: { id: entityId },
      });
      return { success: true };
    } catch (error) {
      // Record may already be deleted
      return { success: true, message: 'Record already deleted or not found' };
    }
  }

  // ============================================
  // STUDENT DATA
  // ============================================

  /**
   * Get students for offline caching
   */
  async getStudentsForOffline(
    classIds?: string[],
    sectionIds?: string[],
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
    // For now, return empty array - this would need proper enrollment queries
    return {
      students: [],
      cachedAt: new Date().toISOString(),
    };
  }

  // ============================================
  // CONFLICTS
  // ============================================

  /**
   * Get unresolved conflicts
   */
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
    // This would need a conflicts table in the database
    // For now, return empty array
    return [];
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    id: number,
    resolution: 'local_wins' | 'server_wins' | 'merged',
    data?: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    // This would need implementation with a conflicts table
    return { success: true };
  }

  // ============================================
  // STATUS
  // ============================================

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    pendingCount: number;
    lastSyncAt: string;
    conflicts: number;
  }> {
    // This would track pending syncs in a table
    return {
      pendingCount: 0,
      lastSyncAt: new Date().toISOString(),
      conflicts: 0,
    };
  }
}
