"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SirenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SirenService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
let SirenService = SirenService_1 = class SirenService {
    prisma;
    notificationService;
    logger = new common_1.Logger(SirenService_1.name);
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async evaluateSchedules() {
        try {
            const now = new Date();
            const currentTime = this.toHHMM(now);
            const day = now.getDay();
            await this.evaluateDynamicSirens(currentTime, day);
            await this.evaluateStaticSchedules(currentTime, day);
        }
        catch (error) {
            this.logger.error('Error evaluating schedules:', error);
        }
    }
    async evaluateDynamicSirens(currentTime, day) {
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
                if (!isStart && !isEnd)
                    continue;
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
                        ...new Set(slots
                            .map((slot) => slot.teacherId)
                            .filter((teacherId) => Boolean(teacherId))),
                    ];
                    await this.fireSiren(school.id, isStart ? 'PERIOD_START' : 'PERIOD_END', 'DYNAMIC', period.periodNumber, null, teacherIds);
                }
            }
        }
    }
    async evaluateStaticSchedules(currentTime, day) {
        const schedules = await this.prisma.sirenSchedule.findMany({
            where: {
                isActive: true,
                ringTime: currentTime,
                daysOfWeek: {
                    has: day,
                },
            },
        });
        await Promise.all(schedules.map((schedule) => this.fireSiren(schedule.schoolId, schedule.type, 'STATIC', null, schedule.id, undefined)));
    }
    async getSchedules(schoolId) {
        return this.prisma.sirenSchedule.findMany({
            where: { schoolId },
            orderBy: { ringTime: 'asc' },
        });
    }
    async createSchedule(schoolId, data) {
        return this.prisma.sirenSchedule.create({
            data: { ...data, schoolId },
        });
    }
    async updateSchedule(schoolId, id, data) {
        const existing = await this.prisma.sirenSchedule.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });
        throw new localization_1.LocalizedException('siren.siren_schedule_not_found_67a88d43', undefined, common_1.HttpStatus.NOT_FOUND, 'Siren schedule not found');
        return this.prisma.sirenSchedule.update({
            where: { id },
            data: { ...data, schoolId },
        });
    }
    async deleteSchedule(schoolId, id) {
        const existing = await this.prisma.sirenSchedule.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });
        throw new localization_1.LocalizedException('siren.siren_schedule_not_found_67a88d43', undefined, common_1.HttpStatus.NOT_FOUND, 'Siren schedule not found');
        return this.prisma.sirenSchedule.delete({ where: { id } });
    }
    async getEvents(schoolId, limit) {
        return this.prisma.sirenEvent.findMany({
            where: { schoolId },
            orderBy: { firedAt: 'desc' },
            take: limit,
        });
    }
    async getHardwareConfig(schoolId) {
        return this.prisma.sirenHardwareConfig.findUnique({
            where: { schoolId },
        });
    }
    async saveHardwareConfig(schoolId, data) {
        return this.prisma.sirenHardwareConfig.upsert({
            where: { schoolId },
            update: { ...data, schoolId },
            create: { ...data, schoolId },
        });
    }
    async updateHardwareConfig(schoolId, id, data) {
        const existing = await this.prisma.sirenHardwareConfig.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });
        throw new localization_1.LocalizedException('siren.siren_hardware_config_not_found_74742d39', undefined, common_1.HttpStatus.NOT_FOUND, 'Siren hardware config not found');
        return this.prisma.sirenHardwareConfig.update({
            where: { id },
            data: { ...data, schoolId },
        });
    }
    async manualTrigger(schoolId, type) {
        return this.fireSiren(schoolId, type, 'MANUAL', null, null, undefined);
    }
    async testWebhook(webhookUrl, timeout) {
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
                }
                catch (e) {
                    this.logger.error('Error turning off test siren:', e.message);
                }
            }, 2000);
            return { success: true };
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async fireSiren(schoolId, type, triggerType, periodNumber, scheduleId, targetTeacherIds) {
        const event = await this.prisma.sirenEvent.create({
            data: {
                schoolId,
                type,
                triggerType,
                periodNumber,
                scheduleId,
            },
        });
        this.logger.log(`Siren fired: ${type} (${triggerType}) for school ${schoolId}`);
        const config = await this.getHardwareConfig(schoolId);
        if (config && config.isEnabled && config.webhookUrl) {
            this.triggerHardware(config.webhookUrl, config.timeout);
        }
        try {
            if (triggerType === 'DYNAMIC') {
                await this.notificationService.notifyTeachersOfSiren(schoolId, type, triggerType, targetTeacherIds ?? []);
            }
        }
        catch (error) {
            this.logger.error(`Failed to notify teachers of siren: ${error.message}`);
        }
        return event;
    }
    async triggerHardware(webhookUrl, timeout) {
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
                }
                catch (e) {
                    this.logger.error('Error turning off siren:', e.message);
                }
            }, 3000);
        }
        catch (error) {
            this.logger.error(`Hardware trigger failed: ${error.message}`);
        }
    }
    toHHMM(date) {
        return date.toLocaleString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    }
};
exports.SirenService = SirenService;
__decorate([
    (0, schedule_1.Cron)('0 * * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SirenService.prototype, "evaluateSchedules", null);
exports.SirenService = SirenService = SirenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], SirenService);
//# sourceMappingURL=siren.service.js.map