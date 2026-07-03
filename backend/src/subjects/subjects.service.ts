import { HttpStatus,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    schoolId: string;
    name: string;
    code?: string;
    isActive?: boolean;
    academicYearId?: string;
  }) {
    // Check for duplicate subject name in school
    const existing = await this.prisma.subject.findFirst({
      where: {
        schoolId: data.schoolId,
        name: data.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Subject with this name already exists in the school',
      );
    }

    if (data.academicYearId) {
      const academicYear = await this.prisma.academicYear.findFirst({
        where: { id: data.academicYearId, schoolId: data.schoolId },
        select: { endDate: true, name: true },
      });

      if (academicYear && new Date(academicYear.endDate) < new Date()) {
        throw new BadRequestException(
          `Cannot create subjects for academic year "${academicYear.name}" because it has ended.`,
        );
      }
    }

    return this.prisma.subject.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        code: data.code,
        isActive: data.isActive ?? true,
        academicYearId: data.academicYearId,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      include: {
        academicYear: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        school: true,
        academicYear: {
          select: { id: true, name: true },
        },
      },
    });

    if (!subject) throw new LocalizedException('subjects.subject_not_found_562e5a84', undefined, HttpStatus.NOT_FOUND, 'Subject not found');

    return subject;
  }

  async update(
    id: string,
    data: { name?: string; code?: string; isActive?: boolean },
  ) {
    await this.findOne(id); // Validate exists

    return this.prisma.subject.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        isActive: data.isActive,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id); // Validate exists

    return this.prisma.subject.delete({
      where: { id },
    });
  }
}
