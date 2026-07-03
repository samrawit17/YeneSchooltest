import { EventBusService } from '../../core/events/event-bus.service';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SchoolSettingsService } from '../../school-settings/school-settings.service';
export declare class AttendanceEventListener {
    private readonly eventBus;
    private readonly notificationService;
    private readonly prisma;
    private readonly schoolSettings;
    private readonly logger;
    constructor(eventBus: EventBusService, notificationService: NotificationService, prisma: PrismaService, schoolSettings: SchoolSettingsService);
    private handleSessionSubmitted;
    private handleOverridden;
}
