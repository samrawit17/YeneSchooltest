import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';

@Injectable()
export class TimetableSlotService {
  constructor(private prisma: PrismaService) {}

  private readonly teachingWeekDays = [1, 2, 3, 4, 5];
  private readonly maxPeriodsPerDay = 7;

  private buildAutoGenerateSlotKey(dayOfWeek: number, startTime: string) {
    return `${dayOfWeek}:${startTime}`;
  }

  private scoreAutoGenerateCandidate(params: {
    dayOfWeek: number;
    subjectDailyUsage: number;
    teacherDailyUsage: number;
    slotIndex: number;
  }) {
    return (
      params.subjectDailyUsage * 1000 +
      params.teacherDailyUsage * 100 +
      params.dayOfWeek * 10 +
      params.slotIndex
    );
  }

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
    sectionId: string,
    room?: string,
    excludeSlotId?: string,
    prismaClient: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    // Check for teacher conflicts only if teacherId is provided
    if (teacherId) {
      const teacherConflicts = await prismaClient.timetableSlot.findMany({
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
    const classConflicts = await prismaClient.timetableSlot.findMany({
      where: {
        schoolId,
        classId,
        sectionId,
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
        `Section is already scheduled for ${conflict.startTime} - ${conflict.endTime} on this day`,
      );
    }

    if (room) {
      const roomConflicts = await prismaClient.timetableSlot.findMany({
        where: {
          schoolId,
          room,
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

      if (roomConflicts.length > 0) {
        const conflict = roomConflicts[0];
        throw new ConflictException(
          `Room ${room} is already scheduled for ${conflict.startTime} - ${conflict.endTime} on this day`,
        );
      }
    }
  }

  private validatePeriodCapacity(periodTimes: Array<{ id?: string }>) {
    if (periodTimes.length === 0) {
      throw new BadRequestException(
        'Create period times before auto-generating a timetable',
      );
    }

    if (periodTimes.length > this.maxPeriodsPerDay) {
      throw new BadRequestException(
        `Ethiopian schools support a maximum of ${this.maxPeriodsPerDay} periods per day`,
      );
    }
  }

  private validateAutoGenerationLoads(
    normalizedRequirements: Array<{
      classSubjectId: string;
      periodsPerWeek: number;
    }>,
    periodTimesPerDay: number,
  ) {
    const weeklyCapacity = this.teachingWeekDays.length * periodTimesPerDay;
    const excessiveRequirement = normalizedRequirements.find(
      (item) => item.periodsPerWeek > weeklyCapacity,
    );

    if (excessiveRequirement) {
      throw new BadRequestException(
        `A subject cannot exceed ${weeklyCapacity} periods per week for the configured school week`,
      );
    }

    const totalRequestedPeriods = normalizedRequirements.reduce(
      (sum, item) => sum + item.periodsPerWeek,
      0,
    );

    if (totalRequestedPeriods > weeklyCapacity) {
      throw new BadRequestException(
        `The requested weekly load exceeds the section capacity of ${weeklyCapacity} periods`,
      );
    }
  }

  private validateBatchConflicts(slots: CreateTimetableSlotDto[]) {
    for (let index = 0; index < slots.length; index += 1) {
      const current = slots[index];

      for (let compareIndex = index + 1; compareIndex < slots.length; compareIndex += 1) {
        const next = slots[compareIndex];
        const sameDay = current.dayOfWeek === next.dayOfWeek;
        if (!sameDay) continue;

        const overlaps = this.timesOverlap(
          current.startTime,
          current.endTime,
          next.startTime,
          next.endTime,
        );
        if (!overlaps) continue;

        if (
          current.classId === next.classId &&
          current.sectionId === next.sectionId
        ) {
          throw new ConflictException(
            `Section ${current.sectionId} has overlapping timetable slots in this batch`,
          );
        }

        if (
          current.teacherId &&
          next.teacherId &&
          current.teacherId === next.teacherId
        ) {
          throw new ConflictException(
            'A teacher has overlapping timetable slots in this batch',
          );
        }

        if (
          current.room &&
          next.room &&
          current.room === next.room
        ) {
          throw new ConflictException(
            `Room ${current.room} has overlapping timetable slots in this batch`,
          );
        }
      }
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
      data.sectionId,
      data.room,
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
      data.sectionId ?? existing.sectionId,
      data.room ?? existing.room ?? undefined,
      id,
    );

    return this.prisma.timetableSlot.update({
      where: { id },
      data: {
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
    this.validateBatchConflicts(slots);

    const created = await this.prisma.$transaction(async (tx) => {
      const inserted: any[] = [];

      for (const slotData of slots) {
        await this.validateNoConflict(
          schoolId,
          slotData.dayOfWeek,
          slotData.startTime,
          slotData.endTime,
          slotData.teacherId,
          slotData.classId,
          slotData.sectionId,
          slotData.room,
          undefined,
          tx,
        );

        const slot = await tx.timetableSlot.create({
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

        inserted.push(slot);
      }

      return inserted;
    });

    return {
      success: true,
      created,
      errors: [],
    };
  }

  /**
   * Delete all timetable slots for a class/section
   */
  async deleteByClassSection(
    schoolId: string,
    classId: string,
    sectionId?: string,
    academicYearId?: string,
  ) {
    const where: any = {
      schoolId,
      classId,
    };

    if (sectionId) {
      where.sectionId = sectionId;
    }

    if (academicYearId) {
      where.academicYearId = academicYearId;
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
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    const grid: Record<string, any[]> = {};

    for (let i = 1; i <= 7; i += 1) {
      grid[days[i - 1]] = slots.filter((s) => s.dayOfWeek === i);
    }

    return {
      days,
      grid,
      slots,
    };
  }

  async autoGenerateSectionTimetable(
    schoolId: string,
    payload: {
      classId: string;
      sectionId: string;
      academicYearId?: string;
      apply?: boolean;
      periodRequirements: Array<{
        classSubjectId: string;
        periodsPerWeek: number;
      }>;
    },
  ) {
    const { classId, sectionId, academicYearId, apply = false, periodRequirements } = payload;

    if (!classId || !sectionId) {
      throw new BadRequestException('Class and section are required');
    }

    if (!Array.isArray(periodRequirements) || periodRequirements.length === 0) {
      throw new BadRequestException('At least one period requirement is required');
    }

    const normalizedRequirements = periodRequirements
      .map((item) => ({
        classSubjectId: item.classSubjectId,
        periodsPerWeek: Number(item.periodsPerWeek) || 0,
      }))
      .filter((item) => item.classSubjectId && item.periodsPerWeek > 0);

    if (normalizedRequirements.length === 0) {
      throw new BadRequestException('No valid period requirements were provided');
    }

    const [periodTimes, classSubjects, existingSlots] = await Promise.all([
      this.prisma.periodTime.findMany({
        where: { schoolId },
        orderBy: { periodNumber: 'asc' },
      }),
      this.prisma.classSubject.findMany({
        where: {
          classId,
          sectionId,
          ...(academicYearId ? { academicYear: academicYearId } : {}),
        },
        include: {
          class: { select: { id: true, name: true, grade: true } },
          section: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          teacher: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.timetableSlot.findMany({
        where: {
          schoolId,
          ...(academicYearId ? { academicYearId } : {}),
        },
        select: {
          classId: true,
          sectionId: true,
          teacherId: true,
          subjectId: true,
          room: true,
          dayOfWeek: true,
          startTime: true,
        },
      }),
    ]);

    this.validatePeriodCapacity(periodTimes);
    this.validateAutoGenerationLoads(normalizedRequirements, periodTimes.length);

    const classSubjectMap = new Map(classSubjects.map((item) => [item.id, item]));

    const unresolvedRequirements = normalizedRequirements
      .filter((item) => !classSubjectMap.has(item.classSubjectId))
      .map((item) => ({
        classSubjectId: item.classSubjectId,
        subjectName: 'Unknown subject',
        teacherName: null,
        reason: 'Assignment not found for the selected class and section',
      }));

    const requirements = normalizedRequirements
      .map((item) => {
        const classSubject = classSubjectMap.get(item.classSubjectId);
        if (!classSubject) return null;
        return { ...item, classSubject };
      })
      .filter(
        (
          item,
        ): item is {
          classSubjectId: string;
          periodsPerWeek: number;
          classSubject: (typeof classSubjects)[number];
        } => Boolean(item),
      );

    const candidateSlots = this.teachingWeekDays.flatMap((dayOfWeek) =>
      periodTimes.map((period, slotIndex) => ({
        dayOfWeek,
        startTime: period.startTime,
        endTime: period.endTime,
        periodNumber: period.periodNumber,
        slotIndex,
      })),
    );

    const sectionSlotKeys = new Set<string>();
    const teacherSlotKeys = new Set<string>();

    for (const slot of existingSlots) {
      const slotKey = this.buildAutoGenerateSlotKey(slot.dayOfWeek, slot.startTime);
      const isTargetSection =
        slot.classId === classId && slot.sectionId === sectionId;

      if (isTargetSection && apply) {
        continue;
      }

      sectionSlotKeys.add(slotKey);

      if (slot.teacherId) {
        teacherSlotKeys.add(`${slot.teacherId}:${slotKey}`);
      }
    }

    const subjectUsageByDay = new Map<string, number>();
    const teacherUsageByDay = new Map<string, number>();
    const teacherSubjectUsageByDay = new Map<string, number>();

    for (const slot of existingSlots) {
      const isTargetSection =
        slot.classId === classId && slot.sectionId === sectionId;

      if ((isTargetSection && apply) || !slot.teacherId || !slot.subjectId) {
        continue;
      }

      const teacherSubjectDailyKey = `${slot.teacherId}:${slot.subjectId}:${slot.dayOfWeek}`;
      teacherSubjectUsageByDay.set(
        teacherSubjectDailyKey,
        (teacherSubjectUsageByDay.get(teacherSubjectDailyKey) || 0) + 1,
      );
    }

    const demands = requirements
      .flatMap((requirement) =>
        Array.from({ length: requirement.periodsPerWeek }, () => ({
          classSubjectId: requirement.classSubjectId,
          subjectId: requirement.classSubject.subjectId,
          subjectName: requirement.classSubject.subject?.name || 'Unknown subject',
          teacherId: requirement.classSubject.teacherId || null,
          teacherName: requirement.classSubject.teacher?.name || null,
          periodsPerWeek: requirement.periodsPerWeek,
        })),
      )
      .sort((left, right) => {
        const leftTeacherPenalty = left.teacherId ? 0 : 1;
        const rightTeacherPenalty = right.teacherId ? 0 : 1;
        if (leftTeacherPenalty !== rightTeacherPenalty) {
          return leftTeacherPenalty - rightTeacherPenalty;
        }
        return right.periodsPerWeek - left.periodsPerWeek;
      });

    const generatedSlots: Array<{
      classSubjectId: string;
      subjectId: string;
      subjectName: string;
      teacherId?: string;
      teacherName?: string | null;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      periodNumber: number;
      room?: string | null;
    }> = [];

    const unscheduled: Array<{
      classSubjectId: string;
      subjectName: string;
      teacherName: string | null;
      reason: string;
    }> = [...unresolvedRequirements];

    for (const demand of demands) {
      if (!demand.teacherId) {
        unscheduled.push({
          classSubjectId: demand.classSubjectId,
          subjectName: demand.subjectName,
          teacherName: null,
          reason: 'No teacher assigned to this class subject',
        });
        continue;
      }

      const chosenCandidate = candidateSlots
        .filter((candidate) => {
          const slotKey = this.buildAutoGenerateSlotKey(
            candidate.dayOfWeek,
            candidate.startTime,
          );
          const teacherSubjectDailyKey = `${demand.teacherId}:${demand.subjectId}:${candidate.dayOfWeek}`;
          return (
            !sectionSlotKeys.has(slotKey) &&
            !teacherSlotKeys.has(`${demand.teacherId}:${slotKey}`) &&
            (teacherSubjectUsageByDay.get(teacherSubjectDailyKey) || 0) === 0
          );
        })
        .map((candidate) => {
          const subjectDailyKey = `${demand.subjectId}:${candidate.dayOfWeek}`;
          const teacherDailyKey = `${demand.teacherId}:${candidate.dayOfWeek}`;
          return {
            ...candidate,
            score: this.scoreAutoGenerateCandidate({
              dayOfWeek: candidate.dayOfWeek,
              subjectDailyUsage: subjectUsageByDay.get(subjectDailyKey) || 0,
              teacherDailyUsage: teacherUsageByDay.get(teacherDailyKey) || 0,
              slotIndex: candidate.slotIndex,
            }),
          };
        })
        .sort((left, right) => left.score - right.score)[0];

      if (!chosenCandidate) {
        unscheduled.push({
          classSubjectId: demand.classSubjectId,
          subjectName: demand.subjectName,
          teacherName: demand.teacherName,
          reason: 'No conflict-free period is available for this teacher and section',
        });
        continue;
      }

      const slotKey = this.buildAutoGenerateSlotKey(
        chosenCandidate.dayOfWeek,
        chosenCandidate.startTime,
      );

      sectionSlotKeys.add(slotKey);
      teacherSlotKeys.add(`${demand.teacherId}:${slotKey}`);

      const subjectDailyKey = `${demand.subjectId}:${chosenCandidate.dayOfWeek}`;
      const teacherDailyKey = `${demand.teacherId}:${chosenCandidate.dayOfWeek}`;
      const teacherSubjectDailyKey = `${demand.teacherId}:${demand.subjectId}:${chosenCandidate.dayOfWeek}`;
      subjectUsageByDay.set(
        subjectDailyKey,
        (subjectUsageByDay.get(subjectDailyKey) || 0) + 1,
      );
      teacherUsageByDay.set(
        teacherDailyKey,
        (teacherUsageByDay.get(teacherDailyKey) || 0) + 1,
      );
      teacherSubjectUsageByDay.set(
        teacherSubjectDailyKey,
        (teacherSubjectUsageByDay.get(teacherSubjectDailyKey) || 0) + 1,
      );

      generatedSlots.push({
        classSubjectId: demand.classSubjectId,
        subjectId: demand.subjectId,
        subjectName: demand.subjectName,
        teacherId: demand.teacherId,
        teacherName: demand.teacherName,
        dayOfWeek: chosenCandidate.dayOfWeek,
        startTime: chosenCandidate.startTime,
        endTime: chosenCandidate.endTime,
        periodNumber: chosenCandidate.periodNumber,
        room: null,
      });
    }

    const summary = {
      requestedPeriods: normalizedRequirements.reduce(
        (total, item) => total + item.periodsPerWeek,
        0,
      ),
      generatedPeriods: generatedSlots.length,
      unscheduledPeriods: unscheduled.length,
    };

    let applied = false;

    if (apply && unscheduled.length === 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.timetableSlot.deleteMany({
          where: {
            schoolId,
            classId,
            sectionId,
            ...(academicYearId ? { academicYearId } : {}),
          },
        });

        if (generatedSlots.length > 0) {
          await tx.timetableSlot.createMany({
            data: generatedSlots.map((slot) => ({
              schoolId,
              classId,
              sectionId,
              subjectId: slot.subjectId,
              teacherId: slot.teacherId,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
              room: slot.room || undefined,
              academicYearId,
            })),
          });
        }
      });

      applied = true;
    }

    return {
      success: unscheduled.length === 0,
      applied,
      classId,
      sectionId,
      academicYearId: academicYearId || null,
      generatedSlots,
      unscheduled,
      summary,
    };
  }
}
