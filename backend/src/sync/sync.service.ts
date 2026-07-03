/**
 * Sync Service
 *
 * Handles the business logic for offline data synchronization:
 * - Validates and processes incoming attendance records
 * - Deduplicates based on unique constraints
 * - Detects and resolves conflicts
 * - Returns server versions for client updates
 */

import { HttpStatus, Injectable, BadRequestException, Logger } from '@nestjs/common';
import { LocalizedException } from '../core/localization';
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
    recordedBy?: string;
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
    user: { id?: string; schoolId?: string },
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
      recordedBy,
      localId,
    } = payload;
    const schoolId = user?.schoolId;
    const actorId = user?.id;

    if (!schoolId || !actorId) throw new LocalizedException('sync.authenticated_school_and_user_are_required_for_sync_27b57cd1', undefined, undefined, 'Authenticated school and user are required for sync');

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
            status: this.normalizeAttendanceStatus(status),
            remarks,
            recordedById: recordedById || recordedBy || actorId,
            schoolId,
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
            status: this.normalizeAttendanceStatus(status),
            remarks,
            recordedById: recordedById || recordedBy || actorId,
            schoolId,
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
    schoolId: string;
    localModified: string;
  }): Promise<SyncResponseDto> {
    await this.validateAttendanceScope(data.schoolId, data.studentId, data.classId, data.sectionId);

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
        // Server has newer version - record conflict
        await this.recordConflict(
          data.schoolId,
          'attendance',
          `${data.studentId}_${data.date}`,
          'update_update',
          data as unknown as Record<string, unknown>,
          existing as unknown as Record<string, unknown>,
          data.deviceId,
        );

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
          recordedById: data.recordedById,
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
        classId: data.classId,
        sectionId: data.sectionId,
        date: new Date(data.date),
        status: data.status as AttendanceStatus,
        remarks: data.remarks,
        recordedById: data.recordedById,
        schoolId: data.schoolId,
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
    schoolId: string;
    localModified: string;
  }): Promise<SyncResponseDto> {
    await this.validateAttendanceScope(data.schoolId, data.studentId, data.classId, data.sectionId);

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
      // Server has newer version - record conflict
      await this.recordConflict(
        data.schoolId,
        'attendance',
        data.entityId,
        'update_update',
        data as unknown as Record<string, unknown>,
        existing as unknown as Record<string, unknown>,
        data.deviceId,
      );

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
    user: { schoolId?: string },
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
    if (!user?.schoolId) throw new LocalizedException('sync.authenticated_school_is_required_e729adbd', undefined, undefined, 'Authenticated school is required');

    const studentClasses = await this.prisma.studentClass.findMany({
      where: {
        schoolId: user.schoolId,
        ...(classIds?.length ? { classId: { in: classIds } } : {}),
        ...(sectionIds?.length ? { sectionId: { in: sectionIds } } : {}),
      },
      include: {
        student: {
          include: { studentProfile: true },
        },
        class: true,
        section: true,
      },
      orderBy: [{ class: { name: 'asc' } }, { section: { name: 'asc' } }],
    });

    return {
      students: studentClasses.map((enrollment) => ({
        id: enrollment.student.id,
        firstName: enrollment.student.name?.split(' ')[0] || enrollment.student.name || '',
        lastName: enrollment.student.name?.split(' ').slice(1).join(' ') || '',
        studentId: enrollment.student.username || enrollment.student.studentProfile?.studentId || enrollment.student.id,
        classId: enrollment.classId,
        className: enrollment.class?.name,
        sectionId: enrollment.sectionId,
        sectionName: enrollment.section?.name,
        photo: enrollment.student.avatarUrl || undefined,
        email: enrollment.student.email || undefined,
        phone: enrollment.student.phone || undefined,
        enrollmentStatus: 'active',
        updatedAt: enrollment.updatedAt.toISOString(),
      })),
      cachedAt: new Date().toISOString(),
    };
  }

  private async validateAttendanceScope(
    schoolId: string,
    studentId: string,
    classId: string,
    sectionId: string,
  ) {
    if (!studentId || !classId || !sectionId) throw new LocalizedException('sync.studentid_classid_and_sectionid_are_required_25054980', undefined, undefined, 'studentId, classId, and sectionId are required');

    const enrollment = await this.prisma.studentClass.findFirst({
      where: {
        schoolId,
        studentId,
        classId,
        sectionId,
      },
      select: { id: true },
    });

    if (!enrollment) throw new LocalizedException('sync.student_is_not_enrolled_in_this_class_section_for_your_schoo_1d425733', undefined, undefined, 'Student is not enrolled in this class/section for your school');
  }

  private normalizeAttendanceStatus(status: string): AttendanceStatus {
    const normalized = String(status || '').trim().toUpperCase();
    if (!['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(normalized)) throw new LocalizedException('sync.invalid_attendance_status_7ce25012', undefined, undefined, 'Invalid attendance status');
    return normalized as AttendanceStatus;
  }

  // ============================================
  // CONFLICTS
  // ============================================

  /**
   * Get unresolved conflicts
   */
  async getConflicts(schoolId: string): Promise<
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
    const conflicts = await this.prisma.syncConflict.findMany({
      where: { schoolId, status: 'pending' },
      orderBy: { detectedAt: 'desc' },
    });

    return conflicts.map((c) => ({
      id: c.id,
      entity: c.entity,
      entityId: c.entityId,
      conflictType: c.conflictType,
      detectedAt: c.detectedAt.toISOString(),
      localData: (c.localData as Record<string, unknown>) || {},
      serverData: (c.serverData as Record<string, unknown>) || {},
    }));
  }

  /**
   * Record a conflict
   */
  async recordConflict(
    schoolId: string,
    entity: string,
    entityId: string,
    conflictType: string,
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    deviceId?: string,
  ): Promise<string> {
    const conflict = await this.prisma.syncConflict.create({
      data: {
        schoolId,
        entity,
        entityId,
        conflictType,
        localData: localData as unknown as object,
        serverData: serverData as unknown as object,
        status: 'pending',
        detectedAt: new Date(),
      },
    });
    return conflict.id;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    id: string,
    resolution: 'local_wins' | 'server_wins' | 'merged',
    data?: Record<string, unknown>,
    resolvedBy?: string,
  ): Promise<{ success: boolean }> {
    const conflict = await this.prisma.syncConflict.findUnique({
      where: { id },
    });

    if (!conflict) throw new LocalizedException('sync.conflict_not_found_2889071e', undefined, undefined, 'Conflict not found');

    await this.prisma.syncConflict.update({
      where: { id },
      data: {
        status: 'resolved',
        resolution,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });

    return { success: true };
  }

  // ============================================
  // STATUS
  // ============================================

  /**
   * Get sync status
   */
  async getSyncStatus(schoolId: string): Promise<{
    pendingCount: number;
    lastSyncAt: string;
    conflicts: number;
  }> {
    const conflictCount = await this.prisma.syncConflict.count({
      where: { schoolId, status: 'pending' },
    });

    return {
      pendingCount: 0,
      lastSyncAt: new Date().toISOString(),
      conflicts: conflictCount,
    };
  }
}
