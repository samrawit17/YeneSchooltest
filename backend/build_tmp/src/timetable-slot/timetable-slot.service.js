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
exports.TimetableSlotService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const school_settings_service_1 = require("../school-settings/school-settings.service");
let TimetableSlotService = class TimetableSlotService {
    prisma;
    eventBus;
    constructor(prisma, eventBus) {
        this.prisma = prisma;
        this.eventBus = eventBus;
    }
    teachingWeekDays = [1, 2, 3, 4, 5];
    defaultMaxPeriodsPerDay = 7;
    buildAutoGenerateSlotKey(dayOfWeek, startTime) {
        return `${dayOfWeek}:${startTime}`;
    }
    scoreAutoGenerateCandidate(params) {
        return (params.subjectDailyUsage * 1000 +
            params.teacherDailyUsage * 100 +
            params.dayOfWeek * 10 +
            params.slotIndex);
    }
    buildAcademicYearFilter(academicYearId) {
        if (!academicYearId) {
            return {};
        }
        return {
            OR: [{ academicYearId }, { academicYearId: null }],
        };
    }
    async assertParentCanViewClassTimetable(schoolId, parentUserId, classId, sectionId) {
        const parentProfile = await this.prisma.parentProfile.findFirst({
            where: { schoolId, userId: parentUserId },
            select: { id: true },
        });
        if (!parentProfile) {
            throw new localization_1.LocalizedException('timetable_slot.parent_profile_not_found_ad089d27', undefined, common_1.HttpStatus.FORBIDDEN, 'Parent profile not found');
        }
        const linkedStudents = await this.prisma.parentStudent.findMany({
            where: {
                schoolId,
                parentId: parentProfile.id,
            },
            select: {
                studentId: true,
            },
        });
        if (linkedStudents.length === 0) {
            throw new localization_1.LocalizedException('timetable_slot.no_linked_child_found_for_this_parent_eb74c6bb', undefined, common_1.HttpStatus.FORBIDDEN, 'No linked child found for this parent');
        }
        const studentProfiles = await this.prisma.studentProfile.findMany({
            where: { id: { in: linkedStudents.map(ls => ls.studentId) }, schoolId },
            select: { userId: true },
        });
        const studentUserIds = studentProfiles.map(sp => sp.userId).filter(Boolean);
        if (studentUserIds.length === 0) {
            throw new localization_1.LocalizedException('timetable_slot.linked_child_profile_is_incomplete_0d1a6ebb', undefined, common_1.HttpStatus.FORBIDDEN, 'Linked child profile is incomplete');
        }
        const studentAssignments = await this.prisma.studentClass.findFirst({
            where: {
                schoolId,
                studentId: { in: studentUserIds },
                classId,
                ...(sectionId ? { sectionId } : {}),
            },
            select: { id: true },
        });
        if (!studentAssignments) {
            throw new localization_1.LocalizedException('timetable_slot.you_can_only_view_the_timetable_for_your_linked_child_9dd2ed6a', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only view the timetable for your linked child');
        }
    }
    async resolveTeacherTimetableTarget(schoolId, requester, targetTeacherId) {
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
        const allowedIds = new Set([requester.id, selfTeacherProfile?.id, selfTeacherProfile?.userId].filter((value) => Boolean(value)));
        if (!allowedIds.has(targetTeacherId)) {
            throw new localization_1.LocalizedException('timetable_slot.you_can_only_view_your_own_timetable_ffb6938b', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only view your own timetable');
        }
        return selfTeacherProfile?.userId || requester.id;
    }
    timesOverlap(start1, end1, start2, end2) {
        const toMinutes = (time) => {
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };
        const start1Min = toMinutes(start1);
        const end1Min = toMinutes(end1);
        const start2Min = toMinutes(start2);
        const end2Min = toMinutes(end2);
        return start1Min < end2Min && start2Min < end1Min;
    }
    async validateNoConflict(schoolId, dayOfWeek, startTime, endTime, teacherId, classId, sectionId, room, excludeSlotId, prismaClient = this.prisma) {
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
                throw new localization_1.LocalizedException('timetable_slot.teacher_is_already_scheduled_for_on_this_day_82ed1bbb', undefined, common_1.HttpStatus.CONFLICT, 'Teacher is already scheduled for ${conflict.startTime} - ${conflict.endTime} on this day');
            }
        }
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
            throw new localization_1.LocalizedException('timetable_slot.section_is_already_scheduled_for_on_this_day_be9feaf0', undefined, common_1.HttpStatus.CONFLICT, 'Section is already scheduled for ${conflict.startTime} - ${conflict.endTime} on this day');
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
                throw new localization_1.LocalizedException('timetable_slot.room_is_already_scheduled_for_on_this_day_198ddb22', undefined, common_1.HttpStatus.CONFLICT, 'Room ${room} is already scheduled for ${conflict.startTime} - ${conflict.endTime} on this day');
            }
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
    validatePeriodCapacity(periodTimes, maxPeriodsPerDay) {
        if (periodTimes.length === 0) {
            throw new localization_1.LocalizedException('timetable_slot.create_period_times_before_auto_generating_a_timetable_7566541a', undefined, undefined, 'Create period times before auto-generating a timetable');
        }
        if (periodTimes.length > maxPeriodsPerDay) {
            throw new localization_1.LocalizedException('timetable_slot.this_school_supports_a_maximum_of_periods_per_day_7ceda76d', undefined, undefined, 'This school supports a maximum of ${maxPeriodsPerDay} periods per day');
        }
    }
    validateAutoGenerationLoads(normalizedRequirements, periodTimesPerDay) {
        const weeklyCapacity = this.teachingWeekDays.length * periodTimesPerDay;
        const excessiveRequirement = normalizedRequirements.find((item) => item.periodsPerWeek > weeklyCapacity);
        if (excessiveRequirement) {
            throw new localization_1.LocalizedException('timetable_slot.a_subject_cannot_exceed_periods_per_week_for_the_configured__8436d932', undefined, undefined, 'A subject cannot exceed ${weeklyCapacity} periods per week for the configured school week');
        }
        const totalRequestedPeriods = normalizedRequirements.reduce((sum, item) => sum + item.periodsPerWeek, 0);
        if (totalRequestedPeriods > weeklyCapacity) {
            throw new localization_1.LocalizedException('timetable_slot.the_requested_weekly_load_exceeds_the_section_capacity_of_pe_f7e60181', undefined, undefined, 'The requested weekly load exceeds the section capacity of ${weeklyCapacity} periods');
        }
    }
    validateBatchConflicts(slots) {
        for (let index = 0; index < slots.length; index += 1) {
            const current = slots[index];
            for (let compareIndex = index + 1; compareIndex < slots.length; compareIndex += 1) {
                const next = slots[compareIndex];
                const sameDay = current.dayOfWeek === next.dayOfWeek;
                if (!sameDay)
                    continue;
                const overlaps = this.timesOverlap(current.startTime, current.endTime, next.startTime, next.endTime);
                if (!overlaps)
                    continue;
                if (current.classId === next.classId &&
                    current.sectionId === next.sectionId) {
                    throw new localization_1.LocalizedException('timetable_slot.section_has_overlapping_timetable_slots_in_this_batch_022096c9', undefined, common_1.HttpStatus.CONFLICT, 'Section ${current.sectionId} has overlapping timetable slots in this batch');
                }
                if (current.teacherId &&
                    next.teacherId &&
                    current.teacherId === next.teacherId) {
                    throw new localization_1.LocalizedException('timetable_slot.a_teacher_has_overlapping_timetable_slots_in_this_batch_2c142054', undefined, common_1.HttpStatus.CONFLICT, 'A teacher has overlapping timetable slots in this batch');
                }
                if (current.room &&
                    next.room &&
                    current.room === next.room) {
                    throw new localization_1.LocalizedException('timetable_slot.room_has_overlapping_timetable_slots_in_this_batch_ad6e8c39', undefined, common_1.HttpStatus.CONFLICT, 'Room ${current.room} has overlapping timetable slots in this batch');
                }
            }
        }
    }
    async create(data) {
        await this.validateNoConflict(data.schoolId, data.dayOfWeek, data.startTime, data.endTime, data.teacherId, data.classId, data.sectionId, data.room);
        const slot = await this.prisma.timetableSlot.create({
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
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        void this.eventBus.emit('timetable.created', {
            schoolId: data.schoolId,
            slotId: slot.id,
            classId: data.classId,
            sectionId: data.sectionId,
            subjectName: slot.subject?.name || 'Unknown',
            day: dayNames[data.dayOfWeek] || String(data.dayOfWeek),
            startTime: data.startTime,
            endTime: data.endTime,
            teacherId: data.teacherId,
            createdBy: 'system',
        });
        return slot;
    }
    async findAll(schoolId, filters) {
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
    async getByStudent(schoolId, studentId) {
        const enrollment = await this.prisma.studentClass.findFirst({
            where: { studentId, schoolId },
            select: { classId: true },
        });
        if (!enrollment) {
            throw new localization_1.LocalizedException('timetable_slot.student_enrollment_not_found_152abfaf', undefined, common_1.HttpStatus.NOT_FOUND, 'Student enrollment not found');
        }
        return this.findByClass(schoolId, enrollment.classId);
    }
    async findByClass(schoolId, classId) {
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
    async findByTeacher(schoolId, teacherId, academicYearId) {
        const homeroomSections = await this.prisma.section.findMany({
            where: { homeroomTeacherId: teacherId },
            select: { id: true, classId: true },
        });
        const homeroomSectionIds = homeroomSections.map(s => s.id);
        const homeroomClassIds = homeroomSections.map(s => s.classId);
        const classSubjects = await this.prisma.classSubject.findMany({
            where: { teacherId },
            select: { classId: true, sectionId: true },
        });
        const classIds = classSubjects.map(cs => cs.classId);
        const sectionIds = classSubjects.map(cs => cs.sectionId);
        const orConditions = [];
        if (teacherId)
            orConditions.push({ teacherId });
        if (homeroomSectionIds.length > 0)
            orConditions.push({ sectionId: { in: homeroomSectionIds } });
        if (homeroomClassIds.length > 0)
            orConditions.push({ classId: { in: homeroomClassIds } });
        if (classIds.length > 0 && sectionIds.length > 0)
            orConditions.push({ classId: { in: classIds }, sectionId: { in: sectionIds } });
        if (orConditions.length === 0)
            return [];
        return this.prisma.timetableSlot.findMany({
            where: {
                schoolId,
                ...(academicYearId ? { academicYearId } : {}),
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
    async findOne(id, schoolId) {
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
            throw new localization_1.LocalizedException('timetable_slot.timetable_slot_not_found_74cade9d', undefined, common_1.HttpStatus.NOT_FOUND, 'Timetable slot not found');
        }
        return slot;
    }
    async update(id, schoolId, data) {
        const existing = await this.findOne(id, schoolId);
        const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
        const startTime = data.startTime ?? existing.startTime;
        const endTime = data.endTime ?? existing.endTime;
        const teacherId = data.teacherId ?? existing.teacherId;
        const classId = data.classId ?? existing.classId;
        await this.validateNoConflict(existing.schoolId, dayOfWeek, startTime, endTime, teacherId ?? undefined, classId, data.sectionId ?? existing.sectionId, data.room ?? existing.room ?? undefined, id);
        const updated = await this.prisma.timetableSlot.update({
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
        const changedFields = Object.entries(data)
            .filter(([, v]) => v !== undefined)
            .map(([k]) => k);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        void this.eventBus.emit('timetable.updated', {
            schoolId,
            slotId: id,
            classId: existing.classId,
            sectionId: existing.sectionId,
            subjectName: updated.subject?.name || 'Unknown',
            changes: changedFields,
            updatedBy: 'system',
        });
        return updated;
    }
    async delete(id, schoolId) {
        const existing = await this.findOne(id, schoolId);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        await this.prisma.timetableSlot.delete({
            where: { id },
        });
        void this.eventBus.emit('timetable.deleted', {
            schoolId,
            slotId: id,
            classId: existing.classId,
            sectionId: existing.sectionId,
            subjectName: existing.subject?.name || 'Unknown',
            day: dayNames[existing.dayOfWeek] || String(existing.dayOfWeek),
            deletedBy: 'system',
        });
    }
    async bulkCreate(schoolId, slots) {
        this.validateBatchConflicts(slots);
        const created = await this.prisma.$transaction(async (tx) => {
            const inserted = [];
            for (const slotData of slots) {
                await this.validateNoConflict(schoolId, slotData.dayOfWeek, slotData.startTime, slotData.endTime, slotData.teacherId, slotData.classId, slotData.sectionId, slotData.room, undefined, tx);
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
    async deleteByClassSection(schoolId, classId, sectionId, academicYearId) {
        const where = {
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
    async getTimetableGrid(schoolId, classId, sectionId, academicYearId) {
        const where = {
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
        const days = [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
        ];
        const grid = {};
        for (let i = 1; i <= 7; i += 1) {
            grid[days[i - 1]] = slots.filter((s) => s.dayOfWeek === i);
        }
        return {
            days,
            grid,
            slots,
        };
    }
    async autoGenerateSectionTimetable(schoolId, payload) {
        const { classId, sectionId, academicYearId, apply = false, periodRequirements } = payload;
        if (!classId || !sectionId) {
            throw new localization_1.LocalizedException('timetable_slot.class_and_section_are_required_4b8512b8', undefined, undefined, 'Class and section are required');
        }
        if (!Array.isArray(periodRequirements) || periodRequirements.length === 0) {
            throw new localization_1.LocalizedException('timetable_slot.at_least_one_period_requirement_is_required_587314cb', undefined, undefined, 'At least one period requirement is required');
        }
        const normalizedRequirements = periodRequirements
            .map((item) => ({
            classSubjectId: item.classSubjectId,
            periodsPerWeek: Number(item.periodsPerWeek) || 0,
        }))
            .filter((item) => item.classSubjectId && item.periodsPerWeek > 0);
        if (normalizedRequirements.length === 0) {
            throw new localization_1.LocalizedException('timetable_slot.no_valid_period_requirements_were_provided_f078ff2e', undefined, undefined, 'No valid period requirements were provided');
        }
        const [periodTimes, classSubjects, existingSlots, maxPeriodsPerDay] = await Promise.all([
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
            this.getMaxPeriodsPerDay(schoolId),
        ]);
        this.validatePeriodCapacity(periodTimes, maxPeriodsPerDay);
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
            if (!classSubject)
                return null;
            return { ...item, classSubject };
        })
            .filter((item) => Boolean(item));
        const candidateSlots = this.teachingWeekDays.flatMap((dayOfWeek) => periodTimes.map((period, slotIndex) => ({
            dayOfWeek,
            startTime: period.startTime,
            endTime: period.endTime,
            periodNumber: period.periodNumber,
            slotIndex,
        })));
        const sectionSlotKeys = new Set();
        const teacherSlotKeys = new Set();
        for (const slot of existingSlots) {
            const slotKey = this.buildAutoGenerateSlotKey(slot.dayOfWeek, slot.startTime);
            const isTargetSection = slot.classId === classId && slot.sectionId === sectionId;
            if (isTargetSection && apply) {
                continue;
            }
            sectionSlotKeys.add(slotKey);
            if (slot.teacherId) {
                teacherSlotKeys.add(`${slot.teacherId}:${slotKey}`);
            }
        }
        const subjectUsageByDay = new Map();
        const teacherUsageByDay = new Map();
        const teacherSubjectUsageByDay = new Map();
        for (const slot of existingSlots) {
            const isTargetSection = slot.classId === classId && slot.sectionId === sectionId;
            if ((isTargetSection && apply) || !slot.teacherId || !slot.subjectId) {
                continue;
            }
            const teacherSubjectDailyKey = `${slot.teacherId}:${slot.subjectId}:${slot.dayOfWeek}`;
            teacherSubjectUsageByDay.set(teacherSubjectDailyKey, (teacherSubjectUsageByDay.get(teacherSubjectDailyKey) || 0) + 1);
        }
        const demands = requirements
            .flatMap((requirement) => Array.from({ length: requirement.periodsPerWeek }, () => ({
            classSubjectId: requirement.classSubjectId,
            subjectId: requirement.classSubject.subjectId,
            subjectName: requirement.classSubject.subject?.name || 'Unknown subject',
            teacherId: requirement.classSubject.teacherId || null,
            teacherName: requirement.classSubject.teacher?.name || null,
            periodsPerWeek: requirement.periodsPerWeek,
        })))
            .sort((left, right) => {
            const leftTeacherPenalty = left.teacherId ? 0 : 1;
            const rightTeacherPenalty = right.teacherId ? 0 : 1;
            if (leftTeacherPenalty !== rightTeacherPenalty) {
                return leftTeacherPenalty - rightTeacherPenalty;
            }
            return right.periodsPerWeek - left.periodsPerWeek;
        });
        const generatedSlots = [];
        const unscheduled = [...unresolvedRequirements];
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
                const slotKey = this.buildAutoGenerateSlotKey(candidate.dayOfWeek, candidate.startTime);
                const teacherSubjectDailyKey = `${demand.teacherId}:${demand.subjectId}:${candidate.dayOfWeek}`;
                return (!sectionSlotKeys.has(slotKey) &&
                    !teacherSlotKeys.has(`${demand.teacherId}:${slotKey}`) &&
                    (teacherSubjectUsageByDay.get(teacherSubjectDailyKey) || 0) === 0);
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
            const slotKey = this.buildAutoGenerateSlotKey(chosenCandidate.dayOfWeek, chosenCandidate.startTime);
            sectionSlotKeys.add(slotKey);
            teacherSlotKeys.add(`${demand.teacherId}:${slotKey}`);
            const subjectDailyKey = `${demand.subjectId}:${chosenCandidate.dayOfWeek}`;
            const teacherDailyKey = `${demand.teacherId}:${chosenCandidate.dayOfWeek}`;
            const teacherSubjectDailyKey = `${demand.teacherId}:${demand.subjectId}:${chosenCandidate.dayOfWeek}`;
            subjectUsageByDay.set(subjectDailyKey, (subjectUsageByDay.get(subjectDailyKey) || 0) + 1);
            teacherUsageByDay.set(teacherDailyKey, (teacherUsageByDay.get(teacherDailyKey) || 0) + 1);
            teacherSubjectUsageByDay.set(teacherSubjectDailyKey, (teacherSubjectUsageByDay.get(teacherSubjectDailyKey) || 0) + 1);
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
            requestedPeriods: normalizedRequirements.reduce((total, item) => total + item.periodsPerWeek, 0),
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
};
exports.TimetableSlotService = TimetableSlotService;
exports.TimetableSlotService = TimetableSlotService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], TimetableSlotService);
//# sourceMappingURL=timetable-slot.service.js.map