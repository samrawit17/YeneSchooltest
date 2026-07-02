import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../event-bus.service';
import { NotificationService } from '../../../notification/notification.service';
import type { AppEvent } from '../event.interface';

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly notificationService: NotificationService,
  ) {
    this.eventBus.on('announcement.created', this.handleAnnouncementCreated);
    this.eventBus.on('discipline.created', this.handleDisciplineCreated);
    this.eventBus.on('lesson.created', this.handleLessonCreated);
    this.eventBus.on('school-event.created', this.handleSchoolEventCreated);
    this.eventBus.on('grading.completed', this.handleGradingCompleted);
    this.eventBus.on('grading.published', this.handleGradingPublished);
    this.eventBus.on('siren.triggered', this.handleSirenTriggered);
  }

  private handleAnnouncementCreated = async (event: AppEvent): Promise<void> => {
    const { schoolId, title, audience } = event.payload;
    try {
      await this.notificationService.sendSchoolAnnouncement(schoolId, title, '');
    } catch (error) {
      this.logger.error(`Failed to process announcement.created: ${error}`);
    }
  };

  private handleDisciplineCreated = async (event: AppEvent): Promise<void> => {
    const { schoolId, studentId, severity } = event.payload;
    try {
      await this.notificationService.createSystemAlert(
        schoolId,
        'Discipline Incident Reported',
        `A ${severity} severity incident has been reported.`,
      );
    } catch (error) {
      this.logger.error(`Failed to process discipline.created: ${error}`);
    }
  };

  private handleLessonCreated = async (event: AppEvent): Promise<void> => {
    const { schoolId, lessonId, title } = event.payload;
    this.logger.log(`Lesson created: ${title} (${lessonId}) for school ${schoolId}`);
  };

  private handleSchoolEventCreated = async (event: AppEvent): Promise<void> => {
    const { schoolId, title, audience } = event.payload;
    try {
      await this.notificationService.createSystemAlert(schoolId, `New Event: ${title}`, '');
    } catch (error) {
      this.logger.error(`Failed to process school-event.created: ${error}`);
    }
  };

  private handleGradingCompleted = async (event: AppEvent): Promise<void> => {
    this.logger.log(`Grading completed for ${event.payload.studentIds?.length || 0} students`);
  };

  private handleGradingPublished = async (event: AppEvent): Promise<void> => {
    const { schoolId, classId, termId } = event.payload;
    try {
      await this.notificationService.createSystemAlert(
        schoolId,
        'Grades Published',
        `Grades for term ${termId} have been published.`,
      );
    } catch (error) {
      this.logger.error(`Failed to process grading.published: ${error}`);
    }
  };

  private handleSirenTriggered = async (event: AppEvent): Promise<void> => {
    const { schoolId, type } = event.payload;
    this.logger.warn(`Siren triggered: ${type} for school ${schoolId}`);
    try {
      await this.notificationService.createSystemAlert(
        schoolId,
        `Siren Alert: ${type}`,
        `A ${type} siren has been triggered. Please take appropriate action.`,
      );
    } catch (error) {
      this.logger.error(`Failed to process siren.triggered: ${error}`);
    }
  };
}
