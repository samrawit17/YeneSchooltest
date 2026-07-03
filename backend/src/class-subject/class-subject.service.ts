import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClassSubjectService {
  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
  ) {}

  private normalizeTeacherId(teacherId?: string | null): string | null {
    if (!teacherId) return null;
    const trimmed = teacherId.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private getNextSectionName(existingNames: string[]): string {
    const usedNames = new Set(
      existingNames.map((name) => name.trim().toUpperCase()),
    );
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let counter = 0;
    while (true) {
      let index = counter++;
      let candidate = '';
      do {
        candidate = alphabet[index % 26] + candidate;
        index = Math.floor(index / 26) - 1;
      } while (index >= 0);

      if (!usedNames.has(candidate.toUpperCase())) {
        return candidate;
      }
    }
  }

  private async ensureAssignmentSection(
    tx: Prisma.TransactionClient,
    classId: string,
    schoolId: string,
    academicYearId: string,
  ) {
    const existingSection = await tx.section.findFirst({
      where: { classId },
      orderBy: { name: 'asc' },
    });

    if (existingSection) return existingSection;

    const existingNames = await tx.section.findMany({
      where: { classId },
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    const defaultName = this.getNextSectionName(
      existingNames.map((section) => section.name),
    );
    const classRecord = await tx.class.findFirst({
      where: {
        id: classId,
        schoolId,
        academicYearId,
      },
      select: {
        id: true,
        name: true,
        schoolId: true,
        academicYearId: true,
      },
    });

    if (!classRecord) {
      throw new NotFoundException('Class not found for virtual assignment');
    }

    return tx.section.create({
      data: {
        classId,
        name: defaultName,
        capacity: 30,
      },
    });
  }

  private async syncTeacherSubjectAssignment(
    tx: Prisma.TransactionClient,
    data: {
      classId: string;
      sectionId: string;
      subjectId: string;
      academicYearId: string;
      teacherId: string | null;
      schoolId: string;
    },
  ) {
    const {
      classId,
      sectionId,
      subjectId,
      academicYearId,
      teacherId,
      schoolId,
    } = data;

    // Keep only one active teacher assignment per class/section/subject/year.
    await tx.teacherSubjectAssignment.updateMany({
      where: {
        classId,
        sectionId,
        subjectId,
        academicYear: academicYearId,
        isActive: true,
      },
      data: { isActive: false },
    });

    if (!teacherId) return;

    await tx.teacherSubjectAssignment.upsert({
      where: {
        teacherId_subjectId_classId_sectionId_academicYear: {
          teacherId,
          subjectId,
          classId,
          sectionId,
          academicYear: academicYearId,
        },
      },
      update: {
        isActive: true,
        schoolId,
      },
      create: {
        schoolId,
        teacherId,
        subjectId,
        classId,
        sectionId,
        academicYear: academicYearId,
      },
    });
  }

  async create(data: CreateClassSubjectDto, schoolId: string) {
    const normalizedTeacherId = this.normalizeTeacherId(data.teacherId);

    // Check if assignment already exists
    const existing = await this.prisma.classSubject.findFirst({
      where: {
        classId: data.classId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        academicYear: data.academicYearId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'This subject is already assigned to this class/section for the academic year',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const classData = await tx.class.findFirst({
        where: { id: data.classId, schoolId },
        select: { schoolId: true },
      });

      if (!classData) {
        throw new NotFoundException('Class not found');
      }

      const created = await tx.classSubject.create({
        data: {
          classId: data.classId,
          sectionId: data.sectionId,
          subjectId: data.subjectId,
          academicYear: data.academicYearId,
          teacherId: normalizedTeacherId,
        },
        include: {
          class: true,
          section: true,
          subject: true,
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      await this.syncTeacherSubjectAssignment(tx, {
        classId: data.classId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        academicYearId: data.academicYearId,
        teacherId: normalizedTeacherId,
        schoolId: classData.schoolId,
      });

      if (normalizedTeacherId) {
        void this.eventBus.emit('teacher.assigned', {
          schoolId: classData.schoolId,
          teacherId: normalizedTeacherId,
          teacherName: created.teacher?.name || 'Unknown',
          classId: data.classId,
          className: created.class?.name,
          subjectId: data.subjectId,
          subjectName: created.subject?.name,
          role: 'subject',
          assignedBy: 'system',
        });
      }

      return created;
    });
  }

  async findAll(schoolId: string, academicYearId?: string) {
    return this.prisma.classSubject.findMany({
      where: {
        class: { schoolId },
        ...(academicYearId && { academicYear: academicYearId }),
      },
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { class: { name: 'asc' } },
        { section: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });
  }

  async findByClass(classId: string, schoolId: string, sectionId?: string) {
    return this.prisma.classSubject.findMany({
      where: {
        classId,
        class: { schoolId },
        ...(sectionId && { sectionId }),
      },
      include: {
        section: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { section: { name: 'asc' } },
    });
  }

  async findByTeacher(
    teacherId: string,
    schoolId: string,
    academicYearId?: string,
  ) {
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        teacherId,
        class: { schoolId },
        ...(academicYearId && { academicYear: academicYearId }),
      },
      include: {
        class: true,
        section: true,
        subject: true,
        academicYearRelation: true,
      },
      orderBy: [{ class: { name: 'asc' } }, { section: { name: 'asc' } }],
    });

    // Get student counts for each class/section combination
    const classSubjectsWithCounts = await Promise.all(
      classSubjects.map(async (cs) => {
        // Try different class name formats to match StudentProfile.className
        const className = cs.class?.name || '';
        const sectionName = cs.section?.name || '';

        const possibleClassNames = [
          className,
          className.replace('Grade ', ''),
          `Grade ${className.replace('Grade ', '')}`,
        ].filter((v, i, a) => a.indexOf(v) === i);

        const possibleSections = [
          sectionName,
          sectionName.toUpperCase(),
          sectionName.toLowerCase(),
        ].filter((v, i, a) => a.indexOf(v) === i);

        // Count students matching this class and section
        // Build OR conditions for each combination of className and section
        const orConditions = possibleClassNames.flatMap((cn) =>
          possibleSections.map((sn) => ({
            className: cn,
            section: sn,
          })),
        );

        const studentCount = await this.prisma.studentProfile.count({
          where: {
            schoolId,
            OR: orConditions,
          },
        });

        return {
          ...cs,
          _count: {
            students: studentCount,
          },
        };
      }),
    );

    return classSubjectsWithCounts;
  }

  async findOne(id: string, schoolId: string) {
    const classSubject = await this.prisma.classSubject.findFirst({
      where: { id, class: { schoolId } },
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!classSubject) {
      throw new NotFoundException('Class subject assignment not found');
    }

    return classSubject;
  }

  async update(id: string, data: UpdateClassSubjectDto, schoolId: string) {
    const assignment = await this.findOne(id, schoolId); // Validate exists
    const normalizedTeacherId = this.normalizeTeacherId(data.teacherId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.classSubject.update({
        where: { id },
        data: {
          ...data,
          ...(data.teacherId !== undefined && {
            teacherId: normalizedTeacherId,
          }),
        },
        include: {
          class: true,
          section: true,
          subject: true,
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (data.teacherId !== undefined) {
        await this.syncTeacherSubjectAssignment(tx, {
          classId: assignment.classId,
          sectionId: assignment.sectionId,
          subjectId: assignment.subjectId,
          academicYearId: assignment.academicYear,
          teacherId: normalizedTeacherId,
          schoolId: assignment.class.schoolId,
        });

        if (normalizedTeacherId) {
          void this.eventBus.emit('teacher.assigned', {
            schoolId: assignment.class.schoolId,
            teacherId: normalizedTeacherId,
            teacherName: updated.teacher?.name || 'Unknown',
            classId: assignment.classId,
            className: updated.class?.name,
            subjectId: assignment.subjectId,
            subjectName: updated.subject?.name,
            role: 'subject',
            assignedBy: 'system',
          });
        } else {
          void this.eventBus.emit('teacher.unassigned', {
            schoolId: assignment.class.schoolId,
            teacherId: assignment.teacherId || '',
            teacherName: 'Unknown',
            classId: assignment.classId,
            className: updated.class?.name,
            subjectId: assignment.subjectId,
            subjectName: updated.subject?.name,
            role: 'subject',
            unassignedBy: 'system',
          });
        }
      }

      return updated;
    });
  }

  async delete(id: string, schoolId: string) {
    await this.findOne(id, schoolId); // Validate exists

    return this.prisma.classSubject.delete({
      where: { id },
    });
  }

  async bulkAssign(data: BulkAssignDto, schoolId: string) {
    const { sectionIds, subjectIds, teacherId, academicYearId, classId } = data;
    const normalizedTeacherId = this.normalizeTeacherId(teacherId);

    // Filter out virtual section IDs and handle them by creating a backing section
    const realSectionIds = sectionIds.filter(
      (id) => !id.startsWith('virtual-'),
    );
    const virtualClassIds = sectionIds
      .filter((id) => id.startsWith('virtual-'))
      .map((id) => id.replace('virtual-', ''));

    if (
      classId &&
      virtualClassIds.length > 0 &&
      !virtualClassIds.includes(classId)
    ) {
      throw new BadRequestException('Invalid virtual section selection');
    }

    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];

      // Get real sections
      const sections =
        realSectionIds.length > 0
          ? await tx.section.findMany({
              where: {
                id: { in: realSectionIds },
                class: { schoolId },
              },
              include: {
                class: {
                  select: {
                    id: true,
                    schoolId: true,
                    academicYearId: true,
                  },
                },
              },
            })
          : [];

      // Check all real sections exist
      if (sections.length !== realSectionIds.length) {
        throw new NotFoundException(
          'One or more selected sections were not found',
        );
      }

      const sectionMap = new Map(sections.map((s) => [s.id, s]));

      const virtualClassMap =
        virtualClassIds.length > 0
          ? new Map(
              (
                await tx.class.findMany({
                  where: {
                    id: { in: virtualClassIds },
                    schoolId,
                    academicYearId,
                  },
                  select: {
                    id: true,
                    schoolId: true,
                    academicYearId: true,
                    name: true,
                  },
                })
              ).map((cls) => [cls.id, cls]),
            )
          : new Map();

      if (virtualClassIds.length !== virtualClassMap.size) {
        throw new NotFoundException(
          'One or more selected classes were not found',
        );
      }

      for (const sectionId of realSectionIds) {
        const section = sectionMap.get(sectionId);
        if (!section) {
          throw new NotFoundException(`Section ${sectionId} not found`);
        }
        if (classId && section.classId !== classId) {
          throw new BadRequestException(
            `Section ${section.name} does not belong to the selected class`,
          );
        }
        if (section.class.academicYearId !== academicYearId) {
          throw new BadRequestException(
            `Section ${section.name} belongs to a different academic year`,
          );
        }

        for (const subjectId of subjectIds) {
          // Upsert logic: Update if exists, create if not
          const assignment = await tx.classSubject.upsert({
            where: {
              classId_sectionId_subjectId_academicYear: {
                classId: section.classId,
                sectionId,
                subjectId,
                academicYear: academicYearId,
              },
            },
            update: {
              teacherId: normalizedTeacherId,
            },
            create: {
              classId: section.classId,
              sectionId,
              subjectId,
              teacherId: normalizedTeacherId,
              academicYear: academicYearId,
            },
          });

          await this.syncTeacherSubjectAssignment(tx, {
            classId: section.classId,
            sectionId,
            subjectId,
            academicYearId,
            teacherId: normalizedTeacherId,
            schoolId: section.class.schoolId,
          });

          results.push(assignment);
        }
      }

      for (const virtualClassId of virtualClassIds) {
        const classRecord = virtualClassMap.get(virtualClassId);
        if (!classRecord) {
          throw new NotFoundException(`Class ${virtualClassId} not found`);
        }
        if (classId && classRecord.id !== classId) {
          throw new BadRequestException(
            `Class ${classRecord.name} does not match the selected class`,
          );
        }

        const backingSection = await this.ensureAssignmentSection(
          tx,
          classRecord.id,
          classRecord.schoolId,
          academicYearId,
        );

        for (const subjectId of subjectIds) {
          const assignment = await tx.classSubject.upsert({
            where: {
              classId_sectionId_subjectId_academicYear: {
                classId: classRecord.id,
                sectionId: backingSection.id,
                subjectId,
                academicYear: academicYearId,
              },
            },
            update: {
              teacherId: normalizedTeacherId,
            },
            create: {
              classId: classRecord.id,
              sectionId: backingSection.id,
              subjectId,
              teacherId: normalizedTeacherId,
              academicYear: academicYearId,
            },
          });

          await this.syncTeacherSubjectAssignment(tx, {
            classId: classRecord.id,
            sectionId: backingSection.id,
            subjectId,
            academicYearId,
            teacherId: normalizedTeacherId,
            schoolId: classRecord.schoolId,
          });

          results.push(assignment);
        }
      }

      return {
        success: true,
        count: results.length,
        message: `Successfully assigned teacher to ${results.length} subject-section combinations`,
      };
    });
  }

  async getMatrixData(schoolId: string, academicYearId: string) {
    const gradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, level: true },
    });
    const allowedGradeIds = gradeLevels.map((grade) => grade.id);
    const allowedGradeNumbers = gradeLevels.map((grade) => grade.level);
    const gradeFilter =
      gradeLevels.length > 0
        ? {
            OR: [
              { gradeId: { in: allowedGradeIds } },
              { grade: { in: allowedGradeNumbers } },
            ],
          }
        : {};

    // Get all sections for the school/year
    const sections = await this.prisma.section.findMany({
      where: {
        class: {
          schoolId,
          academicYearId,
          ...gradeFilter,
        },
      },
      include: {
        class: true,
        homeroomTeacher: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ class: { grade: 'asc' } }, { name: 'asc' }],
    });

    // Get all classes for the school/year (including those without sections)
    const classes = await this.prisma.class.findMany({
      where: {
        schoolId,
        academicYearId,
        ...gradeFilter,
      },
      include: {
        homeroomTeacher: {
          select: { id: true, name: true },
        },
      },
      orderBy: { grade: 'asc' },
    });

    // Create virtual sections for classes without sections
    const classesWithoutSections = classes.filter(
      (cls) => !sections.some((sec) => sec.classId === cls.id),
    );
    const virtualSections = classesWithoutSections.map((cls) => ({
      id: `virtual-${cls.id}`,
      name: cls.name || '',
      class: cls,
      classId: cls.id,
      capacity: 0,
      roomNumber: null,
      homeroomTeacher: null,
      isVirtual: true,
    }));

    // Combine real sections with virtual sections
    const allSections = [...sections, ...virtualSections];

    // Get all subjects for the school
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    // Get all current assignments
    const assignments = await this.prisma.classSubject.findMany({
      where: {
        class: {
          schoolId,
          academicYearId,
          ...gradeFilter,
        },
      },
      include: {
        teacher: {
          select: { id: true, name: true },
        },
      },
    });

    return {
      sections: allSections,
      subjects,
      assignments,
    };
  }
}
