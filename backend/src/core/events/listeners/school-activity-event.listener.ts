import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../event-bus.service';
import { NotificationService } from '../../../notification/notification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AppEvent, EventMap } from '../event.interface';

@Injectable()
export class SchoolActivityEventListener {
  private readonly logger = new Logger(SchoolActivityEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {
    this.eventBus.on('academic-year.created', this.handleAcademicYearCreated);
    this.eventBus.on('academic-year.activated', this.handleAcademicYearActivated);
    this.eventBus.on('term.activated', this.handleTermActivated);
    this.eventBus.on('teacher.assigned', this.handleTeacherAssigned);
    this.eventBus.on('teacher.unassigned', this.handleTeacherUnassigned);
    this.eventBus.on('parent.linked', this.handleParentLinked);
    this.eventBus.on('parent.unlinked', this.handleParentUnlinked);
    this.eventBus.on('class.created', this.handleClassCreated);
    this.eventBus.on('class.updated', this.handleClassUpdated);
    this.eventBus.on('class.deleted', this.handleClassDeleted);
    this.eventBus.on('timetable.created', this.handleTimetableCreated);
    this.eventBus.on('timetable.updated', this.handleTimetableUpdated);
    this.eventBus.on('timetable.deleted', this.handleTimetableDeleted);
  }

  private handleAcademicYearCreated = async (event: AppEvent & { payload: EventMap['academic-year.created'] }): Promise<void> => {
    try {
      await this.notificationService.createNotification({
        schoolId: event.payload.schoolId,
        type: 'ACADEMIC_YEAR_CREATED',
        title: 'Academic Year Created',
        message: `New academic year "${event.payload.name}" has been created.`,
        userId: event.payload.createdBy,
      });
    } catch (error) {
      this.logger.error(`academic-year.created handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleAcademicYearActivated = async (event: AppEvent & { payload: EventMap['academic-year.activated'] }): Promise<void> => {
    try {
      const admins = await this.prisma.user.findMany({
        where: { schoolId: event.payload.schoolId, role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      await Promise.allSettled(
        admins.map((admin) =>
          this.notificationService.createNotification({
            schoolId: event.payload.schoolId,
            type: 'ACADEMIC_YEAR_ACTIVATED',
            title: 'Academic Year Activated',
            message: `Academic year "${event.payload.name}" is now active.`,
            userId: admin.id,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`academic-year.activated handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleTermActivated = async (event: AppEvent & { payload: EventMap['term.activated'] }): Promise<void> => {
    try {
      const admins = await this.prisma.user.findMany({
        where: { schoolId: event.payload.schoolId, role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      await Promise.allSettled(
        admins.map((admin) =>
          this.notificationService.createNotification({
            schoolId: event.payload.schoolId,
            type: 'TERM_ACTIVATED',
            title: 'Term Created',
            message: `Term "${event.payload.name}" has been created.`,
            userId: admin.id,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`term.activated handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleTeacherAssigned = async (event: AppEvent & { payload: EventMap['teacher.assigned'] }): Promise<void> => {
    try {
      await this.notificationService.createNotification({
        schoolId: event.payload.schoolId,
        type: 'TEACHER_ASSIGNED',
        title: 'Teacher Assignment',
        message: `${event.payload.teacherName} assigned as ${event.payload.role}${event.payload.className ? ` to ${event.payload.className}` : ''}${event.payload.subjectName ? ` (${event.payload.subjectName})` : ''}.`,
        userId: event.payload.teacherId,
      });
    } catch (error) {
      this.logger.error(`teacher.assigned handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleTeacherUnassigned = async (event: AppEvent & { payload: EventMap['teacher.unassigned'] }): Promise<void> => {
    try {
      await this.notificationService.createNotification({
        schoolId: event.payload.schoolId,
        type: 'TEACHER_UNASSIGNED',
        title: 'Teacher Unassigned',
        message: `${event.payload.teacherName} removed from ${event.payload.role} role${event.payload.className ? ` in ${event.payload.className}` : ''}.`,
        userId: event.payload.teacherId,
      });
    } catch (error) {
      this.logger.error(`teacher.unassigned handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleParentLinked = async (event: AppEvent & { payload: EventMap['parent.linked'] }): Promise<void> => {
    try {
      await this.notificationService.createNotification({
        schoolId: event.payload.schoolId,
        type: 'PARENT_LINKED',
        title: 'Parent Linked',
        message: `${event.payload.parentName} linked to student ${event.payload.studentName}.`,
        userId: event.payload.parentId,
      });
    } catch (error) {
      this.logger.error(`parent.linked handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleParentUnlinked = async (event: AppEvent & { payload: EventMap['parent.unlinked'] }): Promise<void> => {
    try {
      await this.notificationService.createNotification({
        schoolId: event.payload.schoolId,
        type: 'PARENT_UNLINKED',
        title: 'Parent Unlinked',
        message: `${event.payload.parentName} unlinked from student ${event.payload.studentName}.`,
        userId: event.payload.parentId,
      });
    } catch (error) {
      this.logger.error(`parent.unlinked handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleClassCreated = async (event: AppEvent & { payload: EventMap['class.created'] }): Promise<void> => {
    try {
      const admins = await this.prisma.user.findMany({
        where: { schoolId: event.payload.schoolId, role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      await Promise.allSettled(
        admins.map((admin) =>
          this.notificationService.createNotification({
            schoolId: event.payload.schoolId,
            type: 'CLASS_CREATED',
            title: 'Class Created',
            message: `Class "${event.payload.name}" grade ${event.payload.grade} section ${event.payload.section} has been created.`,
            userId: admin.id,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`class.created handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleClassUpdated = async (event: AppEvent & { payload: EventMap['class.updated'] }): Promise<void> => {
    try {
      await this.notificationService.createNotification({
        schoolId: event.payload.schoolId,
        type: 'CLASS_UPDATED',
        title: 'Class Updated',
        message: `Class "${event.payload.name}" has been updated (${event.payload.changes.join(', ')}).`,
        userId: event.payload.updatedBy,
      });
    } catch (error) {
      this.logger.error(`class.updated handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleClassDeleted = async (event: AppEvent & { payload: EventMap['class.deleted'] }): Promise<void> => {
    try {
      const admins = await this.prisma.user.findMany({
        where: { schoolId: event.payload.schoolId, role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      await Promise.allSettled(
        admins.map((admin) =>
          this.notificationService.createNotification({
            schoolId: event.payload.schoolId,
            type: 'CLASS_DELETED',
            title: 'Class Deleted',
            message: `Class "${event.payload.name}" grade ${event.payload.grade} section ${event.payload.section} has been deleted.`,
            userId: admin.id,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`class.deleted handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleTimetableCreated = async (event: AppEvent & { payload: EventMap['timetable.created'] }): Promise<void> => {
    try {
      await this.notificationService.createNotification({
        schoolId: event.payload.schoolId,
        type: 'TIMETABLE_CREATED',
        title: 'Timetable Slot Created',
        message: `New timetable slot created: ${event.payload.subjectName} on ${event.payload.day} (${event.payload.startTime}-${event.payload.endTime}).`,
        userId: event.payload.teacherId,
      });
    } catch (error) {
      this.logger.error(`timetable.created handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleTimetableUpdated = async (event: AppEvent & { payload: EventMap['timetable.updated'] }): Promise<void> => {
    try {
      await this.notificationService.createNotification({
        schoolId: event.payload.schoolId,
        type: 'TIMETABLE_UPDATED',
        title: 'Timetable Slot Updated',
        message: `Timetable slot ${event.payload.subjectName} has been updated (${event.payload.changes.join(', ')}).`,
        userId: event.payload.updatedBy,
      });
    } catch (error) {
      this.logger.error(`timetable.updated handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  private handleTimetableDeleted = async (event: AppEvent & { payload: EventMap['timetable.deleted'] }): Promise<void> => {
    try {
      const teachers = await this.prisma.teacherSubjectAssignment.findMany({
        where: { classId: event.payload.classId, schoolId: event.payload.schoolId },
        select: { teacherId: true },
      });

      await Promise.allSettled(
        teachers.map((t) =>
          this.notificationService.createNotification({
            schoolId: event.payload.schoolId,
            type: 'TIMETABLE_DELETED',
            title: 'Timetable Slot Deleted',
            message: `Timetable slot for ${event.payload.subjectName} on ${event.payload.day} has been removed.`,
            userId: t.teacherId,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`timetable.deleted handler failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
}
