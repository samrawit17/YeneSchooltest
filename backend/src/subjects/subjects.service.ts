import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    schoolId: string;
    name: string;
    code?: string;
    isActive?: boolean;
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

    return this.prisma.subject.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        code: data.code,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll(schoolId: string) {
    return this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        school: true,
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

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
