import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { Role } from '../auth/types/role.enum';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';
import {
  ETHIOPIAN_MONTH_NAMES,
  type CalendarType,
  toEthiopianDate,
} from '../common/date.util';

type BillingMode = 'MONTHLY' | 'QUARTERLY' | 'SEMESTERLY' | 'TERMLY' | 'YEARLY';

type FeeDeadlineLabelContext = {
  billingMode: BillingMode;
  calendarType: CalendarType;
  terms: Array<{
    name: string;
    order: number;
    startDate: Date;
    endDate: Date;
  }>;
};

type CalendarFeedItem = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startDate: Date;
  endDate: Date | null;
  audience: string[] | null;
  category: 'ACADEMIC' | 'SPORTS' | 'CULTURAL' | 'HOLIDAY' | 'OTHER';
  color: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  source: 'EVENT' | 'TERM' | 'FEE_DEADLINE';
  eventType:
    | 'SCHOOL_EVENT'
    | 'ACADEMIC_TERM'
    | 'FEE_DEADLINE';
};

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

  private serializeAudience(audience: string[] | undefined): string | null {
    return audience?.length ? JSON.stringify(audience) : null;
  }

  private resolveDateRange(from?: string, to?: string) {
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);
    defaultFrom.setHours(0, 0, 0, 0);

    const defaultTo = new Date(now);
    defaultTo.setFullYear(defaultTo.getFullYear() + 2);
    defaultTo.setHours(23, 59, 59, 999);

    const parsedFrom = from ? new Date(from) : defaultFrom;
    const parsedTo = to ? new Date(to) : defaultTo;

    const rangeFrom = Number.isNaN(parsedFrom.getTime())
      ? defaultFrom
      : parsedFrom;
    const rangeTo = Number.isNaN(parsedTo.getTime()) ? defaultTo : parsedTo;

    if (rangeFrom > rangeTo) {
      return { from: rangeTo, to: rangeFrom };
    }

    return { from: rangeFrom, to: rangeTo };
  }

  private getDateOverlapWhere(from: Date, to: Date) {
    return {
      OR: [
        { startDate: { gte: from, lte: to } },
        { endDate: { gte: from, lte: to } },
        {
          AND: [{ startDate: { lte: from } }, { endDate: { gte: to } }],
        },
      ],
    };
  }

  private normalizeBillingMode(value?: string | null): BillingMode {
    const normalized = String(value || '')
      .trim()
      .toUpperCase();
    if (normalized === 'MONTH' || normalized === 'MONTHLY') return 'MONTHLY';
    if (normalized === 'QUARTER' || normalized === 'QUARTERLY')
      return 'QUARTERLY';
    if (normalized === 'SEMESTER' || normalized === 'SEMESTERLY')
      return 'SEMESTERLY';
    if (normalized === 'TERM' || normalized === 'TERMLY') return 'TERMLY';
    if (normalized === 'YEAR' || normalized === 'YEARLY') return 'YEARLY';
    return 'TERMLY';
  }

  private formatFeeDeadlineMonth(date: Date, calendarType: CalendarType) {
    if (calendarType === 'ETHIOPIAN') {
      const ethiopianDate = toEthiopianDate(date);
      return ETHIOPIAN_MONTH_NAMES[ethiopianDate.month - 1] || 'Monthly';
    }

    return date.toLocaleDateString('en-US', { month: 'long' });
  }

  private getTermLabel(
    term: FeeDeadlineLabelContext['terms'][number] | undefined,
    fallbackPrefix: string,
  ) {
    if (!term) return null;
    return term.name?.trim() || `${fallbackPrefix} ${term.order}`;
  }

  private getFeeDeadlinePeriodLabel(
    dueDate: Date,
    context: FeeDeadlineLabelContext,
  ) {
    const matchingTerm = context.terms.find(
      (term) => term.startDate <= dueDate && term.endDate >= dueDate,
    );

    if (context.billingMode === 'MONTHLY') {
      return this.formatFeeDeadlineMonth(dueDate, context.calendarType);
    }

    if (context.billingMode === 'QUARTERLY') {
      return (
        this.getTermLabel(matchingTerm, 'Quarter') ||
        this.formatFeeDeadlineMonth(dueDate, context.calendarType)
      );
    }

    if (context.billingMode === 'SEMESTERLY') {
      return (
        this.getTermLabel(matchingTerm, 'Semester') ||
        this.formatFeeDeadlineMonth(dueDate, context.calendarType)
      );
    }

    if (context.billingMode === 'YEARLY') {
      return 'Annual';
    }

    return (
      this.getTermLabel(matchingTerm, 'Term') ||
      this.formatFeeDeadlineMonth(dueDate, context.calendarType)
    );
  }

  private getFeeDeadlineTitle(dueDate: Date, context: FeeDeadlineLabelContext) {
    return `${this.getFeeDeadlinePeriodLabel(dueDate, context)} fee`;
  }

  private async getFeeDeadlineLabelContext(
    schoolId: string,
    from: Date,
    to: Date,
  ): Promise<FeeDeadlineLabelContext> {
    const [settings, terms] = await Promise.all([
      this.prisma.schoolSetting.findMany({
        where: {
          schoolId,
          key: { in: ['fee_structure_mode', 'curriculum_type', 'calendar_type'] },
        },
        select: { key: true, value: true },
      }),
      this.prisma.term.findMany({
        where: {
          academicYear: { schoolId },
          OR: [
            { startDate: { gte: from, lte: to } },
            { endDate: { gte: from, lte: to } },
            {
              AND: [{ startDate: { lte: from } }, { endDate: { gte: to } }],
            },
          ],
        },
        select: { name: true, order: true, startDate: true, endDate: true },
        orderBy: [{ academicYear: { startDate: 'asc' } }, { order: 'asc' }],
      }),
    ]);
    const settingValue = (key: string) =>
      settings.find((setting) => setting.key === key)?.value;

    return {
      billingMode: this.normalizeBillingMode(
        settingValue('fee_structure_mode') || settingValue('curriculum_type'),
      ),
      calendarType:
        String(settingValue('calendar_type') || '').toUpperCase() ===
        'GREGORIAN'
          ? 'GREGORIAN'
          : 'ETHIOPIAN',
      terms,
    };
  }

  private audienceAllowsRole(
    audience: string[] | null,
    userRole: string | undefined,
  ) {
    if (!audience || audience.length === 0) return true;
    if (!userRole) return true;
    const normalizedUserRole = userRole.toUpperCase();
    return audience.some((role) => role.toUpperCase() === normalizedUserRole);
  }

  private mapStoredEvent(event: any): CalendarFeedItem {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      audience: this.parseAudience(event.audience),
      category: event.category || 'OTHER',
      color: event.color,
      createdById: event.createdById,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      source: 'EVENT',
      eventType: 'SCHOOL_EVENT',
    };
  }

  async create(data: CreateEventDto, userId: string, schoolId: string) {
    const event = await this.prisma.schoolEvent.create({
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        audience: this.serializeAudience(data.audience),
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

  async findCalendarFeed(
    schoolId: string,
    user: { id: string; role: Role | string },
    params?: { from?: string; to?: string },
  ) {
    const { from, to } = this.resolveDateRange(params?.from, params?.to);
    const role = String(user.role || '').toUpperCase();

    const [storedEvents, terms, feeDeadlines] =
      await Promise.all([
        this.prisma.schoolEvent.findMany({
          where: {
            schoolId,
            ...this.getDateOverlapWhere(from, to),
          },
          orderBy: { startDate: 'asc' },
        }),
        this.prisma.term.findMany({
          where: {
            academicYear: { schoolId },
            OR: [
              { startDate: { gte: from, lte: to } },
              { endDate: { gte: from, lte: to } },
              {
                AND: [
                  { startDate: { lte: from } },
                  { endDate: { gte: to } },
                ],
              },
            ],
          },
          include: {
            academicYear: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ academicYear: { startDate: 'asc' } }, { order: 'asc' }],
        }),
        this.getFeeDeadlineItems(schoolId, user, from, to),
      ]);

    const eventItems = storedEvents
      .map((event) => this.mapStoredEvent(event))
      .filter((event) => this.audienceAllowsRole(event.audience, role));

    const termItems: CalendarFeedItem[] = terms.map((term) => ({
      id: `term:${term.id}`,
      title: `${term.name} - ${term.academicYear.name}`,
      description: 'Academic period dates.',
      location: null,
      startDate: term.startDate,
      endDate: term.endDate,
      audience: ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'TEACHER', 'STUDENT', 'PARENT'],
      category: 'ACADEMIC',
      color: '#0891b2',
      createdById: null,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt,
      source: 'TERM',
      eventType: 'ACADEMIC_TERM',
    }));

    return [...eventItems, ...termItems, ...feeDeadlines]
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }

  private async getFeeDeadlineItems(
    schoolId: string,
    user: { id: string; role: Role | string },
    from: Date,
    to: Date,
  ): Promise<CalendarFeedItem[]> {
    const role = String(user.role || '').toUpperCase();
    const baseWhere: any = {
      schoolId,
      deletedAt: null,
      dueDate: { gte: from, lte: to },
      status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
    };

    if (role === Role.STUDENT) {
      baseWhere.studentId = user.id;
      return this.getPersonalFeeDeadlineItems(baseWhere, schoolId, from, to);
    }

    if (role === Role.PARENT) {
      const parentProfile = await this.prisma.parentProfile.findFirst({
        where: { schoolId, userId: user.id },
        include: {
          children: {
            include: {
              student: { select: { userId: true } },
            },
          },
        },
      });

      const studentUserIds =
        parentProfile?.children
          .map((link) => link.student?.userId)
          .filter((value): value is string => Boolean(value)) || [];

      if (studentUserIds.length === 0) return [];

      baseWhere.studentId = { in: studentUserIds };
      return this.getPersonalFeeDeadlineItems(baseWhere, schoolId, from, to);
    }

    if (
      ![Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.FINANCE].includes(
        role as Role,
      )
    ) {
      return [];
    }

    const fees = await this.prisma.studentFee.findMany({
      where: baseWhere,
      select: {
        id: true,
        dueDate: true,
        finalAmount: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 1000,
    });

    const grouped = new Map<
      string,
      { dueDate: Date; count: number; amount: number }
    >();

    fees.forEach((fee) => {
      if (!fee.dueDate) return;
      const key = fee.dueDate.toISOString().slice(0, 10);
      const existing =
        grouped.get(key) ||
        { dueDate: fee.dueDate, count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += Number(fee.finalAmount || 0);
      grouped.set(key, existing);
    });

    const labelContext = await this.getFeeDeadlineLabelContext(
      schoolId,
      from,
      to,
    );

    return Array.from(grouped.entries()).map(([key, item]) => {
      const title = this.getFeeDeadlineTitle(item.dueDate, labelContext);

      return {
        id: `fee-deadline:${key}`,
        title,
        description: `${title} due.`,
        location: null,
        startDate: item.dueDate,
        endDate: item.dueDate,
        audience: ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'FINANCE'],
        category: 'OTHER',
        color: '#ca8a04',
        createdById: null,
        createdAt: item.dueDate,
        updatedAt: item.dueDate,
        source: 'FEE_DEADLINE',
        eventType: 'FEE_DEADLINE',
      };
    });
  }

  private async getPersonalFeeDeadlineItems(
    where: any,
    schoolId: string,
    from: Date,
    to: Date,
  ) {
    const fees = await this.prisma.studentFee.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 100,
    });
    const labelContext = await this.getFeeDeadlineLabelContext(
      schoolId,
      from,
      to,
    );

    return fees
      .filter((fee) => fee.dueDate)
      .map((fee) => {
        const title = this.getFeeDeadlineTitle(fee.dueDate!, labelContext);

        return {
          id: `fee-deadline:${fee.id}`,
          title,
          description: `${title} due.`,
          location: null,
          startDate: fee.dueDate!,
          endDate: fee.dueDate!,
          audience: ['STUDENT', 'PARENT'],
          category: 'OTHER' as const,
          color: '#ca8a04',
          createdById: null,
          createdAt: fee.createdAt,
          updatedAt: fee.updatedAt,
          source: 'FEE_DEADLINE' as const,
          eventType: 'FEE_DEADLINE' as const,
        };
      });
  }

  async findOne(id: string, schoolId: string) {
    const event = await this.prisma.schoolEvent.findFirst({
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
        ...(data.audience !== undefined && {
          audience: this.serializeAudience(data.audience),
        }),
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
        const audience = this.parseAudience(event.audience);
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
