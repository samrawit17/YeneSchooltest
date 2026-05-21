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

  // Manual section creation is disabled. Sections are now auto-created during bulk student upload.
  // This ensures randomized and balanced distribution across sections (A, B, C...)

  async findAll(schoolId?: string, classId?: string, classIds?: string[]) {
    return this.prisma.section.findMany({
      where: {
        ...(schoolId ? { class: { schoolId } } : {}),
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
      orderBy: [
        { class: { grade: 'asc' } },
        { class: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }

  async search(schoolId: string, query: string) {
    const searchTerm = query.toLowerCase();

    return this.prisma.section.findMany({
      where: {
        class: { schoolId },
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
      orderBy: [
        { class: { grade: 'asc' } },
        { class: { name: 'asc' } },
        { name: 'asc' },
      ],
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
    await this.findOne(id, schoolId); // Validate exists

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
