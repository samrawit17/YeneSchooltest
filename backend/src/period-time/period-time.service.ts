import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodTimeDto, UpdatePeriodTimeDto } from './dto/period-time.dto';

type PeriodTimePayload = {
  periodNumber: number;
  startTime: string;
  endTime: string;
};

type TimetableSlotForPeriodValidation = {
  id: string;
  dayOfWeek: number;
  classId: string;
  sectionId: string;
  teacherId: string | null;
  room: string | null;
};

@Injectable()
export class PeriodTimeService {
  constructor(private prisma: PrismaService) {}

  private timeToMinutes(time: string) {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }

  private timesOverlap(
    leftStart: string,
    leftEnd: string,
    rightStart: string,
    rightEnd: string,
  ) {
    return (
      this.timeToMinutes(leftStart) < this.timeToMinutes(rightEnd) &&
      this.timeToMinutes(rightStart) < this.timeToMinutes(leftEnd)
    );
  }

  private validatePeriodPayload(data: PeriodTimePayload) {
    if (data.startTime >= data.endTime) {
      throw new BadRequestException('Start time must be before end time');
    }
  }

  private async validatePeriodUniquenessAndOverlap(
    schoolId: string,
    data: PeriodTimePayload,
    excludeId?: string,
  ) {
    const duplicatePeriod = await this.prisma.periodTime.findFirst({
      where: {
        schoolId,
        periodNumber: data.periodNumber,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (duplicatePeriod) {
      throw new ConflictException(`Period ${data.periodNumber} already exists`);
    }

    const periods = await this.prisma.periodTime.findMany({
      where: {
        schoolId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        periodNumber: true,
        startTime: true,
        endTime: true,
      },
    });

    const overlappingPeriod = periods.find((period) =>
      this.timesOverlap(data.startTime, data.endTime, period.startTime, period.endTime),
    );

    if (overlappingPeriod) {
      throw new ConflictException(
        `Period time overlaps Period ${overlappingPeriod.periodNumber} (${overlappingPeriod.startTime}-${overlappingPeriod.endTime})`,
      );
    }
  }

  private assertNoCascadeSlotConflicts(
    matchingSlots: TimetableSlotForPeriodValidation[],
    conflictingSlots: TimetableSlotForPeriodValidation[],
  ) {
    for (const slot of matchingSlots) {
      for (const conflict of conflictingSlots) {
        if (slot.dayOfWeek !== conflict.dayOfWeek) continue;

        if (
          slot.classId === conflict.classId &&
          slot.sectionId === conflict.sectionId
        ) {
          throw new ConflictException(
            'Changing this period would overlap an existing timetable slot for the same class section',
          );
        }

        if (slot.teacherId && slot.teacherId === conflict.teacherId) {
          throw new ConflictException(
            'Changing this period would overlap an existing timetable slot for the same teacher',
          );
        }

        if (slot.room && slot.room === conflict.room) {
          throw new ConflictException(
            `Changing this period would overlap an existing timetable slot in room ${slot.room}`,
          );
        }
      }
    }
  }

  private async validateTimetableCascade(
    schoolId: string,
    oldStartTime: string,
    oldEndTime: string,
    newStartTime: string,
    newEndTime: string,
  ) {
    if (oldStartTime === newStartTime && oldEndTime === newEndTime) {
      return;
    }

    const matchingSlots = await this.prisma.timetableSlot.findMany({
      where: {
        schoolId,
        startTime: oldStartTime,
        endTime: oldEndTime,
      },
      select: {
        id: true,
        dayOfWeek: true,
        classId: true,
        sectionId: true,
        teacherId: true,
        room: true,
      },
    });

    if (matchingSlots.length === 0) {
      return;
    }

    const matchingSlotIds = matchingSlots.map((slot) => slot.id);
    const conflictingSlots = await this.prisma.timetableSlot.findMany({
      where: {
        schoolId,
        id: { notIn: matchingSlotIds },
        OR: [
          {
            AND: [
              { startTime: { lt: newEndTime } },
              { endTime: { gt: newStartTime } },
            ],
          },
        ],
      },
      select: {
        id: true,
        dayOfWeek: true,
        classId: true,
        sectionId: true,
        teacherId: true,
        room: true,
      },
    });

    this.assertNoCascadeSlotConflicts(matchingSlots, conflictingSlots);
  }

  async findAll(schoolId: string) {
    return this.prisma.periodTime.findMany({
      where: { schoolId },
      orderBy: { periodNumber: 'asc' },
    });
  }

  async create(data: CreatePeriodTimeDto, schoolId: string) {
    const payload = {
      periodNumber: data.periodNumber,
      startTime: data.startTime,
      endTime: data.endTime,
    };

    this.validatePeriodPayload(payload);
    await this.validatePeriodUniquenessAndOverlap(schoolId, payload);

    return this.prisma.periodTime.create({
      data: {
        schoolId,
        ...payload,
      },
    });
  }

  async update(id: string, schoolId: string, data: UpdatePeriodTimeDto) {
    const existing = await this.prisma.periodTime.findFirst({
      where: { id, schoolId },
      select: { id: true, periodNumber: true, startTime: true, endTime: true },
    });
    if (!existing) throw new NotFoundException('Period time not found');

    const payload = {
      periodNumber: data.periodNumber ?? existing.periodNumber,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
    };

    this.validatePeriodPayload(payload);
    await this.validatePeriodUniquenessAndOverlap(schoolId, payload, id);
    await this.validateTimetableCascade(
      schoolId,
      existing.startTime,
      existing.endTime,
      payload.startTime,
      payload.endTime,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.periodTime.update({
        where: { id },
        data: payload,
      });

      if (
        existing.startTime !== payload.startTime ||
        existing.endTime !== payload.endTime
      ) {
        await tx.timetableSlot.updateMany({
          where: {
            schoolId,
            startTime: existing.startTime,
            endTime: existing.endTime,
          },
          data: {
            startTime: payload.startTime,
            endTime: payload.endTime,
          },
        });
      }

      return updated;
    });
  }

  async delete(id: string, schoolId: string) {
    const existing = await this.prisma.periodTime.findFirst({
      where: { id, schoolId },
      select: { id: true, startTime: true, endTime: true },
    });
    if (!existing) throw new NotFoundException('Period time not found');

    const matchingTimetableSlotCount = await this.prisma.timetableSlot.count({
      where: {
        schoolId,
        startTime: existing.startTime,
        endTime: existing.endTime,
      },
    });

    if (matchingTimetableSlotCount > 0) {
      throw new BadRequestException(
        `Cannot delete this period time because ${matchingTimetableSlotCount} timetable slot${matchingTimetableSlotCount === 1 ? '' : 's'} still use it. Move or delete those timetable slots first.`,
      );
    }

    return this.prisma.periodTime.delete({ where: { id } });
  }
}
