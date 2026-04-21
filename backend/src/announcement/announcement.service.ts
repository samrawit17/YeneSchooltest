import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';

@Injectable()
export class AnnouncementService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private async createNotificationForAnnouncement(
    schoolId: string,
    title: string,
    message: string,
    createdById: string,
  ) {
    // Get all users in the school to notify
    const users = await this.prisma.user.findMany({
      where: { schoolId },
      select: { id: true },
    });

    // Create notifications for all users (excluding the creator)
    const recipientIds = users
      .filter((user) => user.id !== createdById)
      .map((user) => user.id);

    if (recipientIds.length > 0) {
      await this.notificationService.createBulkNotifications({
        schoolId,
        userIds: recipientIds,
        type: NotificationType.ANNOUNCEMENT,
        title: `New Announcement: ${title}`,
        message: message.substring(0, 200),
      });
    }
  }

  async create(data: CreateAnnouncementDto, userId: string, schoolId: string) {
    // Handle empty visibleTo array - convert to null for Prisma
    const visibleTo =
      data.visibleTo && data.visibleTo.length > 0 ? data.visibleTo : null;

    const announcement = await this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        visibleTo: visibleTo as any,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        priority: data.priority || 'MEDIUM',
        createdById: userId,
        schoolId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create notifications for all users in the school
    await this.createNotificationForAnnouncement(
      schoolId,
      announcement.title,
      announcement.content,
      userId,
    );

    return announcement;
  }

  async findAll(schoolId: string, userRole?: string) {
    const now = new Date();

    // Build where clause for active announcements
    const whereClause: any = {
      schoolId,
      OR: [
        {
          // No end date or still active
          endDate: null,
        },
        {
          endDate: {
            gte: now,
          },
        },
      ],
      startDate: {
        lte: now, // Start date must be in the past or now
      },
    };

    const announcements = await this.prisma.announcement.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' }, // HIGH first
        { createdAt: 'desc' },
      ],
    });

    // Filter by role if userRole is provided
    if (userRole) {
      return announcements.filter((announcement) => {
        const visibleTo = (announcement.visibleTo as unknown as string[]) || [];
        // If visibleTo is empty, it's visible to all
        if (!visibleTo || visibleTo.length === 0) {
          return true;
        }
        // Check if user's role is in the visibleTo array
        return visibleTo.some((role) =>
          userRole.toLowerCase().includes(role.toLowerCase()),
        );
      });
    }

    return announcements;
  }

  async findOne(id: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return announcement;
  }

  async update(
    id: string,
    data: UpdateAnnouncementDto,
    userId: string,
    schoolId: string,
  ) {
    // Check if announcement exists and belongs to the school
    const existing = await this.prisma.announcement.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Announcement not found');
    }

    // Handle empty visibleTo array - convert to null for Prisma
    const visibleTo =
      data.visibleTo !== undefined
        ? data.visibleTo.length > 0
          ? data.visibleTo
          : null
        : undefined;

    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(visibleTo !== undefined && { visibleTo: visibleTo as any }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.priority && { priority: data.priority }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async delete(id: string, schoolId: string) {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Announcement not found');
    }

    return this.prisma.announcement.delete({
      where: { id },
    });
  }

  async getActiveCount(schoolId: string, userRole?: string): Promise<number> {
    const announcements = await this.findAll(schoolId, userRole);
    return announcements.length;
  }
}
