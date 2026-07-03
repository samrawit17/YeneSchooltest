"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationEventListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("../event-bus.service");
const notification_service_1 = require("../../../notification/notification.service");
let NotificationEventListener = NotificationEventListener_1 = class NotificationEventListener {
    eventBus;
    notificationService;
    logger = new common_1.Logger(NotificationEventListener_1.name);
    constructor(eventBus, notificationService) {
        this.eventBus = eventBus;
        this.notificationService = notificationService;
        this.eventBus.on('announcement.created', this.handleAnnouncementCreated);
        this.eventBus.on('discipline.created', this.handleDisciplineCreated);
        this.eventBus.on('lesson.created', this.handleLessonCreated);
        this.eventBus.on('school-event.created', this.handleSchoolEventCreated);
        this.eventBus.on('grading.completed', this.handleGradingCompleted);
        this.eventBus.on('grading.published', this.handleGradingPublished);
        this.eventBus.on('siren.triggered', this.handleSirenTriggered);
    }
    handleAnnouncementCreated = async (event) => {
        const { schoolId, title, audience } = event.payload;
        try {
            await this.notificationService.sendSchoolAnnouncement(schoolId, title, '');
        }
        catch (error) {
            this.logger.error(`Failed to process announcement.created: ${error}`);
        }
    };
    handleDisciplineCreated = async (event) => {
        const { schoolId, studentId, severity } = event.payload;
        try {
            await this.notificationService.createSystemAlert(schoolId, 'Discipline Incident Reported', `A ${severity} severity incident has been reported.`);
        }
        catch (error) {
            this.logger.error(`Failed to process discipline.created: ${error}`);
        }
    };
    handleLessonCreated = async (event) => {
        const { schoolId, lessonId, title } = event.payload;
        this.logger.log(`Lesson created: ${title} (${lessonId}) for school ${schoolId}`);
    };
    handleSchoolEventCreated = async (event) => {
        const { schoolId, title, audience } = event.payload;
        try {
            await this.notificationService.createSystemAlert(schoolId, `New Event: ${title}`, '');
        }
        catch (error) {
            this.logger.error(`Failed to process school-event.created: ${error}`);
        }
    };
    handleGradingCompleted = async (event) => {
        this.logger.log(`Grading completed for ${event.payload.studentIds?.length || 0} students`);
    };
    handleGradingPublished = async (event) => {
        const { schoolId, classId, termId } = event.payload;
        try {
            await this.notificationService.createSystemAlert(schoolId, 'Grades Published', `Grades for term ${termId} have been published.`);
        }
        catch (error) {
            this.logger.error(`Failed to process grading.published: ${error}`);
        }
    };
    handleSirenTriggered = async (event) => {
        const { schoolId, type } = event.payload;
        this.logger.warn(`Siren triggered: ${type} for school ${schoolId}`);
        try {
            await this.notificationService.createSystemAlert(schoolId, `Siren Alert: ${type}`, `A ${type} siren has been triggered. Please take appropriate action.`);
        }
        catch (error) {
            this.logger.error(`Failed to process siren.triggered: ${error}`);
        }
    };
};
exports.NotificationEventListener = NotificationEventListener;
exports.NotificationEventListener = NotificationEventListener = NotificationEventListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        notification_service_1.NotificationService])
], NotificationEventListener);
//# sourceMappingURL=notification-event.listener.js.map