import {
  BadRequestException,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { EventBusService } from '../core/events/event-bus.service';
import { AuditRequestContext, AuditService, type AuditActor } from '../audit/audit.service';
import { generateEnrollmentKey } from '../common/utils/enrollment.util';
import { Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export interface CreateSchoolDto {
  name: string;
  email: string;
  address?: string;
  phone?: string;
}

export interface UpdateSchoolDto {
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
  code?: string;
  logoUrl?: string;
  publicUrlSlug?: string;
}

type SchoolMutationContext = {
  actor?: AuditActor | null;
  request?: AuditRequestContext | null;
  source?: 'profile' | 'logo';
};

@Injectable()
export class SchoolService {
  constructor(
    private prismaService: PrismaService,
    private platformSettingsService: PlatformSettingsService,
    private subscriptionService: SubscriptionService,
    private auditService: AuditService,
    private eventBus: EventBusService,
  ) {}

  async createSchool(createSchoolDto: CreateSchoolDto) {
    await this.enforceMaxSchoolsAllowed();

    const { name, email, address, phone } = createSchoolDto;
    const enrollmentKey = generateEnrollmentKey(name);
    const publicUrlSlug = await this.generateUniquePublicUrlSlug(name);

    const school = await this.prismaService.school.create({
      data: {
        name,
        email,
        enrollmentKey,
        publicUrlSlug,
        ...(address && { address }),
        ...(phone && { phone }),
      },
    });

    void this.eventBus.emit('school.created', {
      schoolId: school.id,
      schoolName: school.name,
      email: school.email,
    });

    const corePlan = await this.subscriptionService.getPlanByTier('CORE');
    if (corePlan?.id) {
      await this.subscriptionService.assignPlanToSchool(school.id, corePlan.id);
    }

    return this.prismaService.school.findUnique({
      where: { id: school.id },
      include: { plan: true },
    });
  }

  private async enforceMaxSchoolsAllowed() {
    const rawLimit = await this.platformSettingsService.getSetting(
      'MAX_SCHOOLS_ALLOWED',
    );
    const maxSchoolsAllowed = this.parsePositiveInteger(rawLimit);

    if (!maxSchoolsAllowed) {
      return;
    }

    const currentSchoolCount = await this.prismaService.school.count();

    if (currentSchoolCount >= maxSchoolsAllowed) {
      throw new HttpException(
        `Maximum schools limit reached. The platform allows ${maxSchoolsAllowed} school${maxSchoolsAllowed === 1 ? '' : 's'}.`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private parsePositiveInteger(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isInteger(value) && value > 0 ? value : null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    return null;
  }

  async getSchools(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [schools, total, activeTotal, totalStudents] = await Promise.all([
      this.prismaService.school.findMany({
        skip,
        take: limit,
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaService.school.count(),
      this.prismaService.school.count({ where: { isActive: true } }),
      this.prismaService.user.count({
        where: { role: Role.STUDENT, deletedAt: null },
      }),
    ]);
    const schoolIds = schools.map((school) => school.id);
    const [studentUserCounts, studentProfileCounts] = schoolIds.length
      ? await Promise.all([
          this.prismaService.user.groupBy({
            by: ['schoolId'],
            where: {
              schoolId: { in: schoolIds },
              role: Role.STUDENT,
              deletedAt: null,
            },
            _count: { _all: true },
          }),
          this.prismaService.studentProfile.groupBy({
            by: ['schoolId'],
            where: { schoolId: { in: schoolIds } },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const studentUserCountBySchool = new Map(
      studentUserCounts
        .filter((item) => item.schoolId)
        .map((item) => [item.schoolId!, item._count._all]),
    );
    const studentProfileCountBySchool = new Map(
      studentProfileCounts.map((item) => [item.schoolId, item._count._all]),
    );

    return {
      data: schools.map((school) => ({
        ...school,
        studentCount: Math.max(
          studentUserCountBySchool.get(school.id) || 0,
          studentProfileCountBySchool.get(school.id) || 0,
        ),
      })),
      total,
      activeTotal,
      totalStudents,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSchoolById(id: string) {
    return this.prismaService.school.findUnique({
      where: { id },
    });
  }

  async getSchoolByEnrollmentKey(enrollmentKey: string) {
    return this.prismaService.school.findUnique({
      where: { enrollmentKey },
    });
  }

  async getSchoolByPublicUrlSlug(publicUrlSlug: string) {
    return this.prismaService.school.findUnique({
      where: { publicUrlSlug },
    });
  }

  private async cleanupLocalUpload(url: unknown) {
    if (typeof url !== 'string' || !url.startsWith('/uploads/')) return;

    const publicRoot = path.resolve(process.cwd(), 'public');
    const target = path.resolve(publicRoot, url.replace(/^\/+/, ''));
    if (!target.startsWith(publicRoot + path.sep)) return;

    try {
      await fs.promises.unlink(target);
    } catch {
      // File cleanup should never make a successful school update fail.
    }
  }

  private async auditSchoolChange(
    schoolId: string,
    oldSchool: Record<string, unknown>,
    newSchool: Record<string, unknown>,
    context: SchoolMutationContext,
  ) {
    const changed = Object.keys(oldSchool).reduce<Record<string, { oldValue: unknown; newValue: unknown }>>(
      (acc, key) => {
        const oldValue = oldSchool[key];
        const newValue = newSchool[key];
        if (JSON.stringify(oldValue ?? null) !== JSON.stringify(newValue ?? null)) {
          acc[key] = { oldValue: oldValue ?? null, newValue: newValue ?? null };
        }
        return acc;
      },
      {},
    );

    if (Object.keys(changed).length === 0) return;

    await this.auditService.log({
      actor: context.actor,
      schoolId,
      action: 'school.changed',
      entityType: 'School',
      entityId: schoolId,
      request: context.request,
      metadata: {
        changed,
        source: context.source || 'profile',
      },
    });
  }

  async updateSchool(
    id: string,
    data: UpdateSchoolDto,
    context: SchoolMutationContext = {},
  ) {
    const existing = await this.prismaService.school.findUnique({
      where: { id },
      select: {
        name: true,
        email: true,
        address: true,
        phone: true,
        code: true,
        logoUrl: true,
        publicUrlSlug: true,
      },
    });
    if (!existing) throw new HttpException('School not found', HttpStatus.NOT_FOUND);

    if (data.publicUrlSlug) {
      data.publicUrlSlug = await this.normalizeUniquePublicUrlSlug(
        data.publicUrlSlug,
        id,
      );
    }

    const school = await this.prismaService.school.update({
      where: { id },
      data,
    });

    await this.auditSchoolChange(id, existing, school, context);

    const changedFields = Object.keys(data).filter((key) => data[key as keyof UpdateSchoolDto] !== undefined);
    void this.eventBus.emit('school.updated', {
      schoolId: id,
      schoolName: school.name,
      changes: changedFields,
      updatedBy: context.actor?.id || null,
    });

    if (
      data.logoUrl !== undefined &&
      existing.logoUrl &&
      existing.logoUrl !== school.logoUrl
    ) {
      await this.cleanupLocalUpload(existing.logoUrl);
    }

    return school;
  }

  async deleteSchool(id: string) {
    const school = await this.prismaService.school.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!school) {
      throw new HttpException('School not found', HttpStatus.NOT_FOUND);
    }

    await this.prismaService.school.delete({
      where: { id },
    });

    void this.eventBus.emit('school.deleted', {
      schoolId: school.id,
      schoolName: school.name,
    });
  }

  async uploadLogo(
    schoolId: string,
    file: Express.Multer.File,
    context: SchoolMutationContext = {},
  ): Promise<string> {
    if (
      !['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(
        file.mimetype,
      )
    ) {
      throw new BadRequestException('Logo must be PNG, JPG, JPEG, or WEBP');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Logo must be less than 2MB');
    }

    const backendPublicDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'schools',
    );

    // Ensure backend directory exists
    if (!fs.existsSync(backendPublicDir)) {
      fs.mkdirSync(backendPublicDir, { recursive: true });
    }

    const existing = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { logoUrl: true },
    });
    if (!existing) throw new HttpException('School not found', HttpStatus.NOT_FOUND);

    const extension =
      file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg';
    const fileName = `${schoolId}-${Date.now()}${extension}`;
    const backendFilePath = path.join(backendPublicDir, fileName);

    // Save to backend
    fs.writeFileSync(backendFilePath, file.buffer);

    const logoUrl = `/uploads/schools/${fileName}`;

    await this.prismaService.school.update({
      where: { id: schoolId },
      data: { logoUrl },
    });

    await this.auditSchoolChange(
      schoolId,
      { logoUrl: existing.logoUrl },
      { logoUrl },
      { ...context, source: 'logo' },
    );
    await this.cleanupLocalUpload(existing.logoUrl);

    return logoUrl;
  }

  private slugify(value: string): string {
    return (
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-') || 'school'
    );
  }

  private async generateUniquePublicUrlSlug(name: string): Promise<string> {
    const baseSlug = this.slugify(name);
    let slug = baseSlug;
    let suffix = 2;

    while (
      await this.prismaService.school.findUnique({
        where: { publicUrlSlug: slug },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private async normalizeUniquePublicUrlSlug(
    value: string,
    schoolId: string,
  ): Promise<string> {
    const slug = this.slugify(value);
    const existing = await this.prismaService.school.findUnique({
      where: { publicUrlSlug: slug },
      select: { id: true },
    });

    if (existing && existing.id !== schoolId) {
      throw new HttpException(
        'This school URL is already in use',
        HttpStatus.BAD_REQUEST,
      );
    }

    return slug;
  }
}
