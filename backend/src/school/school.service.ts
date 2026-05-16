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

    const school = await this.prismaService.school.create({
      data: {
        name,
        email,
        enrollmentKey,
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

  async updateSchool(id: string, data: UpdateSchoolDto) {
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
    const frontendPublicDir = path.join(
      process.cwd(),
      '..',
      'frontend',
      'public',
      'uploads',
      'schools',
    );

    if (!fs.existsSync(backendPublicDir)) {
      fs.mkdirSync(backendPublicDir, { recursive: true });
    }
    if (!fs.existsSync(frontendPublicDir)) {
      fs.mkdirSync(frontendPublicDir, { recursive: true });
    }

    const fileName = `${schoolId}-${Date.now()}${path.extname(file.originalname)}`;
    const backendFilePath = path.join(backendPublicDir, fileName);
    const frontendFilePath = path.join(frontendPublicDir, fileName);

    fs.writeFileSync(backendFilePath, file.buffer);
    fs.copyFileSync(backendFilePath, frontendFilePath);

    const logoUrl = `/uploads/schools/${fileName}`;

    await this.prismaService.school.update({
      where: { id: schoolId },
      data: { logoUrl },
    });

    return logoUrl;
  }
}
