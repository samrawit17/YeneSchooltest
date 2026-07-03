import { EventBusService } from './event-bus.service';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class SuperadminEventListener {
    private readonly eventBus;
    private readonly notificationService;
    private readonly prisma;
    private readonly logger;
    constructor(eventBus: EventBusService, notificationService: NotificationService, prisma: PrismaService);
    private notifySuperAdmins;
    private handleSchoolCreated;
    private handleSchoolUpdated;
    private handleSchoolDeleted;
    private handlePlanCreated;
    private handlePlanUpdated;
    private handlePlanDeleted;
    private handlePlanAssigned;
    private handleAdminCreated;
    private handleAdminDeleted;
    private handleItManagerCreated;
    private handlePlatformSettingsUpdated;
    private handleBackupDownloaded;
    private handlePermissionCreated;
    private handlePermissionUpdated;
    private handlePermissionDeleted;
    private handleRolePermissionAssigned;
    private handleRolePermissionRemoved;
}
