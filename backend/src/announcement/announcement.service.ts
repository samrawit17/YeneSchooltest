import { HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LocalizedException } from '../core/localization';
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

  private startOfDay(date: Date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private formatPublicDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
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

    const staffRoles = ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'TEACHER', 'FINANCE'];
    const audienceRoleMap: Record<string, string[]> = {
      student: ['STUDENT'],
      parent: ['PARENT'],
      teacher: ['TEACHER'],
      staff: staffRoles,
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

    const isPinned = data.isPinned ?? false;
    const announcement = await this.prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        visibleTo,
        isPublic: data.isPublic ?? false,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        priority: data.priority || 'MEDIUM',
        isPinned,
        pinnedAt: isPinned ? new Date() : null,
        location: data.location || null,
        academicYearId: data.academicYearId || null,
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
        academicYear: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { pinnedAt: { sort: 'desc', nulls: 'last' } },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Transform visibleTo from comma-separated string to array for frontend
    const transformed = announcements.map((a) => ({
      ...a,
      visibleTo: a.visibleTo ? a.visibleTo.split(',').map((r) => r.trim()) : [],
    }));

    const staffRoles = ['admin', 'it_manager', 'registrar', 'teacher', 'finance'];
    const canRoleSeeAudience = (currentRole: string, audience: string) => {
      const normalizedRole = currentRole.toLowerCase();
      const normalizedAudience = audience.toLowerCase();

      if (normalizedAudience === 'staff') {
        return staffRoles.includes(normalizedRole);
      }

      // Older announcements used "teacher" for the UI label "Staff".
      if (normalizedAudience === 'teacher' && staffRoles.includes(normalizedRole)) {
        return true;
      }

      return normalizedRole.includes(normalizedAudience);
    };

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
        return visibleTo.some((role) => canRoleSeeAudience(userRole, role));
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
        academicYear: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!announcement) throw new LocalizedException('announcement.announcement_not_found_aa46f164', undefined, HttpStatus.NOT_FOUND, 'Announcement not found');

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

    if (!existing) throw new LocalizedException('announcement.announcement_not_found_aa46f164', undefined, HttpStatus.NOT_FOUND, 'Announcement not found');

    // Handle empty visibleTo array - store as comma-separated string or null
    const visibleTo =
      data.visibleTo !== undefined
        ? data.visibleTo.length > 0
          ? data.visibleTo.join(',')
          : null
        : undefined;

    const pinChanged = data.isPinned !== undefined && data.isPinned !== existing.isPinned;
    return this.prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(visibleTo !== undefined && { visibleTo }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.priority && { priority: data.priority }),
        ...(data.isPinned !== undefined && { isPinned: data.isPinned }),
        ...(pinChanged && { pinnedAt: data.isPinned ? new Date() : null }),
        ...(data.location !== undefined && { location: data.location || null }),
        ...(data.academicYearId !== undefined && { academicYearId: data.academicYearId || null }),
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
        academicYear: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });
  }

  async addAttachment(
    id: string,
    schoolId: string,
    file: { name: string; url: string; mimeType: string; size: number },
  ) {
    const existing = await this.prisma.announcement.findFirst({ where: { id, schoolId }, select: { attachments: true } });
    if (!existing) throw new LocalizedException('announcement.announcement_not_found_aa46f164', undefined, HttpStatus.NOT_FOUND, 'Announcement not found');

    const attachments = existing.attachments ? JSON.parse(existing.attachments) : [];
    attachments.push(file);

    return this.prisma.announcement.update({
      where: { id },
      data: { attachments: JSON.stringify(attachments) },
    });
  }

  async removeAttachment(id: string, schoolId: string, index: number) {
    const existing = await this.prisma.announcement.findFirst({ where: { id, schoolId }, select: { attachments: true } });
    if (!existing) throw new LocalizedException('announcement.announcement_not_found_aa46f164', undefined, HttpStatus.NOT_FOUND, 'Announcement not found');

    const attachments = existing.attachments ? JSON.parse(existing.attachments) : [];
    if (index < 0 || index >= attachments.length) throw new LocalizedException('announcement.invalid_attachment_index_7cc94e1f', undefined, undefined, 'Invalid attachment index');
    attachments.splice(index, 1);

    return this.prisma.announcement.update({
      where: { id },
      data: { attachments: attachments.length > 0 ? JSON.stringify(attachments) : null },
    });
  }

  async delete(id: string, schoolId: string) {
    const existing = await this.prisma.announcement.findFirst({
      where: { id, schoolId },
    });

    if (!existing) throw new LocalizedException('announcement.announcement_not_found_aa46f164', undefined, HttpStatus.NOT_FOUND, 'Announcement not found');

    return this.prisma.announcement.delete({
      where: { id },
    });
  }

  async getActiveCount(schoolId: string, userRole?: string): Promise<number> {
    const announcements = await this.findAll(schoolId, userRole);
    return announcements.length;
  }

  async findPublic(schoolId?: string) {
    const now = new Date();
    const where: any = {
      isPublic: true,
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
    };
    if (schoolId) {
      where.schoolId = schoolId;
    }
    const announcements = await this.prisma.announcement.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        school: {
          select: { name: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });

    const todayStart = this.startOfDay(now);
    const afterTomorrowStart = this.addDays(todayStart, 2);

    const upcomingPaymentFees = await this.prisma.studentFee.findMany({
      where: {
        deletedAt: null,
        ...(schoolId ? { schoolId } : {}),
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: {
          gte: todayStart,
          lt: afterTomorrowStart,
        },
        school: { isActive: true },
      },
      select: {
        id: true,
        schoolId: true,
        dueDate: true,
        school: { select: { name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { schoolId: 'asc' }],
      take: 200,
    });

    const paymentReminderBySchoolAndDate = new Map<
      string,
      (typeof announcements)[number]
    >();

    for (const fee of upcomingPaymentFees) {
      if (!fee.dueDate) continue;

      const dueDate = this.startOfDay(fee.dueDate);
      const daysUntilDue = Math.round(
        (dueDate.getTime() - todayStart.getTime()) / 86_400_000,
      );
      const key = `${fee.schoolId}:${dueDate.toISOString()}`;
      if (paymentReminderBySchoolAndDate.has(key)) continue;

      const isDueToday = daysUntilDue <= 0;
      const schoolName = fee.school.name;
      const formattedDueDate = this.formatPublicDate(dueDate);

      paymentReminderBySchoolAndDate.set(key, {
        id: `payment-deadline:${key}`,
        title: isDueToday
          ? `${schoolName} payment deadline is today`
          : `${schoolName} payment deadline tomorrow`,
        content: isDueToday
          ? `Monthly school fee payments are due today, ${formattedDueDate}. Please complete payment through the school finance office or parent portal.`
          : `Monthly school fee payments are due on ${formattedDueDate}. Please complete payment before the deadline to keep your account current.`,
        priority: isDueToday ? 'HIGH' : 'MEDIUM',
        startDate: todayStart,
        endDate: this.addDays(dueDate, 1),
        createdAt: now,
        school: { name: schoolName },
      });
    }

    return [
      ...paymentReminderBySchoolAndDate.values(),
      ...announcements,
    ].slice(0, 10);
  }
}
