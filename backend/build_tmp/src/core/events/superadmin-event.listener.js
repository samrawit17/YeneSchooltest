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
var SuperadminEventListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperadminEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_bus_service_1 = require("./event-bus.service");
const notification_service_1 = require("../../notification/notification.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const notification_service_2 = require("../../notification/notification.service");
let SuperadminEventListener = SuperadminEventListener_1 = class SuperadminEventListener {
    eventBus;
    notificationService;
    prisma;
    logger = new common_1.Logger(SuperadminEventListener_1.name);
    constructor(eventBus, notificationService, prisma) {
        this.eventBus = eventBus;
        this.notificationService = notificationService;
        this.prisma = prisma;
        this.eventBus.on('school.created', this.handleSchoolCreated);
        this.eventBus.on('school.updated', this.handleSchoolUpdated);
        this.eventBus.on('school.deleted', this.handleSchoolDeleted);
        this.eventBus.on('subscription.plan.created', this.handlePlanCreated);
        this.eventBus.on('subscription.plan.updated', this.handlePlanUpdated);
        this.eventBus.on('subscription.plan.deleted', this.handlePlanDeleted);
        this.eventBus.on('subscription.assigned', this.handlePlanAssigned);
        this.eventBus.on('admin.created', this.handleAdminCreated);
        this.eventBus.on('admin.deleted', this.handleAdminDeleted);
        this.eventBus.on('it-manager.created', this.handleItManagerCreated);
        this.eventBus.on('platform.settings.updated', this.handlePlatformSettingsUpdated);
        this.eventBus.on('backup.downloaded', this.handleBackupDownloaded);
        this.eventBus.on('permission.created', this.handlePermissionCreated);
        this.eventBus.on('permission.updated', this.handlePermissionUpdated);
        this.eventBus.on('permission.deleted', this.handlePermissionDeleted);
        this.eventBus.on('role.permission.assigned', this.handleRolePermissionAssigned);
        this.eventBus.on('role.permission.removed', this.handleRolePermissionRemoved);
    }
    notifySuperAdmins = async (title, message, type, actionUrl, metadata) => {
        try {
            const superAdmins = await this.prisma.user.findMany({
                where: {
                    role: 'SUPER_ADMIN',
                    isActive: true,
                },
                select: { id: true },
            });
            if (superAdmins.length === 0)
                return;
            await Promise.all(superAdmins.map((sa) => this.notificationService.createPlatformNotification({
                userId: sa.id,
                title,
                message,
                type,
                actionUrl,
                metadata,
            })));
        }
        catch (error) {
            this.logger.error(`Failed to notify superadmins: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    handleSchoolCreated = async (event) => {
        const { schoolName, email } = event.payload;
        this.logger.log(`School created: ${schoolName} (${email})`);
        await this.notifySuperAdmins('New School Created', `School "${schoolName}" (${email}) has been registered on the platform.`, notification_service_2.NotificationType.INFO, '/superadmin', { schoolName, email });
    };
    handleSchoolUpdated = async (event) => {
        const { schoolName, changes } = event.payload;
        this.logger.log(`School updated: ${schoolName} - changes: ${changes.join(', ')}`);
    };
    handleSchoolDeleted = async (event) => {
        const { schoolName } = event.payload;
        this.logger.log(`School deleted: ${schoolName}`);
        await this.notifySuperAdmins('School Deleted', `School "${schoolName}" has been removed from the platform.`, notification_service_2.NotificationType.ALERT, '/superadmin', { schoolName });
    };
    handlePlanCreated = async (event) => {
        const { name, tier } = event.payload;
        this.logger.log(`Subscription plan created: ${name} (${tier})`);
        await this.notifySuperAdmins('New Subscription Plan', `Plan "${name}" (${tier}) has been created.`, notification_service_2.NotificationType.INFO, '/superadmin/subscription/plans', { planName: name, tier });
    };
    handlePlanUpdated = async (event) => {
        const { name, tier, changes } = event.payload;
        this.logger.log(`Subscription plan updated: ${name} - changes: ${changes.join(', ')}`);
    };
    handlePlanDeleted = async (event) => {
        const { name, tier } = event.payload;
        this.logger.log(`Subscription plan deleted: ${name} (${tier})`);
        await this.notifySuperAdmins('Subscription Plan Deleted', `Plan "${name}" (${tier}) has been deleted.`, notification_service_2.NotificationType.ALERT, '/superadmin/subscription/plans', { planName: name, tier });
    };
    handlePlanAssigned = async (event) => {
        const { schoolName, planName } = event.payload;
        this.logger.log(`Plan assigned: ${planName || 'No plan'} -> ${schoolName}`);
        if (planName) {
            await this.notifySuperAdmins('Plan Assigned to School', `School "${schoolName}" has been assigned plan "${planName}".`, notification_service_2.NotificationType.INFO, '/superadmin/subscription/schools', { schoolName, planName });
        }
        else {
            await this.notifySuperAdmins('Plan Removed from School', `Plan has been removed from school "${schoolName}".`, notification_service_2.NotificationType.WARNING, '/superadmin/subscription/schools', { schoolName });
        }
    };
    handleAdminCreated = async (event) => {
        const { email, name, schoolId } = event.payload;
        this.logger.log(`Admin created: ${name} (${email}) for school ${schoolId}`);
        const school = await this.prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true },
        });
        await this.notifySuperAdmins('New Admin Created', `Admin "${name}" (${email}) created for school "${school?.name || schoolId}".`, notification_service_2.NotificationType.INFO, '/superadmin/admins', { adminEmail: email, adminName: name, schoolId });
    };
    handleAdminDeleted = async (event) => {
        const { email, schoolId } = event.payload;
        this.logger.log(`Admin deleted: ${email} from school ${schoolId}`);
        await this.notifySuperAdmins('Admin Deleted', `Admin account "${email}" has been deleted.`, notification_service_2.NotificationType.ALERT, '/superadmin/admins', { adminEmail: email, schoolId });
    };
    handleItManagerCreated = async (event) => {
        const { email, name, schoolId } = event.payload;
        this.logger.log(`IT Manager created: ${name} (${email}) for school ${schoolId}`);
        const school = await this.prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true },
        });
        await this.notifySuperAdmins('New IT Manager Created', `IT Manager "${name}" (${email}) created for school "${school?.name || schoolId}".`, notification_service_2.NotificationType.INFO, '/superadmin/admins', { itManagerEmail: email, itManagerName: name, schoolId });
    };
    handlePlatformSettingsUpdated = async (event) => {
        const { keys } = event.payload;
        this.logger.log(`Platform settings updated: ${keys.join(', ')}`);
        await this.notifySuperAdmins('Platform Settings Updated', `Platform settings have been updated: ${keys.join(', ')}`, notification_service_2.NotificationType.INFO, '/superadmin', { updatedKeys: keys });
    };
    handleBackupDownloaded = async (event) => {
        const { backupType, schoolId, fileName, downloadedBy } = event.payload;
        if (schoolId) {
            const school = await this.prisma.school.findUnique({
                where: { id: schoolId },
                select: { name: true },
            });
            this.logger.log(`School backup downloaded: ${school?.name || schoolId} (${backupType}) - ${fileName}`);
            await this.notifySuperAdmins('School Backup Downloaded', `Backup for "${school?.name || schoolId}" (${backupType}) was downloaded${downloadedBy ? ` by user ${downloadedBy}` : ''}.`, notification_service_2.NotificationType.INFO, '/superadmin/backups', { fileName, backupType, schoolId, downloadedBy });
            return;
        }
        this.logger.log(`Platform backup downloaded: ${backupType} - ${fileName}`);
        await this.notifySuperAdmins('Platform Backup Downloaded', `A full platform backup was downloaded${downloadedBy ? ` by user ${downloadedBy}` : ''}: ${fileName}.`, notification_service_2.NotificationType.INFO, '/superadmin/backups', { fileName, backupType, downloadedBy });
    };
    handlePermissionCreated = async (event) => {
        const { name, module: moduleName } = event.payload;
        this.logger.log(`Permission created: ${name} (${moduleName})`);
        await this.notifySuperAdmins('New Permission Created', `Permission "${name}" has been created in module "${moduleName}".`, notification_service_2.NotificationType.INFO, '/superadmin', { permissionName: name, module: moduleName });
    };
    handlePermissionUpdated = async (event) => {
        const { name, changes } = event.payload;
        this.logger.log(`Permission updated: ${name} - changes: ${changes.join(', ')}`);
    };
    handlePermissionDeleted = async (event) => {
        const { name } = event.payload;
        this.logger.log(`Permission deleted: ${name}`);
        await this.notifySuperAdmins('Permission Deleted', `Permission "${name}" has been deleted.`, notification_service_2.NotificationType.ALERT, '/superadmin', { permissionName: name });
    };
    handleRolePermissionAssigned = async (event) => {
        const { role, permissionName } = event.payload;
        this.logger.log(`Permission "${permissionName}" assigned to role "${role}"`);
        await this.notifySuperAdmins('Role Permission Assigned', `Permission "${permissionName}" has been assigned to role "${role}".`, notification_service_2.NotificationType.INFO, '/superadmin', { role, permissionName });
    };
    handleRolePermissionRemoved = async (event) => {
        const { role, permissionName } = event.payload;
        this.logger.log(`Permission "${permissionName}" removed from role "${role}"`);
        await this.notifySuperAdmins('Role Permission Removed', `Permission "${permissionName}" has been removed from role "${role}".`, notification_service_2.NotificationType.WARNING, '/superadmin', { role, permissionName });
    };
};
exports.SuperadminEventListener = SuperadminEventListener;
exports.SuperadminEventListener = SuperadminEventListener = SuperadminEventListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_bus_service_1.EventBusService,
        notification_service_1.NotificationService,
        prisma_service_1.PrismaService])
], SuperadminEventListener);
//# sourceMappingURL=superadmin-event.listener.js.map