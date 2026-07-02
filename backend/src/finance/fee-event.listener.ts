import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../core/events/event-bus.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AppEvent, EventMap } from '../core/events/event.interface';

@Injectable()
export class FeeEventListener {
  private readonly logger = new Logger(FeeEventListener.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {
    this.eventBus.on('fee.paid', this.handleFeePaid);
    this.eventBus.on('fee.overdue', this.handleFeeOverdue);
  }

  private handleFeePaid = async (event: AppEvent & { payload: EventMap['fee.paid'] }): Promise<void> => {
    const { schoolId, studentId, amount } = event.payload;

    try {
      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: { schoolId, userId: studentId },
        select: {
          id: true,
          user: { select: { name: true } },
          parents: { select: { parent: { select: { userId: true } } } },
        },
      });

      if (!studentProfile) return;

      const parentIds = studentProfile.parents
        .map((p) => p.parent.userId)
        .filter((id): id is string => Boolean(id));

      if (parentIds.length === 0) return;

      await Promise.allSettled(
        parentIds.map((parentId) =>
          this.notificationService.notifyPaymentReceived(schoolId, parentId, String(amount), ''),
        ),
      );
    } catch (error) {
      this.logger.error(
        `[correlationId=${event.metadata?.correlationId}] FeeEventListener.fee.paid failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  private handleFeeOverdue = async (event: AppEvent & { payload: EventMap['fee.overdue'] }): Promise<void> => {
    const { schoolId, studentId, amount, dueDate } = event.payload;

    try {
      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: { schoolId, userId: studentId },
        select: {
          id: true,
          user: { select: { name: true } },
          parents: { select: { parent: { select: { userId: true } } } },
        },
      });

      if (!studentProfile) return;

      const parentIds = studentProfile.parents
        .map((p) => p.parent.userId)
        .filter((id): id is string => Boolean(id));

      if (parentIds.length === 0) return;

      await Promise.allSettled(
        parentIds.map((parentId) =>
          this.notificationService.notifyFeeDue(schoolId, parentId, String(amount), dueDate || '', studentProfile.user.name || 'your child'),
        ),
      );
    } catch (error) {
      this.logger.error(
        `[correlationId=${event.metadata?.correlationId}] FeeEventListener.fee.overdue failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
}