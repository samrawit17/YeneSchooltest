import { EventBusService } from '../event-bus.service';
import { NotificationService } from '../../../notification/notification.service';
export declare class NotificationEventListener {
    private readonly eventBus;
    private readonly notificationService;
    private readonly logger;
    constructor(eventBus: EventBusService, notificationService: NotificationService);
    private handleAnnouncementCreated;
    private handleDisciplineCreated;
    private handleLessonCreated;
    private handleSchoolEventCreated;
    private handleGradingCompleted;
    private handleGradingPublished;
    private handleSirenTriggered;
}
