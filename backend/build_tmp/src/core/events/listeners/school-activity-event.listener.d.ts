import { EventBusService } from '../event-bus.service';
import { NotificationService } from '../../../notification/notification.service';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class SchoolActivityEventListener {
    private readonly eventBus;
    private readonly notificationService;
    private readonly prisma;
    private readonly logger;
    constructor(eventBus: EventBusService, notificationService: NotificationService, prisma: PrismaService);
    private handleAcademicYearCreated;
    private handleAcademicYearActivated;
    private handleTermActivated;
    private handleTeacherAssigned;
    private handleTeacherUnassigned;
    private handleParentLinked;
    private handleParentUnlinked;
    private handleClassCreated;
    private handleClassUpdated;
    private handleClassDeleted;
    private handleTimetableCreated;
    private handleTimetableUpdated;
    private handleTimetableDeleted;
}
