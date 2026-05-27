import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { generateEnrollmentKey } from '../common/utils/enrollment.util';
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

@Injectable()
export class SchoolService {
  constructor(
    private prismaService: PrismaService,
    private platformSettingsService: PlatformSettingsService,
    private subscriptionService: SubscriptionService,
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

  async getSchools() {
    return this.prismaService.school.findMany({
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
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

  async updateSchool(id: string, data: UpdateSchoolDto) {
    if (data.publicUrlSlug) {
      data.publicUrlSlug = await this.normalizeUniquePublicUrlSlug(
        data.publicUrlSlug,
        id,
      );
    }

    return this.prismaService.school.update({
      where: { id },
      data,
    });
  }

  async deleteSchool(id: string) {
    return this.prismaService.school.delete({
      where: { id },
    });
  }

  async uploadLogo(
    schoolId: string,
    file: Express.Multer.File,
  ): Promise<string> {
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

    const fileName = `${schoolId}-${Date.now()}${path.extname(file.originalname)}`;
    const backendFilePath = path.join(backendPublicDir, fileName);

    // Save to backend
    fs.writeFileSync(backendFilePath, file.buffer);

    const logoUrl = `/uploads/schools/${fileName}`;

    await this.prismaService.school.update({
      where: { id: schoolId },
      data: { logoUrl },
    });

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
