import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
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

  private parseSettingValue(rawValue: string | null | undefined) {
    if (rawValue === null || rawValue === undefined) return null;
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }

  private async ensureAnnouncementsEnabled(schoolId: string) {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: {
        schoolId_key: {
          schoolId,
          key: 'ANNOUNCEMENTS_ENABLED',
        },
      },
      select: { value: true },
    });
    const value = this.parseSettingValue(setting?.value);

    if (value === false || value === 'false') {
      throw new BadRequestException(
        'Announcements are disabled for this school. Enable Announcements in school settings before creating or updating announcements.',
      );
    }
  }

  private async createNotificationForAnnouncement(
    schoolId: string,
    title: string,
    message: string,
    createdById: string,
    visibleTo?: string[] | null,
  ) {
    const normalizedAudience = (visibleTo || [])
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);

    const audienceRoleMap: Record<string, string[]> = {
      student: ['STUDENT'],
      parent: ['PARENT'],
      teacher: ['TEACHER'],
      staff: ['TEACHER'],
      admin: ['ADMIN'],
      it_manager: ['IT_MANAGER'],
      registrar: ['REGISTRAR'],
      finance: ['FINANCE'],
    };

    const targetRoles = Array.from(
      new Set(
        normalizedAudience.flatMap((audience) => audienceRoleMap[audience] || []),
      ),
    );

    const users = targetRoles.length
      ? await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id
          FROM "User"
          WHERE "schoolId" = ${schoolId}
            AND id <> ${createdById}
            AND "role"::text IN (${Prisma.join(targetRoles)})
        `)
      : await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id
          FROM "User"
          WHERE "schoolId" = ${schoolId}
            AND id <> ${createdById}
        `);

    // Create notifications for all users (excluding the creator)
    const recipientIds = users.map((user) => user.id);

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
    await this.ensureAnnouncementsEnabled(schoolId);

    // Handle empty visibleTo array - store as comma-separated string or null
    const visibleTo =
      data.visibleTo && data.visibleTo.length > 0 ? data.visibleTo.join(',') : null;

    const announcement = await this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        visibleTo,
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
      data.visibleTo ?? null,
    );

    return announcement;
  }

  async findAll(schoolId: string, userRole?: string, userId?: string) {
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

    // Transform visibleTo from comma-separated string to array for frontend
    const transformed = announcements.map((a) => ({
      ...a,
      visibleTo: a.visibleTo ? a.visibleTo.split(',').map((r) => r.trim()) : [],
    }));

    // Filter by role if userRole is provided
    if (userRole) {
      return transformed.filter((announcement) => {
        // Creator always sees their own announcements
        if (userId && announcement.createdById === userId) {
          return true;
        }
        const visibleTo = announcement.visibleTo as string[];
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

    return transformed;
  }

  async findOne(id: string, schoolId: string) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, schoolId },
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

    return {
      ...announcement,
      visibleTo: announcement.visibleTo
        ? announcement.visibleTo.split(',').map((r) => r.trim())
        : [],
    };
  }

  async update(
    id: string,
    data: UpdateAnnouncementDto,
    userId: string,
    schoolId: string,
  ) {
    await this.ensureAnnouncementsEnabled(schoolId);

    // Check if announcement exists and belongs to the school
    const existing = await this.prisma.announcement.findFirst({
      where: { id, schoolId },
    });

    if (!existing) {
      throw new NotFoundException('Announcement not found');
    }

    // Handle empty visibleTo array - store as comma-separated string or null
    const visibleTo =
      data.visibleTo !== undefined
        ? data.visibleTo.length > 0
          ? data.visibleTo.join(',')
          : null
        : undefined;

    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(visibleTo !== undefined && { visibleTo }),
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
