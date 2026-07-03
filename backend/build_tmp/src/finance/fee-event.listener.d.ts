import { EventBusService } from '../core/events/event-bus.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class FeeEventListener {
    private readonly eventBus;
    private readonly notificationService;
    private readonly prisma;
    private readonly logger;
    constructor(eventBus: EventBusService, notificationService: NotificationService, prisma: PrismaService);
    private handleFeePaid;
    private handleFeeOverdue;
}
