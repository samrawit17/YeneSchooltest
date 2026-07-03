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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodTimeService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const school_settings_service_1 = require("../school-settings/school-settings.service");
let PeriodTimeService = class PeriodTimeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    defaultMaxPeriodsPerDay = 7;
    timeToMinutes(time) {
        const [hour, minute] = time.split(':').map(Number);
        return hour * 60 + minute;
    }
    timesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
        return (this.timeToMinutes(leftStart) < this.timeToMinutes(rightEnd) &&
            this.timeToMinutes(rightStart) < this.timeToMinutes(leftEnd));
    }
    validatePeriodPayload(data) {
        if (data.startTime >= data.endTime) {
            throw new localization_1.LocalizedException('period_time.start_time_must_be_before_end_time_f3e3a4f0', undefined, undefined, 'Start time must be before end time');
        }
    }
    async getMaxPeriodsPerDay(schoolId) {
        const setting = await this.prisma.schoolSetting.findUnique({
            where: {
                schoolId_key: {
                    schoolId,
                    key: school_settings_service_1.SCHOOL_SETTING_KEYS.MAX_PERIODS_PER_DAY,
                },
            },
            select: { value: true },
        });
        const parsed = Number(setting?.value);
        return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12
            ? parsed
            : this.defaultMaxPeriodsPerDay;
    }
    async validateMaxPeriodsPerDay(schoolId, data, excludeId) {
        const maxPeriods = await this.getMaxPeriodsPerDay(schoolId);
        if (data.periodNumber > maxPeriods) {
            throw new localization_1.LocalizedException('period_time.period_number_must_be_between_1_and_84881a4c', undefined, undefined, 'Period number must be between 1 and ${maxPeriods}');
        }
        const existingPeriodCount = await this.prisma.periodTime.count({
            where: {
                schoolId,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
        });
        if (existingPeriodCount >= maxPeriods) {
            throw new localization_1.LocalizedException('period_time.this_school_is_limited_to_period_per_day_c6fb8363', undefined, undefined, 'This school is limited to ${maxPeriods} period${maxPeriods === 1 ? \'\' : \'s\'} per day');
        }
    }
    async validatePeriodUniquenessAndOverlap(schoolId, data, excludeId) {
        const duplicatePeriod = await this.prisma.periodTime.findFirst({
            where: {
                schoolId,
                periodNumber: data.periodNumber,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (duplicatePeriod) {
            throw new localization_1.LocalizedException('period_time.period_already_exists_5ad2b735', undefined, common_1.HttpStatus.CONFLICT, 'Period ${data.periodNumber} already exists');
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
        const overlappingPeriod = periods.find((period) => this.timesOverlap(data.startTime, data.endTime, period.startTime, period.endTime));
        if (overlappingPeriod) {
            throw new localization_1.LocalizedException('period_time.period_time_overlaps_period_b01c40d2', undefined, common_1.HttpStatus.CONFLICT, 'Period time overlaps Period ${overlappingPeriod.periodNumber} (${overlappingPeriod.startTime}-${overlappingPeriod.endTime})');
        }
    }
    assertNoCascadeSlotConflicts(matchingSlots, conflictingSlots) {
        for (const slot of matchingSlots) {
            for (const conflict of conflictingSlots) {
                if (slot.dayOfWeek !== conflict.dayOfWeek)
                    continue;
                if (slot.classId === conflict.classId &&
                    slot.sectionId === conflict.sectionId) {
                    throw new localization_1.LocalizedException('period_time.changing_this_period_would_overlap_an_existing_timetable_slo_7099a69b', undefined, common_1.HttpStatus.CONFLICT, 'Changing this period would overlap an existing timetable slot for the same class section');
                }
                if (slot.teacherId && slot.teacherId === conflict.teacherId) {
                    throw new localization_1.LocalizedException('period_time.changing_this_period_would_overlap_an_existing_timetable_slo_f68336e4', undefined, common_1.HttpStatus.CONFLICT, 'Changing this period would overlap an existing timetable slot for the same teacher');
                }
                if (slot.room && slot.room === conflict.room) {
                    throw new localization_1.LocalizedException('period_time.changing_this_period_would_overlap_an_existing_timetable_slo_1df7797a', undefined, common_1.HttpStatus.CONFLICT, 'Changing this period would overlap an existing timetable slot in room ${slot.room}');
                }
            }
        }
    }
    async validateTimetableCascade(schoolId, oldStartTime, oldEndTime, newStartTime, newEndTime) {
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
    async findAll(schoolId) {
        const periods = await this.prisma.periodTime.findMany({
            where: { schoolId },
            orderBy: { periodNumber: 'asc' },
        });
        return Promise.all(periods.map(async (period) => {
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
        }));
    }
    async create(data, schoolId) {
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
    async update(id, schoolId, data) {
        const existing = await this.prisma.periodTime.findFirst({
            where: { id, schoolId },
            select: { id: true, periodNumber: true, startTime: true, endTime: true },
        });
        throw new localization_1.LocalizedException('period_time.period_time_not_found_669c0ead', undefined, common_1.HttpStatus.NOT_FOUND, 'Period time not found');
        const payload = {
            periodNumber: data.periodNumber ?? existing.periodNumber,
            startTime: data.startTime ?? existing.startTime,
            endTime: data.endTime ?? existing.endTime,
        };
        this.validatePeriodPayload(payload);
        await this.validateMaxPeriodsPerDay(schoolId, payload, id);
        await this.validatePeriodUniquenessAndOverlap(schoolId, payload, id);
        await this.validateTimetableCascade(schoolId, existing.startTime, existing.endTime, payload.startTime, payload.endTime);
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.periodTime.update({
                where: { id },
                data: payload,
            });
            if (existing.startTime !== payload.startTime ||
                existing.endTime !== payload.endTime) {
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
    async delete(id, schoolId) {
        const existing = await this.prisma.periodTime.findFirst({
            where: { id, schoolId },
            select: { id: true, startTime: true, endTime: true },
        });
        throw new localization_1.LocalizedException('period_time.period_time_not_found_669c0ead', undefined, common_1.HttpStatus.NOT_FOUND, 'Period time not found');
        const matchingTimetableSlotCount = await this.prisma.timetableSlot.count({
            where: {
                schoolId,
                startTime: existing.startTime,
                endTime: existing.endTime,
            },
        });
        if (matchingTimetableSlotCount > 0) {
            throw new localization_1.LocalizedException('period_time.cannot_delete_this_period_time_because_timetable_slot_still__317dbc43', undefined, undefined, 'Cannot delete this period time because ${matchingTimetableSlotCount} timetable slot${matchingTimetableSlotCount === 1 ? \'\' : \'s\'} still use it. Move or delete those timetable slots first.');
        }
        return this.prisma.periodTime.delete({ where: { id } });
    }
};
exports.PeriodTimeService = PeriodTimeService;
exports.PeriodTimeService = PeriodTimeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PeriodTimeService);
//# sourceMappingURL=period-time.service.js.map