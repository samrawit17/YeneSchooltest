import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';
import { NotificationService } from '../../notification/notification.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class PushNotificationAction extends BaseAction {
    private readonly notificationService;
    private readonly prisma;
    readonly type = "push_notification";
    constructor(notificationService: NotificationService, prisma: PrismaService);
    execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult>;
    private resolveUserIds;
    private compileTemplate;
}
