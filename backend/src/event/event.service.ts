import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';

@Injectable()
export class EventService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private parseAudience(audience: string | null | undefined): string[] {
    if (!audience) return [];

    try {
      const parsed = JSON.parse(audience);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return audience
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  async create(data: CreateEventDto, userId: string, schoolId: string) {
    const event = await this.prisma.schoolEvent.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        audience: data.audience as any,
        category: data.category || 'OTHER',
        color: data.color,
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
    await this.createNotificationForEvent(
      schoolId,
      event.title,
      event.description || '',
      userId,
    );

    return event;
  }

  private async createNotificationForEvent(
    schoolId: string,
    title: string,
    description: string,
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
        type: NotificationType.EVENT,
        title: `New Event: ${title}`,
        message: description
          ? description.substring(0, 200)
          : 'New event scheduled',
      });
    }
  }

  async findAll(schoolId: string, userRole?: string) {
    const now = new Date();

    const whereClause: any = {
      schoolId,
      OR: [
        {
          endDate: null,
        },
        {
          endDate: {
            gte: now,
          },
        },
      ],
      startDate: {
        gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    };

    const events = await this.prisma.schoolEvent.findMany({
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
      orderBy: { startDate: 'asc' },
    });

    // Filter by role if userRole is provided
    if (userRole) {
      return events.filter((event) => {
        const audience = this.parseAudience(event.audience);
        if (!audience || audience.length === 0) {
          return true;
        }
        return audience.some((role) =>
          userRole.toLowerCase().includes(role.toLowerCase()),
        );
      });
    }

    return events;
  }

  async findOne(id: string) {
    const event = await this.prisma.schoolEvent.findUnique({
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

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async update(id: string, data: UpdateEventDto, schoolId: string) {
    const existing = await this.prisma.schoolEvent.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.schoolEvent.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.audience && { audience: data.audience as any }),
        ...(data.category && { category: data.category }),
        ...(data.color !== undefined && { color: data.color }),
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
    const existing = await this.prisma.schoolEvent.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.schoolEvent.delete({
      where: { id },
    });
  }

  async getUpcomingCount(schoolId: string, userRole?: string): Promise<number> {
    const events = await this.findAll(schoolId, userRole);
    return events.length;
  }

  async getActiveCount(schoolId: string, userRole?: string): Promise<number> {
    const now = new Date();

    // Active events are those that haven't ended yet
    const whereClause: any = {
      schoolId,
      OR: [
        {
          endDate: null,
        },
        {
          endDate: {
            gte: now,
          },
        },
      ],
      startDate: {
        lte: now, // Started in the past
      },
    };

    const events = await this.prisma.schoolEvent.findMany({
      where: whereClause,
      select: { id: true },
    });

    // Filter by role if userRole is provided
    if (userRole && events.length > 0) {
      const fullEvents = await this.prisma.schoolEvent.findMany({
        where: { id: { in: events.map((e) => e.id) } },
      });
      return fullEvents.filter((event) => {
        const audience = (event.audience as unknown as string[]) || [];
        if (!audience || audience.length === 0) {
          return true;
        }
        return audience.some((role) =>
          userRole.toLowerCase().includes(role.toLowerCase()),
        );
      }).length;
    }

    return events.length;
  }
}
