import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SectionService {
  constructor(private prisma: PrismaService) {}

  async create(
    schoolId: string,
    data: {
      classId: string;
      name: string;
      stream?: string | null;
      capacity: number;
      roomNumber?: string;
      homeroomTeacherId?: string | null;
    },
  ) {
    const classExists = await this.prisma.class.findFirst({
      where: { id: data.classId, schoolId },
      select: { id: true, academicYearId: true },
    });

    if (!classExists) {
      throw new BadRequestException('Class not found for this school');
    }

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: classExists.academicYearId, schoolId },
      select: { endDate: true, name: true },
    });

    if (academicYear && new Date(academicYear.endDate) < new Date()) {
      throw new BadRequestException(
        `Cannot create sections for academic year "${academicYear.name}" because it has ended.`,
      );
    }

    const existingSection = await this.prisma.section.findFirst({
      where: { classId: data.classId, name: data.name },
    });

    if (existingSection) {
      throw new ConflictException(
        `Section ${data.name} already exists for this class`,
      );
    }

    if (data.capacity < 1) {
      throw new BadRequestException('Capacity must be at least 1');
    }

    const createData: any = {
      classId: data.classId,
      name: data.name,
      capacity: data.capacity,
    };

    if (data.stream !== undefined) {
      const normalizedStream = String(data.stream || '').trim().toUpperCase();
      createData.stream = normalizedStream || null;
      if (createData.stream && !['SOCIAL', 'NATURAL'].includes(createData.stream)) {
        throw new BadRequestException('Section stream must be SOCIAL or NATURAL');
      }
    }

    if (data.roomNumber !== undefined) {
      createData.roomNumber = data.roomNumber;
    }

    if (data.homeroomTeacherId !== undefined) {
      createData.homeroomTeacherId =
        data.homeroomTeacherId === '' ? null : data.homeroomTeacherId;
    }

    return this.prisma.section.create({
      data: createData,
      include: {
        class: {
          include: {
            school: true,
          },
        },
      },
    });
  }

  async findAll(
    schoolId?: string,
    classId?: string,
    classIds?: string[],
    academicYearId?: string,
  ) {
    const classWhere = {
      ...(schoolId ? { schoolId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
    };

    return this.prisma.section.findMany({
      where: {
        ...(Object.keys(classWhere).length > 0 ? { class: classWhere } : {}),
        ...(classIds && classIds.length > 0 ? { classId: { in: classIds } } : (classId && { classId })),
      },
      include: {
        class: {
          include: {
            school: true,
          },
        },
        homeroomTeacher: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            studentClasses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async search(schoolId: string, query: string, academicYearId?: string) {
    const searchTerm = query.toLowerCase();

    return this.prisma.section.findMany({
      where: {
        class: {
          schoolId,
          ...(academicYearId ? { academicYearId } : {}),
        },
        OR: [
          { name: { contains: searchTerm } },
          { roomNumber: { contains: searchTerm } },
          { class: { name: { contains: searchTerm } } },
        ],
      },
      include: {
        class: {
          include: {
            school: true,
          },
        },
        homeroomTeacher: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            studentClasses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  async findOne(id: string, schoolId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id, class: { schoolId } },
      include: {
        class: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  async update(
    id: string,
    schoolId: string,
    data: {
      name?: string;
      stream?: string | null;
      capacity?: number;
      roomNumber?: string;
      homeroomTeacherId?: string | null;
    },
  ) {
    // Check if updating would create a duplicate
    if (data.name) {
      const section = await this.findOne(id, schoolId);
      const existingSection = await this.prisma.section.findFirst({
        where: {
          id: { not: id },
          classId: section.classId,
          name: data.name,
        },
      });

      if (existingSection) {
        throw new ConflictException(
          `Section ${data.name} already exists for this class`,
        );
      }
    }

    if (data.capacity !== undefined) {
      const currentEnrollment = await this.prisma.studentClass.count({
        where: { sectionId: id, schoolId },
      });

      if (data.capacity < currentEnrollment) {
        throw new BadRequestException(
          `Section capacity cannot be set below current enrollment (${currentEnrollment})`,
        );
      }
    }

    // Handle homeroomTeacherId - allow setting to null (remove teacher) or valid ID
    const updateData: any = { ...data };
    if (data.stream !== undefined) {
      const normalizedStream = String(data.stream || '').trim().toUpperCase();
      updateData.stream = normalizedStream || null;
      if (updateData.stream && !['SOCIAL', 'NATURAL'].includes(updateData.stream)) {
        throw new BadRequestException('Section stream must be SOCIAL or NATURAL');
      }
    }
    if (data.homeroomTeacherId !== undefined) {
      updateData.homeroomTeacherId =
        data.homeroomTeacherId === '' ? null : data.homeroomTeacherId;
    }

    return this.prisma.section.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, schoolId: string) {
    const section = await this.findOne(id, schoolId); // Validate exists

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: section.class.academicYearId, schoolId },
      select: { endDate: true, name: true },
    });

    if (academicYear && new Date(academicYear.endDate) < new Date()) {
      throw new BadRequestException(
        `Cannot delete sections for academic year "${academicYear.name}" because it has ended.`,
      );
    }

    return this.prisma.section.delete({
      where: { id },
    });
  }

  async findAvailableSection(classId: string) {
    // Find sections ordered by name with space available
    const sections = await this.prisma.section.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
    });

    // Return first section with space (simplified - in real app, count actual students)
    return sections.find((section) => true) || null;
  }

  async getNextSectionName(classId: string): Promise<string> {
    const sections = await this.prisma.section.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
    });

    // Generate next section name (A, B, C, ..., Z, AA, AB, ...)
    const usedNames = new Set(sections.map((s) => s.name));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (const char of alphabet) {
      if (!usedNames.has(char)) {
        return char;
      }
    }

    // If all single letters are used, start with AA, AB, etc.
    let counter = 0;
    while (true) {
      const name =
        'A' +
        alphabet[counter % 26] +
        (counter >= 26 ? Math.floor(counter / 26) : '');
      if (!usedNames.has(name)) {
        return name;
      }
      counter++;
    }
  }

  // Auto-creation logic is now moved to BulkUploadService for better randomization
}
