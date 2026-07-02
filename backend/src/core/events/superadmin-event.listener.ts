import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '../../notification/notification.service';
import type { AppEvent, EventMap } from './event.interface';

@Injectable()
export class SuperadminEventListener {
  private readonly logger = new Logger(SuperadminEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {
    // School events
    this.eventBus.on('school.created', this.handleSchoolCreated);
    this.eventBus.on('school.updated', this.handleSchoolUpdated);
    this.eventBus.on('school.deleted', this.handleSchoolDeleted);

    // Subscription events
    this.eventBus.on('subscription.plan.created', this.handlePlanCreated);
    this.eventBus.on('subscription.plan.updated', this.handlePlanUpdated);
    this.eventBus.on('subscription.plan.deleted', this.handlePlanDeleted);
    this.eventBus.on('subscription.assigned', this.handlePlanAssigned);

    // Admin/user events
    this.eventBus.on('admin.created', this.handleAdminCreated);
    this.eventBus.on('admin.deleted', this.handleAdminDeleted);
    this.eventBus.on('it-manager.created', this.handleItManagerCreated);

    // Platform settings
    this.eventBus.on('platform.settings.updated', this.handlePlatformSettingsUpdated);

    // Backup events
    this.eventBus.on('backup.downloaded', this.handleBackupDownloaded);

    // Permission events
    this.eventBus.on('permission.created', this.handlePermissionCreated);
    this.eventBus.on('permission.updated', this.handlePermissionUpdated);
    this.eventBus.on('permission.deleted', this.handlePermissionDeleted);
    this.eventBus.on('role.permission.assigned', this.handleRolePermissionAssigned);
    this.eventBus.on('role.permission.removed', this.handleRolePermissionRemoved);
  }

  private notifySuperAdmins = async (
    title: string,
    message: string,
    type: NotificationType,
    actionUrl?: string,
    metadata?: Record<string, unknown>,
  ) => {
    try {
      const superAdmins = await this.prisma.user.findMany({
        where: {
          role: 'SUPER_ADMIN' as any,
          isActive: true,
        },
        select: { id: true },
      });

      if (superAdmins.length === 0) return;

      await Promise.all(
        superAdmins.map((sa) =>
          this.notificationService.createPlatformNotification({
            userId: sa.id,
            title,
            message,
            type,
            actionUrl,
            metadata,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify superadmins: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  private handleSchoolCreated = async (
    event: AppEvent & { payload: EventMap['school.created'] },
  ): Promise<void> => {
    const { schoolName, email } = event.payload;
    this.logger.log(`School created: ${schoolName} (${email})`);

    await this.notifySuperAdmins(
      'New School Created',
      `School "${schoolName}" (${email}) has been registered on the platform.`,
      NotificationType.INFO,
      '/superadmin',
      { schoolName, email },
    );
  };

  private handleSchoolUpdated = async (
    event: AppEvent & { payload: EventMap['school.updated'] },
  ): Promise<void> => {
    const { schoolName, changes } = event.payload;
    this.logger.log(`School updated: ${schoolName} - changes: ${changes.join(', ')}`);
  };

  private handleSchoolDeleted = async (
    event: AppEvent & { payload: EventMap['school.deleted'] },
  ): Promise<void> => {
    const { schoolName } = event.payload;
    this.logger.log(`School deleted: ${schoolName}`);

    await this.notifySuperAdmins(
      'School Deleted',
      `School "${schoolName}" has been removed from the platform.`,
      NotificationType.ALERT,
      '/superadmin',
      { schoolName },
    );
  };

  private handlePlanCreated = async (
    event: AppEvent & { payload: EventMap['subscription.plan.created'] },
  ): Promise<void> => {
    const { name, tier } = event.payload;
    this.logger.log(`Subscription plan created: ${name} (${tier})`);

    await this.notifySuperAdmins(
      'New Subscription Plan',
      `Plan "${name}" (${tier}) has been created.`,
      NotificationType.INFO,
      '/superadmin/subscription/plans',
      { planName: name, tier },
    );
  };

  private handlePlanUpdated = async (
    event: AppEvent & { payload: EventMap['subscription.plan.updated'] },
  ): Promise<void> => {
    const { name, tier, changes } = event.payload;
    this.logger.log(`Subscription plan updated: ${name} - changes: ${changes.join(', ')}`);
  };

  private handlePlanDeleted = async (
    event: AppEvent & { payload: EventMap['subscription.plan.deleted'] },
  ): Promise<void> => {
    const { name, tier } = event.payload;
    this.logger.log(`Subscription plan deleted: ${name} (${tier})`);

    await this.notifySuperAdmins(
      'Subscription Plan Deleted',
      `Plan "${name}" (${tier}) has been deleted.`,
      NotificationType.ALERT,
      '/superadmin/subscription/plans',
      { planName: name, tier },
    );
  };

  private handlePlanAssigned = async (
    event: AppEvent & { payload: EventMap['subscription.assigned'] },
  ): Promise<void> => {
    const { schoolName, planName } = event.payload;
    this.logger.log(
      `Plan assigned: ${planName || 'No plan'} -> ${schoolName}`,
    );

    if (planName) {
      await this.notifySuperAdmins(
        'Plan Assigned to School',
        `School "${schoolName}" has been assigned plan "${planName}".`,
        NotificationType.INFO,
        '/superadmin/subscription/schools',
        { schoolName, planName },
      );
    } else {
      await this.notifySuperAdmins(
        'Plan Removed from School',
        `Plan has been removed from school "${schoolName}".`,
        NotificationType.WARNING,
        '/superadmin/subscription/schools',
        { schoolName },
      );
    }
  };

  private handleAdminCreated = async (
    event: AppEvent & { payload: EventMap['admin.created'] },
  ): Promise<void> => {
    const { email, name, schoolId } = event.payload;
    this.logger.log(`Admin created: ${name} (${email}) for school ${schoolId}`);

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    await this.notifySuperAdmins(
      'New Admin Created',
      `Admin "${name}" (${email}) created for school "${school?.name || schoolId}".`,
      NotificationType.INFO,
      '/superadmin/admins',
      { adminEmail: email, adminName: name, schoolId },
    );
  };

  private handleAdminDeleted = async (
    event: AppEvent & { payload: EventMap['admin.deleted'] },
  ): Promise<void> => {
    const { email, schoolId } = event.payload;
    this.logger.log(`Admin deleted: ${email} from school ${schoolId}`);

    await this.notifySuperAdmins(
      'Admin Deleted',
      `Admin account "${email}" has been deleted.`,
      NotificationType.ALERT,
      '/superadmin/admins',
      { adminEmail: email, schoolId },
    );
  };

  private handleItManagerCreated = async (
    event: AppEvent & { payload: EventMap['it-manager.created'] },
  ): Promise<void> => {
    const { email, name, schoolId } = event.payload;
    this.logger.log(`IT Manager created: ${name} (${email}) for school ${schoolId}`);

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    await this.notifySuperAdmins(
      'New IT Manager Created',
      `IT Manager "${name}" (${email}) created for school "${school?.name || schoolId}".`,
      NotificationType.INFO,
      '/superadmin/admins',
      { itManagerEmail: email, itManagerName: name, schoolId },
    );
  };

  private handlePlatformSettingsUpdated = async (
    event: AppEvent & { payload: EventMap['platform.settings.updated'] },
  ): Promise<void> => {
    const { keys } = event.payload;
    this.logger.log(`Platform settings updated: ${keys.join(', ')}`);

    await this.notifySuperAdmins(
      'Platform Settings Updated',
      `Platform settings have been updated: ${keys.join(', ')}`,
      NotificationType.INFO,
      '/superadmin',
      { updatedKeys: keys },
    );
  };

  private handleBackupDownloaded = async (
    event: AppEvent & { payload: EventMap['backup.downloaded'] },
  ): Promise<void> => {
    const { backupType, schoolId, fileName } = event.payload;

    if (schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true },
      });
      this.logger.log(
        `School backup downloaded: ${school?.name || schoolId} (${backupType}) - ${fileName}`,
      );
    } else {
      this.logger.log(`Platform backup downloaded: ${backupType} - ${fileName}`);
    }
  };

  private handlePermissionCreated = async (
    event: AppEvent & { payload: EventMap['permission.created'] },
  ): Promise<void> => {
    const { name, module: moduleName } = event.payload;
    this.logger.log(`Permission created: ${name} (${moduleName})`);

    await this.notifySuperAdmins(
      'New Permission Created',
      `Permission "${name}" has been created in module "${moduleName}".`,
      NotificationType.INFO,
      '/superadmin',
      { permissionName: name, module: moduleName },
    );
  };

  private handlePermissionUpdated = async (
    event: AppEvent & { payload: EventMap['permission.updated'] },
  ): Promise<void> => {
    const { name, changes } = event.payload;
    this.logger.log(`Permission updated: ${name} - changes: ${changes.join(', ')}`);
  };

  private handlePermissionDeleted = async (
    event: AppEvent & { payload: EventMap['permission.deleted'] },
  ): Promise<void> => {
    const { name } = event.payload;
    this.logger.log(`Permission deleted: ${name}`);

    await this.notifySuperAdmins(
      'Permission Deleted',
      `Permission "${name}" has been deleted.`,
      NotificationType.ALERT,
      '/superadmin',
      { permissionName: name },
    );
  };

  private handleRolePermissionAssigned = async (
    event: AppEvent & { payload: EventMap['role.permission.assigned'] },
  ): Promise<void> => {
    const { role, permissionName } = event.payload;
    this.logger.log(`Permission "${permissionName}" assigned to role "${role}"`);

    await this.notifySuperAdmins(
      'Role Permission Assigned',
      `Permission "${permissionName}" has been assigned to role "${role}".`,
      NotificationType.INFO,
      '/superadmin',
      { role, permissionName },
    );
  };

  private handleRolePermissionRemoved = async (
    event: AppEvent & { payload: EventMap['role.permission.removed'] },
  ): Promise<void> => {
    const { role, permissionName } = event.payload;
    this.logger.log(`Permission "${permissionName}" removed from role "${role}"`);

    await this.notifySuperAdmins(
      'Role Permission Removed',
      `Permission "${permissionName}" has been removed from role "${role}".`,
      NotificationType.WARNING,
      '/superadmin',
      { role, permissionName },
    );
  };
}
