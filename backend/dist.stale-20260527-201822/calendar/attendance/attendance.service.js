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
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const school_settings_service_1 = require("../../school-settings/school-settings.service");
const date_util_1 = require("../../common/date.util");
const role_enum_1 = require("../../auth/types/role.enum");
const notification_service_1 = require("../../notification/notification.service");
const date_utils_1 = require("./utils/date.utils");
let AttendanceService = class AttendanceService {
    prisma;
    notificationService;
    schoolSettings;
    constructor(prisma, notificationService, schoolSettings) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.schoolSettings = schoolSettings;
    }
    isAdmin(user) {
        return ((user.role === role_enum_1.Role.ADMIN || user.role === role_enum_1.Role.IT_MANAGER) ||
            user.role === role_enum_1.Role.IT_MANAGER ||
            user.role === role_enum_1.Role.SUPER_ADMIN);
    }
    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6;
    }
    isSameCalendarDay(a, b) {
        return (a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate());
    }
    async resolveParentChildStudentId(user, studentId) {
        const parentProfile = await this.prisma.parentProfile.findFirst({
            where: { userId: user.id, schoolId: user.schoolId },
            select: { id: true },
        });
        if (!parentProfile) {
            throw new common_1.NotFoundException('Parent profile not found');
        }
        const studentProfile = await this.prisma.studentProfile.findFirst({
            where: {
                schoolId: user.schoolId,
                OR: [{ id: studentId }, { userId: studentId }],
            },
            select: { id: true, userId: true },
        });
        if (!studentProfile) {
            throw new common_1.NotFoundException('Student not found');
        }
        const relation = await this.prisma.parentStudent.findFirst({
            where: {
                parentId: parentProfile.id,
                studentId: studentProfile.id,
            },
            select: { id: true },
        });
        if (!relation) {
            throw new common_1.ForbiddenException("You can only view your linked children's attendance");
        }
        return studentProfile.userId;
    }
    async resolveReadableStudentId(user, studentId) {
        if (user.role === role_enum_1.Role.STUDENT) {
            if (user.id !== studentId) {
                throw new common_1.ForbiddenException('You can only view your own attendance');
            }
            return user.id;
        }
        if (user.role === role_enum_1.Role.PARENT) {
            return this.resolveParentChildStudentId(user, studentId);
        }
        const studentProfile = await this.prisma.studentProfile.findFirst({
            where: {
                schoolId: user.schoolId,
                OR: [{ id: studentId }, { userId: studentId }],
            },
            select: { userId: true },
        });
        if (!studentProfile) {
            throw new common_1.NotFoundException('Student not found');
        }
        return studentProfile.userId;
    }
    getDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    parseDateOnlyAsLocalDay(date) {
        const [year, month, day] = date.split('-').map(Number);
        if (!year || !month || !day) {
            const fallback = new Date(date);
            fallback.setHours(0, 0, 0, 0);
            return fallback;
        }
        return new Date(year, month - 1, day);
    }
    getLocalDayRange(date) {
        const start = this.parseDateOnlyAsLocalDay(date);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    getDateInfo(date) {
        const gregorian = this.getDateString(date);
        const ethiopianDate = (0, date_utils_1.getEthiopianDate)(date);
        return {
            gregorian,
            ethiopian: (0, date_utils_1.formatEthiopianDate)(date),
            ethiopianYear: ethiopianDate.year,
            ethiopianMonth: ethiopianDate.month,
            ethiopianDay: ethiopianDate.day,
            ethiopianMonthName: ethiopianDate.monthName,
        };
    }
    parseHomeroomSlotId(slotId) {
        const parts = slotId.split('-');
        const classId = parts[1] || '';
        const sectionId = parts.length > 2 ? parts.slice(2).join('-') : undefined;
        return { classId, sectionId };
    }
    async findAcademicYearByDate(schoolId, date) {
        const coveredYear = await this.prisma.academicYear.findFirst({
            where: {
                schoolId,
                startDate: { lte: date },
                endDate: { gte: date },
            },
        });
        if (coveredYear)
            return coveredYear;
        const ethiopianYear = (0, date_utils_1.getEthiopianYear)(date);
        const ethiopianYearStr = ethiopianYear.toString();
        const matchedByName = await this.prisma.academicYear.findFirst({
            where: {
                schoolId,
                name: { contains: ethiopianYearStr },
            },
        });
        if (matchedByName)
            return matchedByName;
        return this.prisma.academicYear.findFirst({
            where: {
                schoolId,
                isActive: true,
            },
        });
    }
    async getSchoolAttendanceCutoff(schoolId) {
        const cutoffSetting = await this.schoolSettings.getSetting(schoolId, 'ATTENDANCE_CUTOFF_TIME');
        let hour = 10;
        let minute = 0;
        if (typeof cutoffSetting === 'string') {
            const [hourPart, minutePart] = cutoffSetting.split(':').map(Number);
            if (Number.isInteger(hourPart) && Number.isInteger(minutePart)) {
                hour = hourPart;
                minute = minutePart;
            }
        }
        return {
            hour,
            minute,
            formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        };
    }
    async enforceTeacherAttendanceWindow(user, attendanceDate, mode = 'edit') {
        if (this.isAdmin(user) || user.role !== role_enum_1.Role.TEACHER) {
            return {};
        }
        if (this.isWeekend(attendanceDate)) {
            throw new common_1.BadRequestException('Cannot submit attendance on weekends');
        }
        const now = new Date();
        if (!this.isSameCalendarDay(attendanceDate, now)) {
            return {};
        }
        if (mode === 'open') {
            return {};
        }
        const cutoffDisabledRaw = process.env.ATTENDANCE_CUTOFF_DISABLED ??
            process.env.DISABLE_ATTENDANCE_CUTOFF;
        if (typeof cutoffDisabledRaw === 'string' &&
            ['1', 'true', 'yes', 'on'].includes(cutoffDisabledRaw.toLowerCase())) {
            return {};
        }
        const cutoff = await this.getSchoolAttendanceCutoff(user.schoolId);
        const cutoffTime = new Date(now);
        cutoffTime.setHours(cutoff.hour, cutoff.minute, 0, 0);
        if (now > cutoffTime) {
            return { warning: `Attendance cutoff time (${cutoff.formatted}) has passed - submission recorded with late flag.` };
        }
        return {};
    }
    async getTodayTimetable(user, date) {
        const targetDate = date ? new Date(date) : new Date();
        const jsDay = targetDate.getDay();
        const dayOfWeek = jsDay === 0 ? 7 : jsDay;
        const dateInfo = this.getDateInfo(targetDate);
        if (this.isWeekend(targetDate)) {
            return { dateInfo, slots: [] };
        }
        const classLevelHomeroomClasses = await this.prisma.class.findMany({
            where: {
                homeroomTeacherId: user.id,
                academicYear: {
                    isActive: true,
                },
            },
            include: {
                sections: true,
            },
        });
        const sectionLevelHomeroom = await this.prisma.section.findMany({
            where: {
                homeroomTeacherId: user.id,
                class: {
                    academicYear: {
                        isActive: true,
                    },
                },
            },
            include: {
                class: {
                    include: {
                        sections: true,
                    },
                },
            },
        });
        const sectionLevelClassIds = new Set(sectionLevelHomeroom.map((s) => s.classId));
        const sectionLevelClasses = sectionLevelHomeroom
            .filter((s) => !classLevelHomeroomClasses.some((c) => c.id === s.classId))
            .map((section) => ({
            ...section.class,
            sections: section.class.sections,
            _sectionId: section.id,
        }));
        const homeroomClasses = [
            ...classLevelHomeroomClasses.map((cls) => ({ ...cls, _sectionId: null })),
            ...sectionLevelClasses,
        ];
        const homeroomSlots = homeroomClasses.map((cls) => {
            const firstSection = cls.sections[0];
            const slotId = cls._sectionId
                ? `homeroom-${cls.id}-${cls._sectionId}`
                : `homeroom-${cls.id}`;
            return {
                id: slotId,
                dayOfWeek,
                startTime: '08:00',
                endTime: '08:30',
                room: null,
                isHomeroom: true,
                class: {
                    id: cls.id,
                    name: cls.name,
                    grade: cls.grade,
                },
                section: {
                    id: firstSection?.id || '',
                    name: firstSection?.name || cls.section || 'A',
                },
                subject: {
                    id: 'homeroom',
                    name: 'Homeroom Attendance',
                    code: 'HR',
                },
                teacher: {
                    id: user.id,
                    name: user.name,
                },
                session: null,
            };
        });
        const dateStart = new Date(targetDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(targetDate);
        dateEnd.setHours(23, 59, 59, 999);
        const existingSessions = await this.prisma.attendanceSession.findMany({
            where: {
                classId: { in: homeroomClasses.map((cls) => cls.id) },
                date: {
                    gte: dateStart,
                    lt: dateEnd,
                },
            },
            include: {
                attendanceRecords: {
                    include: {
                        student: {
                            include: {
                                studentProfile: true,
                            },
                        },
                    },
                },
            },
        });
        const slotsWithSessions = homeroomSlots.map((slot) => {
            const { classId } = this.parseHomeroomSlotId(slot.id);
            const session = existingSessions.find((s) => s.classId === classId) || null;
            return {
                ...slot,
                session,
            };
        });
        return { dateInfo, slots: slotsWithSessions };
    }
    async getSession(sessionId, user) {
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
            include: {
                timetableSlot: {
                    include: {
                        class: true,
                        section: true,
                        subject: true,
                        teacher: {
                            select: { id: true, name: true },
                        },
                    },
                },
                attendanceRecords: {
                    include: {
                        student: {
                            include: {
                                studentProfile: true,
                            },
                        },
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Attendance session not found');
        }
        if (user) {
            if (session.schoolId !== user.schoolId) {
                throw new common_1.ForbiddenException('You do not have permission to view this session');
            }
            const isAdmin = (user.role === role_enum_1.Role.ADMIN || user.role === role_enum_1.Role.IT_MANAGER) || user.role === role_enum_1.Role.SUPER_ADMIN;
            if (!isAdmin && session.takenById !== user.id) {
                const classId = session.classId || session.timetableSlot?.classId;
                const sectionId = session.timetableSlot?.sectionId || undefined;
                const isHomeroomTeacher = classId
                    ? await this.isHomeroomTeacher(user.id, classId, sectionId || undefined)
                    : false;
                if (!isHomeroomTeacher) {
                    throw new common_1.ForbiddenException('You do not have permission to view this session');
                }
            }
        }
        const sessionDate = new Date(session.date);
        const dateInfo = this.getDateInfo(sessionDate);
        return {
            ...session,
            dateInfo,
        };
    }
    async getStudentsForAttendance(user, className, section, date, classId, sectionId) {
        const targetDate = date ? new Date(date) : new Date();
        const academicYear = await this.findAcademicYearByDate(user.schoolId, targetDate);
        if (!academicYear) {
            throw new common_1.BadRequestException('No suitable academic year found for this date');
        }
        if (classId) {
            const possibleSections = [
                section,
                section?.toUpperCase?.(),
                section?.toLowerCase?.(),
            ].filter((v) => typeof v === 'string' && v.length > 0);
            const classDataById = await this.prisma.class.findFirst({
                where: {
                    id: classId,
                    schoolId: user.schoolId,
                },
                include: {
                    sections: true,
                    academicYear: true,
                },
            });
            if (classDataById && classDataById.academicYear) {
                const classAcademicYearId = classDataById.academicYearId;
                let resolvedSectionId = sectionId || undefined;
                if (!resolvedSectionId && possibleSections.length > 0) {
                    const sectionMatch = await this.prisma.section.findFirst({
                        where: {
                            classId: classDataById.id,
                            name: { in: possibleSections },
                        },
                    });
                    resolvedSectionId = sectionMatch?.id;
                }
                const studentClassWhere = {
                    schoolId: user.schoolId,
                    classId: classDataById.id,
                };
                if (resolvedSectionId) {
                    studentClassWhere.sectionId = resolvedSectionId;
                }
                let studentClasses = await this.prisma.studentClass.findMany({
                    where: studentClassWhere,
                    include: {
                        student: {
                            include: {
                                studentProfile: true,
                            },
                        },
                    },
                });
                if (studentClasses.length === 0) {
                    const relaxedWhere = {
                        schoolId: user.schoolId,
                        classId: classDataById.id,
                    };
                    if (resolvedSectionId) {
                        relaxedWhere.sectionId = resolvedSectionId;
                    }
                    studentClasses = await this.prisma.studentClass.findMany({
                        where: relaxedWhere,
                        include: {
                            student: {
                                include: {
                                    studentProfile: true,
                                },
                            },
                        },
                    });
                }
                const studentIds = studentClasses.map((sc) => sc.studentId);
                const approvedEnrollments = studentIds.length > 0
                    ? await this.prisma.enrollment.findMany({
                        where: {
                            schoolId: user.schoolId,
                            academicYear: classAcademicYearId,
                            status: 'APPROVED',
                            studentId: { in: studentIds },
                        },
                        select: { studentId: true },
                    })
                    : [];
                const approvedStudentIds = new Set(approvedEnrollments.map((e) => e.studentId));
                const students = studentClasses
                    .filter((sc) => {
                    if (approvedStudentIds.has(sc.studentId))
                        return true;
                    return sc.student.studentProfile?.enrollmentStatus === 'APPROVED';
                })
                    .map((sc) => ({
                    id: sc.student.id,
                    userId: sc.student.id,
                    name: sc.student.name,
                    gender: sc.student.studentProfile?.gender || 'MALE',
                    studentCode: sc.student.studentProfile?.studentCode || '',
                    rollNumber: sc.student.studentProfile?.rollNumber || '',
                    className: classDataById.name,
                    section: section || '',
                }))
                    .sort((a, b) => {
                    const aRoll = parseInt(a.rollNumber) || 999;
                    const bRoll = parseInt(b.rollNumber) || 999;
                    return aRoll - bRoll || a.name.localeCompare(b.name);
                });
                if (students.length > 0) {
                    return students;
                }
            }
        }
        if (!className) {
            return [];
        }
        const possibleClassNames = [
            className,
            className.replace('Grade ', ''),
            `Grade ${className.replace('Grade ', '')}`,
        ].filter((v, i, a) => a.indexOf(v) === i);
        const possibleSections = [
            section,
            section?.toUpperCase?.(),
            section?.toLowerCase?.(),
        ].filter((v) => typeof v === 'string' && v.length > 0);
        let classData = await this.prisma.class.findFirst({
            where: {
                schoolId: user.schoolId,
                name: { in: possibleClassNames },
                OR: [
                    { section: { in: possibleSections } },
                    { sections: { some: { name: { in: possibleSections } } } },
                ],
            },
            include: {
                sections: true,
                academicYear: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        if (!classData) {
            classData = await this.prisma.class.findFirst({
                where: {
                    schoolId: user.schoolId,
                    name: { in: possibleClassNames },
                },
                include: {
                    sections: true,
                    academicYear: true,
                },
                orderBy: {
                    updatedAt: 'desc',
                },
            });
        }
        if (classData) {
            const sectionMatch = await this.prisma.section.findFirst({
                where: {
                    classId: classData.id,
                    name: { in: possibleSections },
                },
            });
            const studentClassWhere = {
                schoolId: user.schoolId,
                classId: classData.id,
            };
            if (sectionMatch) {
                studentClassWhere.sectionId = sectionMatch.id;
            }
            const studentClasses = await this.prisma.studentClass.findMany({
                where: studentClassWhere,
                include: {
                    student: {
                        include: {
                            studentProfile: true,
                        },
                    },
                },
            });
            const studentIds = studentClasses.map((sc) => sc.studentId);
            const approvedEnrollments = studentIds.length > 0
                ? await this.prisma.enrollment.findMany({
                    where: {
                        schoolId: user.schoolId,
                        academicYear: classData.academicYearId,
                        status: 'APPROVED',
                        studentId: { in: studentIds },
                    },
                    select: { studentId: true },
                })
                : [];
            const approvedStudentIds = new Set(approvedEnrollments.map((e) => e.studentId));
            const students = studentClasses
                .filter((sc) => {
                if (approvedStudentIds.has(sc.studentId))
                    return true;
                return sc.student.studentProfile?.enrollmentStatus === 'APPROVED';
            })
                .map((sc) => ({
                id: sc.student.id,
                userId: sc.student.id,
                name: sc.student.name,
                gender: sc.student.studentProfile?.gender || 'MALE',
                studentCode: sc.student.studentProfile?.studentCode || '',
                rollNumber: sc.student.studentProfile?.rollNumber || '',
                className: classData.name,
                section: section || '',
            }))
                .sort((a, b) => {
                const aRoll = parseInt(a.rollNumber) || 999;
                const bRoll = parseInt(b.rollNumber) || 999;
                return aRoll - bRoll || a.name.localeCompare(b.name);
            });
            if (students.length > 0) {
                return students;
            }
        }
        const students = await this.prisma.studentProfile.findMany({
            where: {
                schoolId: user.schoolId,
                enrollmentStatus: 'APPROVED',
                academicYear: classData?.academicYearId || academicYear.id,
                className: { in: possibleClassNames },
                section: { in: possibleSections },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { rollNumber: 'asc' },
        });
        return students.map((profile) => ({
            id: profile.userId,
            userId: profile.userId,
            name: profile.user.name,
            gender: profile.gender || 'MALE',
            studentCode: profile.studentCode,
            rollNumber: profile.rollNumber || '',
            className: profile.className || '',
            section: profile.section || '',
        }));
    }
    async openAttendanceSession(user, slotId, date) {
        const isHomeroomSlot = slotId.startsWith('homeroom-');
        let slot = null;
        let classId = null;
        let sectionId = null;
        let schoolId = user.schoolId;
        let academicYearId = null;
        let className = '';
        let sectionName = '';
        if (isHomeroomSlot) {
            const homeroomKey = slotId.slice('homeroom-'.length);
            const parseHomeroomKey = (key) => {
                if (key.includes(':')) {
                    const [cls, sect] = key.split(':', 2);
                    return { classId: cls, sectionId: sect || null };
                }
                if (key.includes('|')) {
                    const [cls, sect] = key.split('|', 2);
                    return { classId: cls, sectionId: sect || null };
                }
                if (key.includes('--')) {
                    const [cls, sect] = key.split('--', 2);
                    return { classId: cls, sectionId: sect || null };
                }
                return { classId: key, sectionId: null };
            };
            ({ classId, sectionId } = parseHomeroomKey(homeroomKey));
            const classSelect = {
                id: true,
                name: true,
                grade: true,
                section: true,
                schoolId: true,
                academicYearId: true,
                homeroomTeacherId: true,
                academicYear: true,
                sections: {
                    select: {
                        id: true,
                        name: true,
                        homeroomTeacherId: true,
                    },
                },
            };
            let classData = await this.prisma.class.findUnique({
                where: { id: classId },
                select: classSelect,
            });
            if (!classData && !sectionId) {
                const lastDash = homeroomKey.lastIndexOf('-');
                if (lastDash > 0) {
                    const candidateClassId = homeroomKey.slice(0, lastDash);
                    const candidateSectionId = homeroomKey.slice(lastDash + 1);
                    const candidateClassData = await this.prisma.class.findUnique({
                        where: { id: candidateClassId },
                        select: classSelect,
                    });
                    if (candidateClassData) {
                        classId = candidateClassId;
                        sectionId = candidateSectionId || null;
                        classData = candidateClassData;
                    }
                }
            }
            if (!classData) {
                throw new common_1.NotFoundException('Class not found');
            }
            if (!classData.academicYearId) {
                throw new common_1.BadRequestException('Academic year is not configured for this class');
            }
            const isAdmin = (user.role === role_enum_1.Role.ADMIN || user.role === role_enum_1.Role.IT_MANAGER) || user.role === role_enum_1.Role.SUPER_ADMIN;
            if (!isAdmin) {
                const isClassLevelHomeroom = classData.homeroomTeacherId === user.id;
                const isSectionLevelHomeroom = sectionId
                    ? classData.sections.some((s) => s.id === sectionId && s.homeroomTeacherId === user.id)
                    : classData.sections.some((s) => s.homeroomTeacherId === user.id);
                if (!isClassLevelHomeroom && !isSectionLevelHomeroom) {
                    const hasAnyHomeroomTeacher = !!classData.homeroomTeacherId ||
                        classData.sections.some((s) => !!s.homeroomTeacherId);
                    if (!hasAnyHomeroomTeacher) {
                        throw new common_1.ForbiddenException('No homeroom teacher assigned for this class. Please contact an administrator to assign a homeroom teacher.');
                    }
                    throw new common_1.ForbiddenException('You are not the homeroom teacher for this class');
                }
            }
            schoolId = classData.schoolId;
            academicYearId = classData.academicYearId;
            className = classData.name;
            sectionName = sectionId
                ? classData.sections.find((s) => s.id === sectionId)?.name ||
                    classData.section
                : classData.section;
        }
        else {
            slot = await this.prisma.timetableSlot.findUnique({
                where: { id: slotId },
                include: {
                    class: true,
                    section: true,
                    subject: true,
                    academicYear: true,
                },
            });
            if (!slot) {
                throw new common_1.NotFoundException('Timetable slot not found');
            }
            const isAdmin = (user.role === role_enum_1.Role.ADMIN || user.role === role_enum_1.Role.IT_MANAGER) || user.role === role_enum_1.Role.SUPER_ADMIN;
            const isHomeroomTeacher = await this.isHomeroomTeacher(user.id, slot.classId, slot.sectionId);
            if (!isAdmin && !isHomeroomTeacher) {
                throw new common_1.ForbiddenException('Only homeroom teachers can take attendance. You are not the homeroom teacher for this class.');
            }
            if (slot.academicYearId) {
                const academicYear = await this.prisma.academicYear.findUnique({
                    where: { id: slot.academicYearId },
                });
                if (!academicYear) {
                    throw new common_1.BadRequestException('Academic year is not configured');
                }
            }
            schoolId = slot.schoolId;
            academicYearId = slot.academicYearId;
            className = slot.class.name;
            sectionName = slot.section.name;
        }
        const parsedDate = date ? new Date(date) : new Date();
        parsedDate.setHours(0, 0, 0, 0);
        const existingSession = classId
            ? await this.prisma.attendanceSession.findFirst({
                where: {
                    classId,
                    date: parsedDate,
                },
                include: {
                    attendanceRecords: {
                        include: {
                            student: {
                                include: {
                                    studentProfile: true,
                                },
                            },
                        },
                    },
                },
            })
            : await this.prisma.attendanceSession.findFirst({
                where: {
                    timetableSlotId: slotId,
                    date: parsedDate,
                },
                include: {
                    attendanceRecords: {
                        include: {
                            student: {
                                include: {
                                    studentProfile: true,
                                },
                            },
                        },
                    },
                },
            });
        if (existingSession) {
            return this.getSession(existingSession.id, user);
        }
        await this.enforceTeacherAttendanceWindow(user, parsedDate, 'open');
        let session;
        try {
            session = await this.prisma.attendanceSession.create({
                data: {
                    schoolId,
                    timetableSlotId: isHomeroomSlot ? null : slotId,
                    classId: classId || null,
                    date: parsedDate,
                    status: 'NOT_SUBMITTED',
                    takenById: user.id,
                },
            });
        }
        catch (error) {
            if (error?.code === 'P2002' && classId) {
                const concurrentSession = await this.prisma.attendanceSession.findFirst({
                    where: {
                        classId,
                        date: parsedDate,
                    },
                });
                if (concurrentSession) {
                    return this.getSession(concurrentSession.id, user);
                }
            }
            throw error;
        }
        let students = [];
        if (classId && academicYearId) {
            const academicYear = await this.prisma.academicYear.findUnique({
                where: { id: academicYearId },
            });
            if (academicYear) {
                const studentClasses = await this.prisma.studentClass.findMany({
                    where: {
                        schoolId,
                        classId: classId,
                        academicYear: academicYear.name,
                    },
                    include: {
                        student: {
                            include: {
                                studentProfile: true,
                            },
                        },
                    },
                });
                students = studentClasses
                    .filter((sc) => sc.student.studentProfile?.enrollmentStatus === 'APPROVED')
                    .map((sc) => ({
                    userId: sc.student.id,
                    name: sc.student.name,
                    studentCode: sc.student.studentProfile?.studentCode || '',
                    rollNumber: sc.student.studentProfile?.rollNumber || '',
                    gender: sc.student.studentProfile?.gender || 'MALE',
                }));
            }
        }
        if (students.length === 0) {
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
            const studentProfiles = await this.prisma.studentProfile.findMany({
                where: {
                    schoolId,
                    enrollmentStatus: 'APPROVED',
                    className: { in: possibleClassNames },
                    section: { in: possibleSections },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            students = studentProfiles.map((profile) => ({
                userId: profile.userId,
                name: profile.user.name,
                studentCode: profile.studentCode,
                rollNumber: profile.rollNumber || '',
                gender: profile.gender || 'MALE',
            }));
        }
        return this.getSession(session.id, user);
    }
    async getEligibleStudents(user, sessionId) {
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
            include: {
                timetableSlot: {
                    include: {
                        class: true,
                        section: true,
                        academicYear: true,
                    },
                },
                class: {
                    include: {
                        sections: true,
                        academicYear: true,
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Attendance session not found');
        }
        let classId;
        let sectionId;
        let className;
        let sectionName;
        let academicYearName;
        if (session.classId && session.class) {
            classId = session.classId;
            className = session.class.name;
            academicYearName = session.class.academicYear?.name;
            const teacherSection = await this.prisma.section.findFirst({
                where: {
                    classId: classId,
                    homeroomTeacherId: session.takenById,
                },
            });
            if (teacherSection) {
                sectionId = teacherSection.id;
                sectionName = teacherSection.name;
            }
            else {
                sectionId = null;
                sectionName = session.class.section;
            }
        }
        else if (session.timetableSlot) {
            classId = session.timetableSlot.classId;
            sectionId = session.timetableSlot.sectionId;
            className = session.timetableSlot.class.name;
            sectionName = session.timetableSlot.section.name;
            academicYearName = session.timetableSlot.academicYear?.name;
        }
        else {
            throw new common_1.BadRequestException('Session has neither class nor timetable slot');
        }
        const sessionDate = new Date(session.date);
        if (!academicYearName) {
            const academicYear = await this.findAcademicYearByDate(session.schoolId, sessionDate);
            academicYearName = academicYear?.name;
        }
        const isHomeroomTeacher = await this.isHomeroomTeacher(user.id, classId, sectionId ?? undefined);
        if (session.takenById !== user.id && !isHomeroomTeacher) {
            throw new common_1.ForbiddenException('You do not have permission to view this session');
        }
        const studentClassWhere = {
            schoolId: session.schoolId,
            classId,
            academicYear: academicYearName,
        };
        if (sectionId) {
            studentClassWhere.sectionId = sectionId;
        }
        const studentClasses = await this.prisma.studentClass.findMany({
            where: studentClassWhere,
            include: {
                student: {
                    include: {
                        studentProfile: true,
                    },
                },
            },
        });
        let studentEntries = [];
        if (studentClasses.length > 0) {
            studentEntries = studentClasses.map((sc) => ({
                student: sc.student,
            }));
        }
        else {
            const enrollments = await this.prisma.enrollment.findMany({
                where: {
                    schoolId: session.schoolId,
                    status: 'APPROVED',
                    academicYear: academicYearName,
                    student: {
                        studentProfile: {
                            className: className,
                            ...(sectionName ? { section: sectionName } : {}),
                        },
                    },
                },
                include: {
                    student: {
                        include: {
                            studentProfile: true,
                        },
                    },
                },
            });
            studentEntries = enrollments.map((e) => ({ student: e.student }));
        }
        const existingRecords = await this.prisma.attendanceRecord.findMany({
            where: { attendanceSessionId: sessionId },
        });
        const existingRecordMap = new Map(existingRecords.map((r) => [r.studentId, r]));
        const students = studentEntries.map((entry) => {
            const student = entry.student;
            const profile = student.studentProfile;
            const existingRecord = existingRecordMap.get(student.id);
            return {
                studentId: student.id,
                studentName: student.name,
                studentCode: profile?.studentCode,
                rollNumber: profile?.rollNumber,
                status: existingRecord?.status || null,
                remark: existingRecord?.remark || null,
                recordId: existingRecord?.id || null,
            };
        });
        const dateInfo = this.getDateInfo(sessionDate);
        return { dateInfo, students };
    }
    async isHomeroomTeacher(teacherId, classId, sectionId) {
        const cls = await this.prisma.class.findFirst({
            where: {
                id: classId,
                homeroomTeacherId: teacherId,
            },
            include: {
                sections: true,
            },
        });
        if (cls) {
            if (!sectionId)
                return true;
            return cls.sections.some((s) => s.id === sectionId);
        }
        if (sectionId) {
            const section = await this.prisma.section.findFirst({
                where: {
                    id: sectionId,
                    classId: classId,
                    homeroomTeacherId: teacherId,
                },
            });
            if (section)
                return true;
        }
        else {
            const section = await this.prisma.section.findFirst({
                where: {
                    classId: classId,
                    homeroomTeacherId: teacherId,
                },
            });
            if (section)
                return true;
        }
        return false;
    }
    async bulkMarkAttendance(user, sessionId, records) {
        if (!Array.isArray(records) || records.length === 0) {
            throw new common_1.BadRequestException('At least one attendance record is required');
        }
        const duplicateStudentIds = records
            .map((record) => record.studentId)
            .filter((studentId, index, arr) => arr.indexOf(studentId) !== index);
        if (duplicateStudentIds.length > 0) {
            throw new common_1.BadRequestException(`Duplicate student IDs are not allowed: ${[...new Set(duplicateStudentIds)].join(', ')}`);
        }
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
            include: {
                timetableSlot: {
                    include: {
                        class: true,
                        section: true,
                        academicYear: true,
                    },
                },
                class: {
                    include: {
                        academicYear: true,
                    },
                },
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Attendance session not found');
        }
        if (session.status === 'SUBMITTED') {
            throw new common_1.BadRequestException('Cannot modify submitted attendance');
        }
        await this.enforceTeacherAttendanceWindow(user, new Date(session.date));
        let classId;
        let sectionId;
        let className;
        let sectionName;
        if (session.classId && session.class) {
            classId = session.classId;
            sectionId = undefined;
            className = session.class.name;
            sectionName = session.class.section || 'A';
        }
        else if (session.timetableSlot) {
            classId = session.timetableSlot.classId;
            sectionId = session.timetableSlot.sectionId ?? undefined;
            className = session.timetableSlot.class.name;
            sectionName = session.timetableSlot.section?.name || 'A';
        }
        else {
            throw new common_1.BadRequestException('Session has neither class nor timetable slot');
        }
        const isHomeroomTeacher = await this.isHomeroomTeacher(user.id, classId, sectionId);
        if (session.takenById !== user.id && !isHomeroomTeacher) {
            throw new common_1.ForbiddenException('You do not have permission to modify this session');
        }
        const studentIds = records.map((r) => r.studentId);
        let eligibleStudentIds = [];
        if (classId) {
            const academicYearName = session.class?.academicYear?.name ||
                session.timetableSlot?.academicYear?.name;
            if (academicYearName) {
                const studentClasses = await this.prisma.studentClass.findMany({
                    where: {
                        schoolId: session.schoolId,
                        classId: classId,
                        academicYear: academicYearName,
                    },
                    select: { studentId: true },
                });
                eligibleStudentIds = studentClasses.map((sc) => sc.studentId);
            }
        }
        if (eligibleStudentIds.length === 0) {
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
            const enrolledStudents = await this.prisma.studentProfile.findMany({
                where: {
                    schoolId: session.schoolId,
                    enrollmentStatus: 'APPROVED',
                    className: { in: possibleClassNames },
                    section: { in: possibleSections },
                },
                select: { userId: true },
            });
            eligibleStudentIds = enrolledStudents.map((s) => s.userId);
        }
        const existingRecords = await this.prisma.attendanceRecord.findMany({
            where: { attendanceSessionId: sessionId },
            select: { studentId: true },
        });
        const existingStudentIds = existingRecords.map((r) => r.studentId);
        const allEligibleIds = [
            ...new Set([...eligibleStudentIds, ...existingStudentIds]),
        ];
        const invalidStudents = studentIds.filter((id) => !allEligibleIds.includes(id));
        if (invalidStudents.length > 0) {
            throw new common_1.BadRequestException(`Invalid student IDs: ${invalidStudents.join(', ')}. Students must be enrolled in this class.`);
        }
        await this.prisma.attendanceRecord.deleteMany({
            where: { attendanceSessionId: sessionId },
        });
        const recordsToCreate = records.map((record) => ({
            schoolId: session.schoolId,
            attendanceSessionId: sessionId,
            studentId: record.studentId,
            status: record.status,
            remark: record.remark || null,
        }));
        await this.prisma.attendanceRecord.createMany({
            data: recordsToCreate,
        });
        return { success: true, message: 'Attendance marked successfully' };
    }
    async submitSession(user, sessionId) {
        const session = await this.prisma.attendanceSession.findUnique({
            where: { id: sessionId },
            include: {
                timetableSlot: {
                    include: {
                        class: true,
                        section: true,
                    },
                },
                class: true,
            },
        });
        if (!session) {
            throw new common_1.NotFoundException('Attendance session not found');
        }
        await this.enforceTeacherAttendanceWindow(user, new Date(session.date));
        let classId;
        let sectionId;
        if (session.classId && session.class) {
            classId = session.classId;
            sectionId = undefined;
        }
        else if (session.timetableSlot) {
            classId = session.timetableSlot.classId;
            sectionId = session.timetableSlot.sectionId ?? undefined;
        }
        else {
            throw new common_1.BadRequestException('Session has neither class nor timetable slot');
        }
        let canSubmit = false;
        if (session.takenById === user.id) {
            canSubmit = true;
        }
        else {
            const isHomeroomTeacher = await this.isHomeroomTeacher(user.id, classId, sectionId);
            if (isHomeroomTeacher) {
                canSubmit = true;
            }
        }
        if (!canSubmit) {
            throw new common_1.ForbiddenException('You do not have permission to submit this session');
        }
        if (session.status === 'SUBMITTED') {
            return session;
        }
        const recordsCount = await this.prisma.attendanceRecord.count({
            where: { attendanceSessionId: sessionId },
        });
        if (recordsCount === 0) {
            throw new common_1.BadRequestException('Cannot submit an attendance session without records');
        }
        const updatedSession = await this.prisma.attendanceSession.update({
            where: { id: sessionId },
            data: {
                status: 'SUBMITTED',
                submittedAt: new Date(),
            },
        });
        await this.sendAbsenceNotifications(sessionId, session);
        return updatedSession;
    }
    async sendAbsenceNotifications(sessionId, session) {
        try {
            const absentRecords = await this.prisma.attendanceRecord.findMany({
                where: {
                    attendanceSessionId: sessionId,
                    status: { in: ['ABSENT', 'LATE'] },
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            studentProfile: {
                                select: {
                                    id: true,
                                },
                            },
                        },
                    },
                },
            });
            if (absentRecords.length === 0)
                return;
            let className = '';
            if (session.classId && session.class) {
                className = session.class.name || `Grade ${session.class.grade}`;
            }
            else if (session.timetableSlot) {
                className =
                    session.timetableSlot.class?.name ||
                        `Grade ${session.timetableSlot.class?.grade}`;
                if (session.timetableSlot.section) {
                    className += ` - ${session.timetableSlot.section.name}`;
                }
            }
            const absentStudentUserIds = absentRecords.map((r) => r.student.id);
            const absentStudentProfiles = await this.prisma.studentProfile.findMany({
                where: { userId: { in: absentStudentUserIds } },
                select: { id: true, userId: true },
            });
            const studentProfileIdByUserId = new Map(absentStudentProfiles.map((profile) => [profile.userId, profile.id]));
            const absentStudentProfileIds = absentStudentProfiles.map((profile) => profile.id);
            const allParentRelations = await this.prisma.parentStudent.findMany({
                where: { studentId: { in: absentStudentProfileIds } },
                include: {
                    parent: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                },
                            },
                        },
                    },
                },
            });
            const parentRelationsByStudent = new Map();
            for (const relation of allParentRelations) {
                const existing = parentRelationsByStudent.get(relation.studentId) || [];
                existing.push(relation);
                parentRelationsByStudent.set(relation.studentId, existing);
            }
            const calendarType = (await this.schoolSettings.getSetting(session.schoolId, school_settings_service_1.SCHOOL_SETTING_KEYS.CALENDAR_TYPE)) || 'ETHIOPIAN';
            const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
            const dateStr = (0, date_util_1.formatSchoolDate)(sessionDate, {
                calendarType: calendarType === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN',
            });
            const notificationPromises = [];
            for (const record of absentRecords) {
                const studentName = record.student.name;
                const studentProfileId = studentProfileIdByUserId.get(record.student.id);
                if (!studentProfileId)
                    continue;
                const parents = parentRelationsByStudent.get(studentProfileId) || [];
                for (const parentRelation of parents) {
                    if (record.status === 'ABSENT') {
                        notificationPromises.push(this.notificationService.notifyParentOfAbsence(session.schoolId, parentRelation.parent.user.id, studentName, dateStr, className));
                    }
                    else if (record.status === 'LATE') {
                        notificationPromises.push(this.notificationService.notifyParentOfLate(session.schoolId, parentRelation.parent.user.id, studentName, dateStr, className));
                    }
                }
            }
            if (notificationPromises.length > 0) {
                await Promise.allSettled(notificationPromises);
            }
        }
        catch (error) {
        }
    }
    async getTodayPendingSessions(user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.prisma.attendanceSession.findMany({
            where: {
                takenById: user.id,
                date: {
                    gte: today,
                    lt: tomorrow,
                },
                status: { not: 'SUBMITTED' },
            },
            include: {
                timetableSlot: {
                    include: {
                        class: true,
                        section: true,
                        subject: true,
                    },
                },
            },
        });
    }
    async getMyAttendance(user, query) {
        const { startDate, endDate } = query;
        const whereClause = {
            studentId: user.id,
            session: {
                schoolId: user.schoolId,
            },
        };
        if (startDate || endDate) {
            whereClause.session = {
                ...whereClause.session,
                date: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                },
            };
        }
        return this.prisma.attendanceRecord.findMany({
            where: whereClause,
            include: {
                session: {
                    include: {
                        timetableSlot: {
                            include: {
                                class: true,
                                section: true,
                                subject: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                session: {
                    date: 'desc',
                },
            },
        });
    }
    async getStudentAttendanceSummary(user, studentId, startDate, endDate) {
        const resolvedStudentId = await this.resolveReadableStudentId(user, studentId);
        const whereClause = {
            studentId: resolvedStudentId,
            session: {
                schoolId: user.schoolId,
                status: 'SUBMITTED',
            },
        };
        if (startDate || endDate) {
            whereClause.session = {
                ...whereClause.session,
                date: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                },
            };
        }
        const records = await this.prisma.attendanceRecord.findMany({
            where: whereClause,
        });
        const totalDays = records.length;
        const presentDays = records.filter((r) => r.status === 'PRESENT').length;
        const absentDays = records.filter((r) => r.status === 'ABSENT').length;
        const lateDays = records.filter((r) => r.status === 'LATE').length;
        const excusedDays = records.filter((r) => r.status === 'EXCUSED').length;
        return {
            studentId: resolvedStudentId,
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            excusedDays,
            attendancePercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
        };
    }
    async getStudentAttendance(user, studentId, query) {
        const resolvedStudentId = await this.resolveReadableStudentId(user, studentId);
        const { startDate, endDate, month } = query;
        let dateFilter = {};
        if (month) {
            try {
                const [yearStr, monthStr] = month.split('-');
                const year = parseInt(yearStr);
                const monthNum = parseInt(monthStr);
                const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0);
                const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59);
                dateFilter = {
                    gte: startOfMonth,
                    lte: endOfMonth,
                };
            }
            catch (e) {
            }
        }
        else if (startDate || endDate) {
            dateFilter = {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            };
        }
        const whereClause = {
            studentId: resolvedStudentId,
            session: {
                schoolId: user.schoolId,
                status: 'SUBMITTED',
            },
        };
        if (Object.keys(dateFilter).length > 0) {
            whereClause.session = {
                ...whereClause.session,
                date: dateFilter,
            };
        }
        const records = await this.prisma.attendanceRecord.findMany({
            where: whereClause,
            include: {
                session: {
                    include: {
                        timetableSlot: {
                            include: {
                                class: true,
                                section: true,
                                subject: true,
                                teacher: {
                                    select: { id: true, name: true },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                session: {
                    date: 'desc',
                },
            },
        });
        const totalDays = records.length;
        const presentDays = records.filter((r) => r.status === 'PRESENT').length;
        const absentDays = records.filter((r) => r.status === 'ABSENT').length;
        const lateDays = records.filter((r) => r.status === 'LATE').length;
        const excusedDays = records.filter((r) => r.status === 'EXCUSED').length;
        const student = await this.prisma.user.findFirst({
            where: { id: resolvedStudentId, schoolId: user.schoolId },
            select: {
                id: true,
                name: true,
                studentProfile: {
                    select: {
                        id: true,
                        studentCode: true,
                        className: true,
                        section: true,
                    },
                },
            },
        });
        if (!student) {
            const studentProfile = await this.prisma.studentProfile.findFirst({
                where: { id: resolvedStudentId, schoolId: user.schoolId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            });
            if (studentProfile) {
                return {
                    records,
                    student: {
                        id: studentProfile.user.id,
                        name: studentProfile.user.name,
                        studentCode: studentProfile.studentCode,
                        className: studentProfile.className,
                        section: studentProfile.section,
                    },
                    summary: {
                        totalDays,
                        present: presentDays,
                        absent: absentDays,
                        late: lateDays,
                        excused: excusedDays,
                        attendancePercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
                    },
                };
            }
        }
        return {
            records,
            student: student
                ? {
                    id: student.id,
                    name: student.name,
                    studentCode: student.studentProfile?.studentCode || '',
                    className: student.studentProfile?.className || '',
                    section: student.studentProfile?.section || '',
                }
                : null,
            summary: {
                totalDays,
                present: presentDays,
                absent: absentDays,
                late: lateDays,
                excused: excusedDays,
                attendancePercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
            },
        };
    }
    async getAllSessions(user, query) {
        if (!this.isAdmin(user)) {
            throw new common_1.ForbiddenException('Only admins can view all sessions');
        }
        const { startDate, endDate, classId, status, grade, section } = query;
        let classIds;
        if (grade || section) {
            const classWhere = {
                schoolId: user.schoolId,
            };
            if (grade) {
                classWhere.grade = parseInt(grade);
            }
            if (section) {
                classWhere.section = section;
            }
            const classes = await this.prisma.class.findMany({
                where: classWhere,
                select: { id: true },
            });
            classIds = classes.map((c) => c.id);
            if (classIds.length === 0 && (grade || section)) {
                return [];
            }
        }
        const whereClause = {
            schoolId: user.schoolId,
            ...(classId && { timetableSlot: { classId } }),
            ...(classIds &&
                classIds.length > 0 && {
                OR: [
                    { timetableSlot: { classId: { in: classIds } } },
                    { classId: { in: classIds } },
                ],
            }),
            ...(status && { status: status }),
        };
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : new Date(0);
            start.setHours(0, 0, 0, 0);
            const end = endDate ? new Date(endDate) : new Date();
            end.setHours(23, 59, 59, 999);
            whereClause.date = {
                ...(startDate && { gte: start }),
                ...(endDate && { lte: end }),
            };
        }
        return this.prisma.attendanceSession.findMany({
            where: whereClause,
            include: {
                timetableSlot: {
                    include: {
                        class: true,
                        section: true,
                        subject: true,
                        teacher: {
                            select: { id: true, name: true },
                        },
                    },
                },
                class: {
                    include: {
                        sections: false,
                    },
                },
                takenBy: {
                    select: { id: true, name: true },
                },
                attendanceRecords: {
                    include: {
                        student: {
                            include: {
                                studentProfile: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });
    }
    async getSummary(user, query) {
        if (!this.isAdmin(user)) {
            throw new common_1.ForbiddenException('Only admins can view attendance summary');
        }
        const { startDate, endDate, classId } = query;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const stats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            const whereClause = {
                schoolId: user.schoolId,
                date: {
                    gte: date,
                    lt: nextDate,
                },
                ...(classId && { timetableSlot: { classId } }),
            };
            const sessions = await this.prisma.attendanceSession.findMany({
                where: whereClause,
                include: {
                    attendanceRecords: true,
                },
            });
            let totalStudents = 0;
            let presentCount = 0;
            sessions.forEach((session) => {
                totalStudents += session.attendanceRecords.length;
                presentCount += session.attendanceRecords.filter((r) => r.status === 'PRESENT').length;
            });
            stats.push({
                date: date.toISOString().split('T')[0],
                totalSessions: sessions.length,
                submittedSessions: sessions.filter((s) => s.status === 'SUBMITTED')
                    .length,
                notSubmittedSessions: sessions.filter((s) => s.status !== 'SUBMITTED')
                    .length,
                totalStudents,
                presentCount,
                attendanceRate: totalStudents > 0
                    ? Math.round((presentCount / totalStudents) * 100)
                    : 0,
            });
        }
        return stats;
    }
    async getAttendanceReport(user, query) {
        if (!this.isAdmin(user)) {
            throw new common_1.ForbiddenException('Only admins can view attendance reports');
        }
        const { classId, sectionId, date, startDate, endDate, teacherId, studentId, } = query;
        const whereClause = {};
        if (classId)
            whereClause.session = {
                ...whereClause.session,
                timetableSlot: { classId },
            };
        if (sectionId)
            whereClause.session = {
                ...whereClause.session,
                timetableSlot: { sectionId },
            };
        if (teacherId)
            whereClause.session = {
                ...whereClause.session,
                timetableSlot: { teacherId },
            };
        if (studentId)
            whereClause.studentId = studentId;
        if (date) {
            const parsedDate = new Date(date);
            whereClause.session = {
                ...whereClause.session,
                date: parsedDate,
            };
        }
        if (startDate || endDate) {
            whereClause.session = {
                ...whereClause.session,
                date: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) }),
                },
            };
        }
        if (user.schoolId) {
            whereClause.schoolId = user.schoolId;
        }
        return this.prisma.attendanceRecord.findMany({
            where: whereClause,
            include: {
                session: {
                    include: {
                        timetableSlot: {
                            include: {
                                class: true,
                                section: true,
                                subject: true,
                                teacher: {
                                    select: { id: true, name: true },
                                },
                            },
                        },
                    },
                },
                student: {
                    include: {
                        studentProfile: true,
                    },
                },
                overriddenBy: {
                    select: { id: true, name: true },
                },
            },
            orderBy: {
                session: {
                    date: 'desc',
                },
            },
        });
    }
    async overrideAttendance(user, recordId, dto) {
        if (!this.isAdmin(user)) {
            throw new common_1.ForbiddenException('Only admins can override attendance');
        }
        const record = await this.prisma.attendanceRecord.findUnique({
            where: { id: recordId },
        });
        if (!record) {
            throw new common_1.NotFoundException('Attendance record not found');
        }
        return this.prisma.attendanceRecord.update({
            where: { id: recordId },
            data: {
                status: dto.status,
                remark: dto.remark,
                originalStatus: record.status,
                overriddenById: user.id,
                overriddenAt: new Date(),
                overrideReason: dto.overrideReason,
            },
        });
    }
    async getAttendanceByDate(user, date) {
        if (!this.isAdmin(user)) {
            throw new common_1.ForbiddenException('Only admins can view attendance by date');
        }
        const parsedDate = new Date(date);
        return this.prisma.attendanceSession.findMany({
            where: {
                date: parsedDate,
                schoolId: user.schoolId,
            },
            include: {
                timetableSlot: {
                    include: {
                        class: true,
                        section: true,
                        subject: true,
                    },
                },
                attendanceRecords: {
                    include: {
                        student: {
                            include: {
                                studentProfile: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async getTeacherDashboard(user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay() || 7;
        const todaySlots = await this.prisma.timetableSlot.findMany({
            where: {
                teacherId: user.id,
                schoolId: user.schoolId,
                dayOfWeek,
                academicYear: {
                    isActive: true,
                },
            },
            include: {
                class: true,
                section: true,
                subject: true,
            },
        });
        const todaySessions = await this.prisma.attendanceSession.findMany({
            where: {
                schoolId: user.schoolId,
                takenById: user.id,
                date: today,
            },
            include: {
                timetableSlot: {
                    include: {
                        class: true,
                        section: true,
                        subject: true,
                    },
                },
                attendanceRecords: true,
            },
        });
        const pendingSlots = todaySlots.filter((slot) => !todaySessions.some((session) => session.timetableSlotId === slot.id));
        const completedSessions = todaySessions.filter((s) => s.status === 'SUBMITTED');
        const notSubmittedSessions = todaySessions.filter((s) => s.status !== 'SUBMITTED');
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weeklyRecords = await this.prisma.attendanceRecord.findMany({
            where: {
                session: {
                    schoolId: user.schoolId,
                    takenById: user.id,
                    date: {
                        gte: weekStart,
                        lt: weekEnd,
                    },
                },
            },
            include: {
                session: true,
            },
        });
        const weeklyStats = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(day.getDate() + i);
            const dayRecords = weeklyRecords.filter((r) => {
                const recordDate = new Date(r.session.date);
                return recordDate.toDateString() === day.toDateString();
            });
            const present = dayRecords.filter((r) => r.status === 'PRESENT').length;
            const total = dayRecords.length;
            weeklyStats.push({
                date: day.toISOString().split('T')[0],
                percentage: total > 0 ? Math.round((present / total) * 100) : 0,
            });
        }
        const pendingSessions = pendingSlots.map((s) => ({
            id: s.id,
            className: s.class.name,
            sectionName: s.section.name,
            subjectName: s.subject.name,
            startTime: s.startTime,
            endTime: s.endTime,
        }));
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const parseMinutes = (value) => {
            const [hourStr, minuteStr] = value.split(':');
            return Number(hourStr) * 60 + Number(minuteStr);
        };
        const todaySchedule = todaySlots.map((slot) => {
            const slotStart = parseMinutes(slot.startTime);
            const slotEnd = parseMinutes(slot.endTime);
            const session = todaySessions.find((s) => s.timetableSlotId === slot.id);
            const isCompleted = session?.status === 'SUBMITTED';
            const isCurrent = nowMinutes >= slotStart && nowMinutes <= slotEnd && !isCompleted;
            const canTakeAttendance = slot.class?.homeroomTeacherId === user.id;
            return {
                id: slot.id,
                className: slot.class.name,
                sectionName: slot.section.name,
                subjectName: slot.subject.name,
                startTime: slot.startTime,
                endTime: slot.endTime,
                room: slot.room,
                isCompleted,
                isCurrent,
                canTakeAttendance,
            };
        });
        return {
            pendingSessions,
            todaySchedule,
            completedSessions: completedSessions.length,
            notSubmittedSessions: notSubmittedSessions.length,
            weeklyStats,
        };
    }
    async getStudentDashboard(user) {
        const studentId = user.id;
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const records = await this.prisma.attendanceRecord.findMany({
            where: {
                studentId,
                session: {
                    schoolId: user.schoolId,
                    date: {
                        gte: thirtyDaysAgo,
                        lte: today,
                    },
                },
            },
            include: {
                session: {
                    include: {
                        timetableSlot: {
                            include: {
                                subject: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                session: {
                    date: 'desc',
                },
            },
        });
        const totalDays = records.length;
        const presentDays = records.filter((r) => r.status === 'PRESENT').length;
        const absentDays = records.filter((r) => r.status === 'ABSENT').length;
        const lateDays = records.filter((r) => r.status === 'LATE').length;
        const recentAbsences = records
            .filter((r) => r.status === 'ABSENT' || r.status === 'LATE')
            .slice(0, 5)
            .map((r) => ({
            date: r.session.date,
            status: r.status,
            subject: r.session.timetableSlot?.subject?.name || 'Homeroom',
        }));
        return {
            attendancePercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
            totalDays,
            presentDays,
            absentDays,
            lateDays,
            recentAbsences,
        };
    }
    async getParentDashboard(user, studentId) {
        const resolvedStudentId = await this.resolveParentChildStudentId(user, studentId);
        const parentProfile = await this.prisma.parentProfile.findFirst({
            where: { userId: user.id, schoolId: user.schoolId },
            include: {
                children: {
                    where: {
                        student: { schoolId: user.schoolId },
                    },
                    include: {
                        student: {
                            include: { user: true },
                        },
                    },
                },
            },
        });
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const records = await this.prisma.attendanceRecord.findMany({
            where: {
                studentId: resolvedStudentId,
                session: {
                    schoolId: user.schoolId,
                    date: {
                        gte: thirtyDaysAgo,
                        lte: today,
                    },
                },
            },
            include: {
                session: true,
            },
            orderBy: {
                session: {
                    date: 'desc',
                },
            },
        });
        const totalDays = records.length;
        const presentDays = records.filter((r) => r.status === 'PRESENT').length;
        const absentDays = records.filter((r) => r.status === 'ABSENT').length;
        const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
        const needsAlert = attendancePercentage < 75 && absentDays > 3;
        const childData = parentProfile?.children.find((c) => c.student.user.id === resolvedStudentId);
        return {
            studentName: childData?.student.user.name,
            attendancePercentage,
            totalDays,
            presentDays,
            absentDays,
            needsAlert,
            recentAbsences: records
                .filter((r) => r.status === 'ABSENT')
                .slice(0, 5)
                .map((r) => r.session.date),
        };
    }
    async getMissingAttendanceEntries(user, date, grade, section) {
        const { start: targetDateStart, end: targetDateEnd } = this.getLocalDayRange(date);
        const hasGradeFilter = Boolean(grade && grade !== 'all');
        const hasSectionFilter = Boolean(section && section !== 'all');
        const classes = await this.prisma.class.findMany({
            where: {
                schoolId: user.schoolId,
                ...(hasGradeFilter ? { grade: parseInt(grade, 10) } : {}),
                academicYear: {
                    isActive: true,
                },
            },
            include: {
                homeroomTeacher: true,
                sections: {
                    include: {
                        homeroomTeacher: true,
                    },
                },
            },
        });
        const targetSessions = await this.prisma.attendanceSession.findMany({
            where: {
                schoolId: user.schoolId,
                date: {
                    gte: targetDateStart,
                    lte: targetDateEnd,
                },
            },
            include: {
                timetableSlot: {
                    include: {
                        class: true,
                    },
                },
            },
        });
        const missingAttendance = [];
        for (const cls of classes) {
            const hasSubmittedSession = targetSessions.some((session) => (session.classId === cls.id ||
                session.timetableSlot?.classId === cls.id) &&
                session.status === 'SUBMITTED');
            if (hasSubmittedSession) {
                continue;
            }
            const classSections = cls.sections.length > 0
                ? cls.sections
                : [
                    {
                        name: cls.section || 'A',
                        homeroomTeacherId: null,
                        homeroomTeacher: null,
                    },
                ];
            for (const sec of classSections) {
                const sectionName = sec.name || cls.section || 'A';
                if (hasSectionFilter && sectionName !== section) {
                    continue;
                }
                missingAttendance.push({
                    classId: cls.id,
                    className: cls.name,
                    grade: cls.grade,
                    sectionName,
                    teacherId: sec.homeroomTeacherId || cls.homeroomTeacherId || null,
                    teacherName: sec.homeroomTeacher?.name || cls.homeroomTeacher?.name || undefined,
                });
            }
        }
        return missingAttendance;
    }
    async getMissingClasses(user, date, grade, section) {
        if (!this.isAdmin(user)) {
            throw new common_1.ForbiddenException('Only admins can access this endpoint');
        }
        const missingAttendance = await this.getMissingAttendanceEntries(user, date, grade, section);
        return missingAttendance.map((item) => ({
            id: item.classId,
            name: item.className,
            grade: item.grade,
            section: item.sectionName,
        }));
    }
    async notifyMissingAttendance(user, date, grade, section) {
        if (!this.isAdmin(user)) {
            throw new common_1.ForbiddenException('Only admins can access this endpoint');
        }
        const targetDateStr = this.getDateString(this.getLocalDayRange(date).start);
        const missingEntries = await this.getMissingAttendanceEntries(user, date, grade, section);
        const notifications = [];
        for (const entry of missingEntries) {
            if (!entry.teacherId || entry.grade === null) {
                continue;
            }
            const created = await this.notificationService.notifyHomeroomMissingAttendance(user.schoolId, entry.teacherId, entry.className, entry.grade, entry.sectionName, targetDateStr);
            if (created) {
                notifications.push({
                    teacherId: entry.teacherId,
                    teacherName: entry.teacherName,
                    className: entry.className,
                    grade: entry.grade,
                    section: entry.sectionName,
                });
            }
        }
        return {
            message: `Sent ${notifications.length} notifications to homeroom teachers`,
            notifications,
        };
    }
    async getAdminDashboard(user, date, startDate, endDate, grade, section, range) {
        const hasExplicitRange = Boolean(startDate && endDate);
        const targetDateStr = date || startDate || this.getDateString(new Date());
        const targetDate = this.parseDateOnlyAsLocalDay(targetDateStr);
        const { start: targetDateStart, end: targetDateEnd } = hasExplicitRange
            ? {
                start: this.getLocalDayRange(startDate).start,
                end: this.getLocalDayRange(endDate).end,
            }
            : this.getLocalDayRange(targetDateStr);
        const isToday = !hasExplicitRange && targetDateStr === this.getDateString(new Date());
        const hasGradeFilter = grade && grade !== 'all';
        const hasSectionFilter = section && section !== 'all';
        const classFilter = {};
        if (hasGradeFilter) {
            classFilter.grade = parseInt(grade);
        }
        if (hasSectionFilter) {
            classFilter.section = section;
        }
        const targetSessions = await this.prisma.attendanceSession.findMany({
            where: {
                schoolId: user.schoolId,
                date: {
                    gte: targetDateStart,
                    lte: targetDateEnd,
                },
                ...(hasGradeFilter || hasSectionFilter
                    ? {
                        OR: [
                            {
                                timetableSlot: {
                                    class: classFilter,
                                },
                            },
                            {
                                class: classFilter,
                            },
                        ],
                    }
                    : {}),
            },
            include: {
                attendanceRecords: true,
                timetableSlot: {
                    include: {
                        class: true,
                        section: true,
                        subject: true,
                    },
                },
            },
        });
        let totalStudents = 0;
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let excusedCount = 0;
        targetSessions.forEach((session) => {
            if (session.status === 'SUBMITTED') {
                totalStudents += session.attendanceRecords.length;
                session.attendanceRecords.forEach((record) => {
                    if (record.status === 'PRESENT')
                        presentCount++;
                    else if (record.status === 'ABSENT')
                        absentCount++;
                    else if (record.status === 'LATE')
                        lateCount++;
                    else if (record.status === 'EXCUSED')
                        excusedCount++;
                });
            }
        });
        const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
        const cutoff = await this.getSchoolAttendanceCutoff(user.schoolId);
        const dayOfWeek = targetDate.getDay() || 7;
        const targetSlots = await this.prisma.timetableSlot.findMany({
            where: {
                schoolId: user.schoolId,
                dayOfWeek,
                ...(hasGradeFilter ? { class: { grade: parseInt(grade) } } : {}),
                ...(hasSectionFilter ? { section: { name: section } } : {}),
                academicYear: {
                    isActive: true,
                },
            },
            include: {
                class: true,
                section: true,
                subject: true,
            },
        });
        const targetDateStrForMissing = targetDate.toISOString().split('T')[0];
        const missingAttendance = targetSlots
            .filter((slot) => {
            const hasRegularSession = targetSessions.some((session) => session.timetableSlotId === slot.id);
            const hasHomeroomSession = targetSessions.some((session) => session.classId === slot.classId &&
                session.date &&
                session.date.toISOString().split('T')[0] === targetDateStrForMissing);
            if (hasRegularSession || hasHomeroomSession)
                return false;
            const [endHour, endMinute] = slot.endTime.split(':').map(Number);
            const slotEndTime = new Date(targetDate);
            slotEndTime.setHours(endHour, endMinute, 0, 0);
            if (isToday) {
                return true;
            }
            else {
                const cutoffTime = new Date(targetDate);
                cutoffTime.setHours(cutoff.hour, cutoff.minute, 0, 0);
                return cutoffTime >= slotEndTime;
            }
        })
            .map((s) => ({
            className: s.class.name,
            sectionName: s.section.name,
            subjectName: s.subject.name,
            time: `${s.startTime} - ${s.endTime}`,
            endTime: s.endTime,
        }));
        const recentAbsences = await this.prisma.attendanceRecord.findMany({
            where: {
                schoolId: user.schoolId,
                status: 'ABSENT',
                session: {
                    date: {
                        gte: targetDateStart,
                        lte: targetDateEnd,
                    },
                    ...(hasGradeFilter || hasSectionFilter
                        ? {
                            OR: [
                                {
                                    timetableSlot: {
                                        class: classFilter,
                                    },
                                },
                                {
                                    class: classFilter,
                                },
                            ],
                        }
                        : {}),
                },
            },
            include: {
                student: {
                    include: {
                        studentProfile: true,
                    },
                },
                session: {
                    include: {
                        timetableSlot: {
                            include: {
                                class: true,
                                section: true,
                            },
                        },
                        class: true,
                    },
                },
            },
            take: 10,
        });
        const formattedAbsences = recentAbsences.map((r) => ({
            studentName: r.student.name,
            studentCode: r.student.studentProfile?.studentCode,
            className: r.session.timetableSlot?.class?.name ||
                r.session.class?.name ||
                'Unknown',
            sectionName: r.session.timetableSlot?.section?.name ||
                r.session.class?.section ||
                'Unknown',
        }));
        const statsStart = new Date(hasExplicitRange ? targetDateStart : targetDate);
        if (!hasExplicitRange && range === 'monthly') {
            statsStart.setDate(statsStart.getDate() - 30);
        }
        else if (!hasExplicitRange) {
            statsStart.setDate(statsStart.getDate() - statsStart.getDay());
        }
        const weeklySessions = await this.prisma.attendanceSession.findMany({
            where: {
                schoolId: user.schoolId,
                date: {
                    gte: statsStart,
                    lte: targetDateEnd,
                },
                ...(hasGradeFilter || hasSectionFilter
                    ? {
                        OR: [
                            {
                                timetableSlot: {
                                    class: classFilter,
                                },
                            },
                            {
                                class: classFilter,
                            },
                        ],
                    }
                    : {}),
            },
            include: {
                attendanceRecords: true,
            },
        });
        const weeklyStats = [];
        const numDays = hasExplicitRange
            ? Math.max(1, Math.floor((targetDateEnd.getTime() - targetDateStart.getTime()) /
                (1000 * 60 * 60 * 24)) + 1)
            : range === 'monthly'
                ? 30
                : 7;
        for (let i = 0; i < numDays; i++) {
            const day = new Date(statsStart);
            day.setDate(day.getDate() + i);
            const daySessions = weeklySessions.filter((s) => {
                const sessionDate = new Date(s.date);
                return sessionDate.toDateString() === day.toDateString();
            });
            let dayPresent = 0;
            let dayTotal = 0;
            daySessions.forEach((s) => {
                dayTotal += s.attendanceRecords.length;
                dayPresent += s.attendanceRecords.filter((r) => r.status === 'PRESENT').length;
            });
            weeklyStats.push({
                date: this.getDateString(day),
                attendanceRate: dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : 0,
                presentCount: dayPresent,
                totalStudentsMarked: dayTotal,
            });
        }
        return {
            todayStats: {
                totalSessions: targetSessions.length,
                submittedSessions: targetSessions.filter((s) => s.status === 'SUBMITTED').length,
                notSubmittedSessions: targetSessions.filter((s) => s.status !== 'SUBMITTED').length,
                attendanceRate,
                totalStudentsMarked: totalStudents,
                presentCount,
                absentCount,
                lateCount,
                excusedCount,
            },
            missingAttendance,
            recentAbsences: formattedAbsences,
            weeklyStats,
        };
    }
    async handleAttendanceReminder() {
        console.log('[Attendance] Running scheduled task to check for missed attendance...');
        try {
            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const currentDayOfWeek = now.getDay();
            if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
                console.log('[Attendance] Skipping - it is weekend');
                return;
            }
            const schools = await this.prisma.school.findMany({
                where: {
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                },
            });
            console.log(`[Attendance] Found ${schools.length} active schools to check`);
            for (const school of schools) {
                await this.processSchoolAttendanceReminder(school.id, school.name, now, today);
            }
            console.log('[Attendance] Completed scheduled attendance check for all schools');
        }
        catch (error) {
            console.error('[Attendance] Error in scheduled attendance check:', error);
        }
    }
    async processSchoolAttendanceReminder(schoolId, schoolName, now, today) {
        console.log(`[Attendance] Processing school: ${schoolName} (${schoolId})`);
        try {
            const activeAcademicYear = await this.prisma.academicYear.findFirst({
                where: {
                    schoolId: schoolId,
                    isActive: true,
                },
            });
            if (!activeAcademicYear) {
                console.log(`[Attendance] No active academic year found for school: ${schoolName}`);
                return;
            }
            const cutoff = await this.getSchoolAttendanceCutoff(schoolId);
            const cutoffTime = new Date(today);
            cutoffTime.setHours(cutoff.hour, cutoff.minute, 0, 0);
            if (now < cutoffTime) {
                console.log(`[Attendance] Cutoff time (${cutoff.formatted}) not reached yet for school: ${schoolName}`);
                return;
            }
            console.log(`[Attendance] Cutoff time passed for school: ${schoolName}. Checking homeroom attendance...`);
            const homeroomClasses = await this.prisma.class.findMany({
                where: {
                    schoolId: schoolId,
                    academicYearId: activeAcademicYear.id,
                },
                include: {
                    homeroomTeacher: true,
                    sections: {
                        include: {
                            homeroomTeacher: true,
                        },
                    },
                },
            });
            console.log(`[Attendance] Checking ${homeroomClasses.length} homeroom classes for school: ${schoolName}`);
            const todayStart = new Date(today);
            const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            const todayDateStr = this.getDateString(today);
            let notificationCount = 0;
            const missingClassesForAdmins = [];
            for (const cls of homeroomClasses) {
                const existingSession = await this.prisma.attendanceSession.findFirst({
                    where: {
                        schoolId: schoolId,
                        classId: cls.id,
                        date: {
                            gte: todayStart,
                            lt: todayEnd,
                        },
                        status: 'SUBMITTED',
                    },
                });
                if (!existingSession) {
                    const classSections = cls.sections.length > 0
                        ? cls.sections
                        : [
                            {
                                name: cls.section || 'A',
                                homeroomTeacherId: null,
                                homeroomTeacher: null,
                            },
                        ];
                    for (const sec of classSections) {
                        const sectionName = sec.name || cls.section || 'A';
                        const recipientTeacherId = sec.homeroomTeacherId || cls.homeroomTeacherId;
                        const recipientTeacherName = sec.homeroomTeacher?.name || cls.homeroomTeacher?.name;
                        if (!recipientTeacherId)
                            continue;
                        missingClassesForAdmins.push({
                            id: cls.id,
                            name: cls.name,
                            section: sectionName,
                        });
                        try {
                            const existingReminder = await this.prisma.notification.findFirst({
                                where: {
                                    schoolId,
                                    userId: recipientTeacherId,
                                    type: 'ATTENDANCE_SESSION_OPENED',
                                    title: 'Attendance Cutoff Reached',
                                    createdAt: {
                                        gte: todayStart,
                                        lt: todayEnd,
                                    },
                                },
                            });
                            if (existingReminder) {
                                const metadata = typeof existingReminder.metadata === 'string'
                                    ? JSON.parse(existingReminder.metadata)
                                    : existingReminder.metadata;
                                if (metadata?.classId === cls.id && metadata?.section === sectionName) {
                                    continue;
                                }
                            }
                            await this.notificationService.createNotification({
                                schoolId: schoolId,
                                userId: recipientTeacherId,
                                title: 'Attendance Cutoff Reached',
                                message: `The attendance cutoff time (${cutoff.formatted}) has passed. Please submit attendance for ${cls.name} (Section ${sectionName}) immediately.`,
                                type: 'ATTENDANCE_SESSION_OPENED',
                                actionUrl: '/teacher/attendance',
                                metadata: {
                                    classId: cls.id,
                                    section: sectionName,
                                    date: todayDateStr,
                                    isHomeroom: true,
                                    schoolId: schoolId,
                                    cutoffTime: cutoff.formatted,
                                },
                            });
                            notificationCount++;
                            console.log(`[Attendance] Sent cutoff notification to teacher ${recipientTeacherName || recipientTeacherId} for class ${cls.name} section ${sectionName}`);
                        }
                        catch (error) {
                            console.error(`[Attendance] Failed to send notification for class ${cls.name} section ${sectionName}:`, error);
                        }
                    }
                }
            }
            await this.notifyAdminsOfMissingAttendance(schoolId, todayStart, todayEnd, todayDateStr, cutoff.formatted, missingClassesForAdmins);
            console.log(`[Attendance] Sent ${notificationCount} cutoff notifications for school: ${schoolName}`);
        }
        catch (error) {
            console.error(`[Attendance] Error processing school ${schoolName}:`, error);
        }
    }
    async notifyAdminsOfMissingAttendance(schoolId, todayStart, todayEnd, date, cutoffTime, missingClasses) {
        if (missingClasses.length === 0)
            return;
        const admins = await this.prisma.user.findMany({
            where: {
                schoolId,
                role: {
                    in: [role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER],
                },
            },
            select: { id: true },
        });
        if (admins.length === 0)
            return;
        const classPreview = missingClasses
            .slice(0, 4)
            .map((c) => `${c.name} (${c.section})`)
            .join(', ');
        const message = missingClasses.length > 4
            ? `${missingClasses.length} classes missed attendance after cutoff (${cutoffTime}). Examples: ${classPreview}.`
            : `${missingClasses.length} classes missed attendance after cutoff (${cutoffTime}): ${classPreview}.`;
        for (const admin of admins) {
            const existingAdminAlert = await this.prisma.notification.findFirst({
                where: {
                    schoolId,
                    userId: admin.id,
                    title: 'Missing Attendance Alert',
                    type: 'WARNING',
                    createdAt: {
                        gte: todayStart,
                        lt: todayEnd,
                    },
                },
            });
            if (existingAdminAlert) {
                const metadata = typeof existingAdminAlert.metadata === 'string'
                    ? JSON.parse(existingAdminAlert.metadata)
                    : existingAdminAlert.metadata;
                if (metadata?.date === date) {
                    continue;
                }
            }
            await this.notificationService.createNotification({
                schoolId,
                userId: admin.id,
                title: 'Missing Attendance Alert',
                message,
                type: 'WARNING',
                actionUrl: '/admin/attendance',
                metadata: {
                    date,
                    cutoffTime,
                    missingClassCount: missingClasses.length,
                    classes: missingClasses,
                },
            });
        }
    }
};
exports.AttendanceService = AttendanceService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AttendanceService.prototype, "handleAttendanceReminder", null);
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        school_settings_service_1.SchoolSettingsService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map