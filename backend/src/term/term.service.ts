import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateTermDto {
  academicYearId: string;
  name: string; // "Term 1", "Semester 1", "Quarter 1"
  startDate: Date;
  endDate: Date;
  order: number;
}

export interface UpdateTermDto {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  order?: number;
}

@Injectable()
export class TermService {
  constructor(private prismaService: PrismaService) {}

  async createTerm(createDto: CreateTermDto) {
    const { academicYearId, name, startDate, endDate, order } = createDto;

    // Validate academic year exists
    const academicYear = await this.prismaService.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check if term with same name exists for this academic year
    const existing = await this.prismaService.term.findUnique({
      where: {
        academicYearId_name: {
          academicYearId,
          name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Term with this name already exists for this academic year',
      );
    }

    return this.prismaService.term.create({
      data: {
        academicYearId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        order,
      },
      include: {
        academicYear: true,
      },
    });
  }

  async getTermsByAcademicYear(academicYearId: string) {
    return this.prismaService.term.findMany({
      where: { academicYearId },
      orderBy: { order: 'asc' },
      include: {
        academicYear: true,
      },
    });
  }

  async getTermById(id: string) {
    const term = await this.prismaService.term.findUnique({
      where: { id },
      include: {
        academicYear: true,
      },
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    return term;
  }

  async updateTerm(id: string, updateDto: UpdateTermDto) {
    const term = await this.getTermById(id);

    if (updateDto.startDate && updateDto.endDate) {
      if (new Date(updateDto.startDate) >= new Date(updateDto.endDate)) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    // If updating name, check for duplicates
    if (updateDto.name && updateDto.name !== term.name) {
      const existing = await this.prismaService.term.findUnique({
        where: {
          academicYearId_name: {
            academicYearId: term.academicYearId,
            name: updateDto.name,
          },
        },
      });

      if (existing) {
        throw new BadRequestException(
          'Term with this name already exists for this academic year',
        );
      }
    }

    return this.prismaService.term.update({
      where: { id },
      data: {
        ...updateDto,
        ...(updateDto.startDate && {
          startDate: new Date(updateDto.startDate),
        }),
        ...(updateDto.endDate && { endDate: new Date(updateDto.endDate) }),
      },
      include: {
        academicYear: true,
      },
    });
  }

  async deleteTerm(id: string) {
    await this.getTermById(id); // Verify exists

    return this.prismaService.term.delete({
      where: { id },
    });
  }

  async getCurrentTerm(schoolId: string) {
    const now = new Date();

    const schoolSettings = await this.prismaService.schoolSettings.findUnique({
      where: { schoolId },
    });

    const activeYear = schoolSettings?.defaultAcademicYearId
      ? await this.prismaService.academicYear.findUnique({
          where: { id: schoolSettings.defaultAcademicYearId },
        })
      : await this.prismaService.academicYear.findFirst({
          where: {
            schoolId,
            isActive: true,
          },
          orderBy: { startDate: 'desc' },
        });

    const fallbackYear =
      activeYear ||
      (await this.prismaService.academicYear.findFirst({
        where: { schoolId },
        orderBy: { startDate: 'desc' },
      }));

    if (!fallbackYear) {
      return null;
    }

    const currentTerm = await this.prismaService.term.findFirst({
      where: {
        academicYearId: fallbackYear.id,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { order: 'asc' },
      include: {
        academicYear: true,
      },
    });

    if (currentTerm) {
      return currentTerm;
    }

    return this.prismaService.term.findFirst({
      where: {
        academicYearId: fallbackYear.id,
      },
      orderBy: { order: 'asc' },
      include: {
        academicYear: true,
      },
    });
  }
}
