import { HttpStatus,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodTimeDto, UpdatePeriodTimeDto } from './dto/period-time.dto';
import { SCHOOL_SETTING_KEYS } from '../school-settings/school-settings.service';

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

  private readonly defaultMaxPeriodsPerDay = 7;

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
    if (data.startTime >= data.endTime) throw new LocalizedException('period_time.start_time_must_be_before_end_time_f3e3a4f0', undefined, undefined, 'Start time must be before end time');
  }

  private async getMaxPeriodsPerDay(schoolId: string) {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: {
        schoolId_key: {
          schoolId,
          key: SCHOOL_SETTING_KEYS.MAX_PERIODS_PER_DAY,
        },
      },
      select: { value: true },
    });

    const parsed = Number(setting?.value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
      ? parsed
      : this.defaultMaxPeriodsPerDay;
  }

  private async validateMaxPeriodsPerDay(
    schoolId: string,
    data: PeriodTimePayload,
    excludeId?: string,
  ) {
    const maxPeriods = await this.getMaxPeriodsPerDay(schoolId);

    if (data.periodNumber > maxPeriods) {
      throw new BadRequestException(
        `Period number must be between 1 and ${maxPeriods}`,
      );
    }

    const existingPeriodCount = await this.prisma.periodTime.count({
      where: {
        schoolId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (existingPeriodCount >= maxPeriods) {
      throw new BadRequestException(
        `This school is limited to ${maxPeriods} period${maxPeriods === 1 ? '' : 's'} per day`,
      );
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

    if (duplicatePeriod) throw new LocalizedException('period_time.period_already_exists_5ad2b735', undefined, HttpStatus.CONFLICT, 'Period ${data.periodNumber} already exists');

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
    const periods = await this.prisma.periodTime.findMany({
      where: { schoolId },
      orderBy: { periodNumber: 'asc' },
    });

    return Promise.all(
      periods.map(async (period) => {
        const timetableSlotCount = await this.prisma.timetableSlot.count({
          where: {
            schoolId,
            startTime: period.startTime,
            endTime: period.endTime,
          },
        });

        return {
          ...period,
          timetableSlotCount,
          canDelete: timetableSlotCount === 0,
        };
      }),
    );
  }

  async create(data: CreatePeriodTimeDto, schoolId: string) {
    const payload = {
      periodNumber: data.periodNumber,
      startTime: data.startTime,
      endTime: data.endTime,
    };

    this.validatePeriodPayload(payload);
    await this.validateMaxPeriodsPerDay(schoolId, payload);
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
    if (!existing) throw new LocalizedException('period_time.period_time_not_found_669c0ead', undefined, HttpStatus.NOT_FOUND, 'Period time not found');

    const payload = {
      periodNumber: data.periodNumber ?? existing.periodNumber,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
    };

    this.validatePeriodPayload(payload);
    await this.validateMaxPeriodsPerDay(schoolId, payload, id);
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
    if (!existing) throw new LocalizedException('period_time.period_time_not_found_669c0ead', undefined, HttpStatus.NOT_FOUND, 'Period time not found');

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
