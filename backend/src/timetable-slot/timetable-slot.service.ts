import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';

@Injectable()
export class TimetableSlotService {
  constructor(private prisma: PrismaService) {}

  private buildAcademicYearFilter(academicYearId?: string) {
    if (!academicYearId) {
      return {};
    }

    return {
      OR: [{ academicYearId }, { academicYearId: null }],
    };
  }

  async assertParentCanViewClassTimetable(
    schoolId: string,
    parentUserId: string,
    classId: string,
    sectionId?: string,
  ) {
    const parentProfile = await this.prisma.parentProfile.findFirst({
      where: { schoolId, userId: parentUserId },
      select: { id: true },
    });

    if (!parentProfile) {
      throw new ForbiddenException('Parent profile not found');
    }

    const linkedStudent = await this.prisma.parentStudent.findFirst({
      where: {
        schoolId,
        parentId: parentProfile.id,
      },
      select: {
        studentId: true,
      },
    });

    if (!linkedStudent) {
      throw new ForbiddenException('No linked child found for this parent');
    }

    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: { id: linkedStudent.studentId, schoolId },
      select: { userId: true },
    });

    if (!studentProfile?.userId) {
      throw new ForbiddenException('Linked child profile is incomplete');
    }

    const studentAssignments = await this.prisma.studentClass.findMany({
      where: {
        schoolId,
        studentId: studentProfile.userId,
        classId,
        ...(sectionId ? { sectionId } : {}),
      },
      select: { id: true },
      take: 1,
    });

    if (studentAssignments.length === 0) {
      throw new ForbiddenException(
        'You can only view the timetable for your linked child',
      );
    }
  }

  async resolveTeacherTimetableTarget(
    schoolId: string,
    requester: { id: string; role: string },
    targetTeacherId: string,
  ) {
    const normalizedRole = String(requester.role || '').toUpperCase();
    const canInspectOthers = new Set([
      'ADMIN',
      'IT_MANAGER',
      'REGISTRAR',
      'SUPER_ADMIN',
    ]);

    if (canInspectOthers.has(normalizedRole)) {
      return targetTeacherId;
    }

    const selfTeacherProfile = await this.prisma.teacherProfile.findFirst({
      where: { schoolId, OR: [{ userId: requester.id }, { id: requester.id }] },
      select: { id: true, userId: true },
    });

    const allowedIds = new Set(
      [requester.id, selfTeacherProfile?.id, selfTeacherProfile?.userId].filter(
        (value): value is string => Boolean(value),
      ),
    );

    if (!allowedIds.has(targetTeacherId)) {
      throw new ForbiddenException(
        'You can only view your own timetable',
      );
    }

    return selfTeacherProfile?.userId || requester.id;
  }

  /**
   * Check if two time slots overlap
   * Times are in "HH:mm" format
   */
  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    // Convert "HH:mm" to minutes since midnight for comparison
    const toMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const start1Min = toMinutes(start1);
    const end1Min = toMinutes(end1);
    const start2Min = toMinutes(start2);
    const end2Min = toMinutes(end2);

    return start1Min < end2Min && start2Min < end1Min;
  }

  /**
   * Validate that the slot doesn't conflict with existing slots for teacher or class
   */
  private async validateNoConflict(
    schoolId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    teacherId: string | undefined,
    classId: string,
    excludeSlotId?: string,
  ): Promise<void> {
    // Check for teacher conflicts only if teacherId is provided
    if (teacherId) {
      const teacherConflicts = await this.prisma.timetableSlot.findMany({
        where: {
          schoolId,
          teacherId,
          dayOfWeek,
          id: excludeSlotId ? { not: excludeSlotId } : undefined,
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
      });

      if (teacherConflicts.length > 0) {
        const conflict = teacherConflicts[0];
        throw new ConflictException(
          `Teacher is already scheduled for ${conflict.startTime} - ${conflict.endTime} on this day`,
        );
      }
    }

    // Check for class conflicts
    const classConflicts = await this.prisma.timetableSlot.findMany({
      where: {
        schoolId,
        classId,
        dayOfWeek,
        id: excludeSlotId ? { not: excludeSlotId } : undefined,
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (classConflicts.length > 0) {
      const conflict = classConflicts[0];
      throw new ConflictException(
        `Class is already scheduled for ${conflict.startTime} - ${conflict.endTime} on this day`,
      );
    }
  }

  async create(data: CreateTimetableSlotDto) {
    // Validate no conflicts
    await this.validateNoConflict(
      data.schoolId,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      data.teacherId,
      data.classId,
    );

    return this.prisma.timetableSlot.create({
      data: {
        schoolId: data.schoolId,
        classId: data.classId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room,
        academicYearId: data.academicYearId,
      },
      include: {
        class: true,
        subject: true,
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(
    schoolId: string,
    filters?: {
      dayOfWeek?: number;
      classId?: string;
      teacherId?: string;
      academicYearId?: string;
    },
  ) {
    return this.prisma.timetableSlot.findMany({
      where: {
        schoolId,
        ...(filters?.dayOfWeek && { dayOfWeek: filters.dayOfWeek }),
        ...(filters?.classId && { classId: filters.classId }),
        ...(filters?.teacherId && { teacherId: filters.teacherId }),
        ...(filters?.academicYearId && {
          academicYearId: filters.academicYearId,
        }),
      },
      include: {
        class: true,
        subject: true,
        teacher: {
          select: { id: true, name: true, email: true },
        },
        academicYear: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findByClass(schoolId: string, classId: string) {
    return this.prisma.timetableSlot.findMany({
      where: {
        schoolId,
        classId,
      },
      include: {
        class: true,
        subject: true,
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findByTeacher(schoolId: string, teacherId: string) {
    // Get sections where teacher is homeroom teacher
    const homeroomSections = await this.prisma.section.findMany({
      where: { homeroomTeacherId: teacherId },
      select: { id: true, classId: true },
    });
    
    const homeroomSectionIds = homeroomSections.map(s => s.id);
    const homeroomClassIds = homeroomSections.map(s => s.classId);
    
    // Get classes this teacher teaches via ClassSubject
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { teacherId },
      select: { classId: true, sectionId: true },
    });
    
    const classIds = classSubjects.map(cs => cs.classId);
    const sectionIds = classSubjects.map(cs => cs.sectionId);
    
    // Build OR conditions - teacher should see all classes they're assigned to
    const orConditions: any[] = [];
    if (teacherId) orConditions.push({ teacherId });
    if (homeroomSectionIds.length > 0) orConditions.push({ sectionId: { in: homeroomSectionIds } });
    if (homeroomClassIds.length > 0) orConditions.push({ classId: { in: homeroomClassIds } });
    if (classIds.length > 0 && sectionIds.length > 0) orConditions.push({ classId: { in: classIds }, sectionId: { in: sectionIds } });
    
    if (orConditions.length === 0) return [];
    
    return this.prisma.timetableSlot.findMany({
      where: {
        schoolId,
        OR: orConditions,
      },
      include: {
        class: true,
        section: true,
        subject: true,
        teacher: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string, schoolId: string) {
    const slot = await this.prisma.timetableSlot.findFirst({
      where: { id, schoolId },
      include: {
        class: true,
        subject: true,
        teacher: {
          select: { id: true, name: true, email: true },
        },
        academicYear: true,
        school: true,
      },
    });

    if (!slot) {
      throw new NotFoundException('Timetable slot not found');
    }

    return slot;
  }

  async update(id: string, schoolId: string, data: UpdateTimetableSlotDto) {
    const existing = await this.findOne(id, schoolId);

    // Get values for conflict validation
    const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
    const startTime = data.startTime ?? existing.startTime;
    const endTime = data.endTime ?? existing.endTime;
    const teacherId = data.teacherId ?? existing.teacherId;
    const classId = data.classId ?? existing.classId;

    // Validate no conflicts (exclude current slot from check)
    await this.validateNoConflict(
      existing.schoolId,
      dayOfWeek,
      startTime,
      endTime,
      teacherId ?? undefined,
      classId,
      id,
    );

    return this.prisma.timetableSlot.update({
      where: { id },
      data: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room,
        academicYearId: data.academicYearId,
      },
      include: {
        class: true,
        subject: true,
        teacher: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async delete(id: string, schoolId: string) {
    await this.findOne(id, schoolId); // Validate exists

    return this.prisma.timetableSlot.delete({
      where: { id },
    });
  }

  /**
   * Bulk create timetable slots for a class/section
   * This allows creating the full weekly schedule at once
   */
  async bulkCreate(schoolId: string, slots: CreateTimetableSlotDto[]) {
    const results = {
      success: true,
      created: [] as any[],
      errors: [] as { slot: any; error: string }[],
    };

    for (const slotData of slots) {
      try {
        // Validate no conflicts
        await this.validateNoConflict(
          schoolId,
          slotData.dayOfWeek,
          slotData.startTime,
          slotData.endTime,
          slotData.teacherId,
          slotData.classId,
        );

        const slot = await this.prisma.timetableSlot.create({
          data: {
            schoolId,
            classId: slotData.classId,
            sectionId: slotData.sectionId,
            subjectId: slotData.subjectId,
            teacherId: slotData.teacherId,
            dayOfWeek: slotData.dayOfWeek,
            startTime: slotData.startTime,
            endTime: slotData.endTime,
            room: slotData.room,
            academicYearId: slotData.academicYearId,
          },
          include: {
            class: true,
            subject: true,
            teacher: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        results.created.push(slot);
      } catch (error: any) {
        results.errors.push({
          slot: slotData,
          error: error.message || 'Unknown error',
        });
      }
    }

    if (results.errors.length > 0) {
      results.success = false;
    }

    return results;
  }

  /**
   * Delete all timetable slots for a class/section
   */
  async deleteByClassSection(
    schoolId: string,
    classId: string,
    sectionId?: string,
  ) {
    const where: any = {
      schoolId,
      classId,
    };

    if (sectionId) {
      where.sectionId = sectionId;
    }

    return this.prisma.timetableSlot.deleteMany({
      where,
    });
  }

  /**
   * Get timetable grid for a class/section (organized by day and time)
   */
  async getTimetableGrid(
    schoolId: string,
    classId: string,
    sectionId?: string,
    academicYearId?: string,
  ) {
    const where: any = {
      schoolId,
      classId,
      ...this.buildAcademicYearFilter(academicYearId),
    };

    if (sectionId) {
      where.sectionId = sectionId;
    }

    const slots = await this.prisma.timetableSlot.findMany({
      where,
      include: {
        subject: true,
        teacher: {
          select: { id: true, name: true, email: true },
        },
        section: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Organize by day
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const grid: Record<string, any[]> = {};

    for (let i = 0; i < 7; i++) {
      grid[i] = slots.filter((s) => s.dayOfWeek === i);
    }

    return {
      days,
      grid,
      slots,
    };
  }
}
