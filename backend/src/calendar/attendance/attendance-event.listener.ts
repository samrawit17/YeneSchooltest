import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../core/events/event-bus.service';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SchoolSettingsService } from '../../school-settings/school-settings.service';
import { formatSchoolDate } from '../../common/date.util';
import { SCHOOL_SETTING_KEYS } from '../../school-settings/school-settings.service';
import type { AppEvent, EventMap } from '../../core/events/event.interface';

@Injectable()
export class AttendanceEventListener {
  private readonly logger = new Logger(AttendanceEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly schoolSettings: SchoolSettingsService,
  ) {
    this.eventBus.on('attendance.session.submitted', this.handleSessionSubmitted);
    this.eventBus.on('attendance.overridden', this.handleOverridden);
  }

  private handleSessionSubmitted = async (event: AppEvent & { payload: EventMap['attendance.session.submitted'] }): Promise<void> => {
    const { schoolId, sessionId, classId, sectionId, date } = event.payload;

    try {
      const absentRecords = await this.prisma.attendanceRecord.findMany({
        where: {
          attendanceSessionId: sessionId,
          status: { in: ['ABSENT', 'LATE'] },
        },
        include: {
          student: {
            select: { id: true, name: true },
          },
        },
      });

      if (absentRecords.length === 0) return;

      let className = '';
      if (classId && classId !== 'unknown') {
        const cls = await this.prisma.class.findUnique({
          where: { id: classId },
          select: { name: true, grade: true, section: true },
        });
        if (cls) {
          className = cls.name || `Grade ${cls.grade}`;
          const secName = sectionId || cls.section;
          if (secName) className += ` - ${secName}`;
        }
      }

      const calendarType =
        (await this.schoolSettings.getSetting(
          schoolId,
          SCHOOL_SETTING_KEYS.CALENDAR_TYPE,
        )) || 'ETHIOPIAN';

      const dateStr = formatSchoolDate(new Date(date), {
        calendarType: calendarType === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN',
      });

      const studentUserIds = absentRecords.map((r) => r.student.id);
      const profiles = await this.prisma.studentProfile.findMany({
        where: { userId: { in: studentUserIds } },
        select: { id: true, userId: true },
      });

      const profileIdByUserId = new Map(profiles.map((p) => [p.userId, p.id]));
      const profileIds = profiles.map((p) => p.id);

      const parentRelations = await this.prisma.parentStudent.findMany({
        where: { studentId: { in: profileIds } },
        include: {
          parent: {
            select: {
              user: {
                select: { id: true },
              },
            },
          },
        },
      });

      const parentByStudentProfile = new Map<string, string[]>();
      for (const rel of parentRelations) {
        const existing = parentByStudentProfile.get(rel.studentId) || [];
        existing.push(rel.parent.user.id);
        parentByStudentProfile.set(rel.studentId, existing);
      }

      const results = await Promise.allSettled(
        absentRecords.map(async (record) => {
          const profileId = profileIdByUserId.get(record.student.id);
          if (!profileId) return;

          const parentIds = parentByStudentProfile.get(profileId) || [];
          if (parentIds.length === 0) return;

          const parentPromises = parentIds.map((parentId) => {
            if (record.status === 'ABSENT') {
              return this.notificationService.notifyParentOfAbsence(
                schoolId,
                parentId,
                record.student.name,
                dateStr,
                className,
              );
            }
            return this.notificationService.notifyParentOfLate(
              schoolId,
              parentId,
              record.student.name,
              dateStr,
              className,
            );
          });

          await Promise.allSettled(parentPromises);
        }),
      );

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        this.logger.error(
          `[correlationId=${event.metadata?.correlationId}] ${failed.length}/${absentRecords.length} absent-notification batches failed for session ${sessionId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[correlationId=${event.metadata?.correlationId}] Failed to process attendance.session.submitted for session ${sessionId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  };

  private handleOverridden = async (event: AppEvent & { payload: EventMap['attendance.overridden'] }): Promise<void> => {
    const { schoolId, studentId, newStatus, previousStatus, recordId } = event.payload;

    if (newStatus === previousStatus) return;

    try {
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
        select: { name: true },
      });
      if (!student) return;

      const record = await this.prisma.attendanceRecord.findUnique({
        where: { id: recordId },
        include: {
          session: {
            select: {
              date: true,
              class: { select: { name: true, grade: true, section: true } },
            },
          },
        },
      });
      if (!record) return;

      const className = record.session.class?.name
        ? record.session.class.name
        : `Grade ${record.session.class?.grade ?? ''}`;

      const calendarType =
        (await this.schoolSettings.getSetting(
          schoolId,
          SCHOOL_SETTING_KEYS.CALENDAR_TYPE,
        )) || 'ETHIOPIAN';

      const dateStr = formatSchoolDate(record.session.date, {
        calendarType: calendarType === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN',
      });

      const profile = await this.prisma.studentProfile.findUnique({
        where: { userId: studentId },
        select: { id: true },
      });
      if (!profile) return;

      const parentRelations = await this.prisma.parentStudent.findMany({
        where: { studentId: profile.id },
        include: {
          parent: { select: { user: { select: { id: true } } } },
        },
      });

      if (parentRelations.length === 0) return;

      await Promise.allSettled(
        parentRelations.map((rel) => {
          if (
            newStatus === 'ABSENT' &&
            previousStatus !== 'ABSENT'
          ) {
            return this.notificationService.notifyParentOfAbsence(
              schoolId,
              rel.parent.user.id,
              student.name,
              dateStr,
              className,
            );
          }
          if (
            newStatus === 'LATE' &&
            previousStatus !== 'LATE'
          ) {
            return this.notificationService.notifyParentOfLate(
              schoolId,
              rel.parent.user.id,
              student.name,
              dateStr,
              className,
            );
          }
          return Promise.resolve();
        }),
      );
    } catch (error) {
      this.logger.error(
        `[correlationId=${event.metadata?.correlationId}] Failed to process attendance.overridden for record ${recordId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  };
}
