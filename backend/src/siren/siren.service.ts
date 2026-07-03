import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class SirenService {
  private readonly logger = new Logger(SirenService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  @Cron('0 * * * * *')
  async evaluateSchedules() {
    try {
      const now = new Date();
      const currentTime = this.toHHMM(now);
      const day = now.getDay();

      await this.evaluateDynamicSirens(currentTime, day);
      await this.evaluateStaticSchedules(currentTime, day);
    } catch (error) {
      this.logger.error('Error evaluating schedules:', error);
    }
  }

  private async evaluateDynamicSirens(currentTime: string, day: number) {
    // Get all schools with active sirens
    const schools = await this.prisma.school.findMany({
      where: { isActive: true },
    });

    for (const school of schools) {
      const periods = await this.prisma.periodTime.findMany({
        where: { schoolId: school.id },
      });

      for (const period of periods) {
        const isStart = currentTime === period.startTime;
        const isEnd = currentTime === period.endTime;

        if (!isStart && !isEnd) continue;

        // Core Logic: Only trigger if TimetableSlot exists for same time AND same dayOfWeek.
        // Notifications are scoped to the teachers assigned to those active slots.
        const slots = await this.prisma.timetableSlot.findMany({
          where: {
            schoolId: school.id,
            dayOfWeek: day,
            startTime: period.startTime,
            endTime: period.endTime,
          },
          select: { teacherId: true },
        });

        if (slots.length > 0) {
          const teacherIds = [
            ...new Set(
              slots
                .map((slot) => slot.teacherId)
                .filter((teacherId): teacherId is string => Boolean(teacherId)),
            ),
          ];

          await this.fireSiren(
            school.id,
            isStart ? 'PERIOD_START' : 'PERIOD_END',
            'DYNAMIC',
            period.periodNumber,
            null,
            teacherIds,
          );
        }
      }
    }
  }

  private async evaluateStaticSchedules(currentTime: string, day: number) {
    const schedules = await this.prisma.sirenSchedule.findMany({
      where: {
        isActive: true,
        ringTime: currentTime,
        daysOfWeek: {
          has: day,
        },
      },
    });

    await Promise.all(
      schedules.map((schedule) =>
        this.fireSiren(
          schedule.schoolId,
          schedule.type,
          'STATIC',
          null,
          schedule.id,
          undefined,
        ),
      ),
    );
  }

  // ==================== CRUD & UTILS ====================

  async getSchedules(schoolId: string) {
    return this.prisma.sirenSchedule.findMany({
      where: { schoolId },
      orderBy: { ringTime: 'asc' },
    });
  }

  async createSchedule(schoolId: string, data: any) {
    return this.prisma.sirenSchedule.create({
      data: { ...data, schoolId },
    });
  }

  async updateSchedule(schoolId: string, id: string, data: any) {
    const existing = await this.prisma.sirenSchedule.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) throw new LocalizedException('siren.siren_schedule_not_found_67a88d43', undefined, HttpStatus.NOT_FOUND, 'Siren schedule not found');

    return this.prisma.sirenSchedule.update({
      where: { id },
      data: { ...data, schoolId },
    });
  }

  async deleteSchedule(schoolId: string, id: string) {
    const existing = await this.prisma.sirenSchedule.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) throw new LocalizedException('siren.siren_schedule_not_found_67a88d43', undefined, HttpStatus.NOT_FOUND, 'Siren schedule not found');

    return this.prisma.sirenSchedule.delete({ where: { id } });
  }

  async getEvents(schoolId: string, limit: number) {
    return this.prisma.sirenEvent.findMany({
      where: { schoolId },
      orderBy: { firedAt: 'desc' },
      take: limit,
    });
  }

  async getHardwareConfig(schoolId: string) {
    return this.prisma.sirenHardwareConfig.findUnique({
      where: { schoolId },
    });
  }

  async saveHardwareConfig(schoolId: string, data: any) {
    return this.prisma.sirenHardwareConfig.upsert({
      where: { schoolId },
      update: { ...data, schoolId },
      create: { ...data, schoolId },
    });
  }

  async updateHardwareConfig(schoolId: string, id: string, data: any) {
    const existing = await this.prisma.sirenHardwareConfig.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!existing) throw new LocalizedException('siren.siren_hardware_config_not_found_74742d39', undefined, HttpStatus.NOT_FOUND, 'Siren hardware config not found');

    return this.prisma.sirenHardwareConfig.update({
      where: { id },
      data: { ...data, schoolId },
    });
  }

  async manualTrigger(schoolId: string, type: string) {
    return this.fireSiren(schoolId, type, 'MANUAL', null, null, undefined);
  }

  async testWebhook(webhookUrl: string, timeout: number) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      await fetch(`${webhookUrl}/on`, {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(id);

      setTimeout(async () => {
        try {
          const offController = new AbortController();
          const offId = setTimeout(() => offController.abort(), 1000);
          await fetch(`${webhookUrl}/off`, {
            method: 'POST',
            signal: offController.signal,
          });
          clearTimeout(offId);
        } catch (e) {
          this.logger.error('Error turning off test siren:', e.message);
        }
      }, 2000);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ==================== CORE FIRE LOGIC ====================

  private async fireSiren(
    schoolId: string,
    type: string,
    triggerType: string,
    periodNumber: number | null,
    scheduleId: string | null,
    targetTeacherIds?: string[],
  ) {
    const event = await this.prisma.sirenEvent.create({
      data: {
        schoolId,
        type,
        triggerType,
        periodNumber,
        scheduleId,
      },
    });

    this.logger.log(
      `Siren fired: ${type} (${triggerType}) for school ${schoolId}`,
    );

    // Hardware integration
    const config = await this.getHardwareConfig(schoolId);
    if (config && config.isEnabled && config.webhookUrl) {
      this.triggerHardware(config.webhookUrl, config.timeout);
    }

    try {
      if (triggerType === 'DYNAMIC') {
        await this.notificationService.notifyTeachersOfSiren(
          schoolId,
          type,
          triggerType,
          targetTeacherIds ?? [],
        );
      }
    } catch (error) {
      this.logger.error(`Failed to notify teachers of siren: ${error.message}`);
    }

    return event;
  }

  private async triggerHardware(webhookUrl: string, timeout: number) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      await fetch(`${webhookUrl}/on`, {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(id);

      // Off signal after 3 seconds
      setTimeout(async () => {
        try {
          const offController = new AbortController();
          const offId = setTimeout(() => offController.abort(), 1000);
          await fetch(`${webhookUrl}/off`, {
            method: 'POST',
            signal: offController.signal,
          });
          clearTimeout(offId);
        } catch (e) {
          this.logger.error('Error turning off siren:', e.message);
        }
      }, 3000);
    } catch (error) {
      this.logger.error(`Hardware trigger failed: ${error.message}`);
    }
  }

  private toHHMM(date: Date): string {
    return date.toLocaleString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
