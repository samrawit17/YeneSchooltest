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
exports.TeacherService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
let TeacherService = class TeacherService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTeachers(schoolId, filters) {
        const andConditions = [];
        const where = {
            schoolId,
            role: 'TEACHER',
        };
        if (filters?.search) {
            andConditions.push({
                OR: [
                    { name: { contains: filters.search } },
                    { email: { contains: filters.search } },
                ],
            });
        }
        if (filters?.status === 'Active') {
            where.isActive = true;
        }
        else if (filters?.status === 'Inactive') {
            where.isActive = false;
        }
        if (filters?.classId) {
            andConditions.push({
                OR: [
                    {
                        homeroomSections: {
                            some: { classId: filters.classId },
                        },
                    },
                    {
                        teacherAssignments: {
                            some: { classId: filters.classId },
                        },
                    },
                ],
            });
        }
        if (filters?.sectionId) {
            where.homeroomSections = {
                some: {
                    id: filters.sectionId,
                },
            };
        }
        if (filters?.subject) {
            where.teacherProfile = {
                specialization: { contains: filters.subject },
            };
        }
        if (andConditions.length > 0) {
            where.AND = andConditions;
        }
        const page = Math.max(1, filters?.page || 1);
        const limit = Math.max(1, Math.min(100, filters?.limit || 10));
        const skip = (page - 1) * limit;
        const total = await this.prisma.user.count({ where });
        const teachers = await this.prisma.user.findMany({
            where,
            include: {
                teacherProfile: true,
                homeroomSections: {
                    include: {
                        class: true,
                    },
                },
                classSubjects: {
                    include: {
                        subject: true,
                    },
                },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
        const transformedTeachers = teachers.map((teacher) => {
            const subjects = [...new Set(teacher.classSubjects?.map(cs => cs.subject?.name).filter(Boolean) || [])];
            return {
                id: teacher.id,
                userId: teacher.id,
                email: teacher.email,
                name: teacher.name,
                staffId: teacher.teacherProfile?.employeeId ||
                    `TCH-${teacher.id.slice(0, 6).toUpperCase()}`,
                phone: teacher.phone || '',
                isActive: teacher.isActive,
                employmentStatus: teacher.isActive ? 'Active' : 'Inactive',
                designation: teacher.teacherProfile?.designation || 'Teacher',
                specialization: teacher.teacherProfile?.specialization || '',
                subjects: subjects,
                hireDate: teacher.teacherProfile?.hireDate,
                createdAt: teacher.createdAt,
                avatarUrl: teacher.avatarUrl || '',
                assignedClasses: teacher.homeroomSections?.map((section) => {
                    const gradeStr = section.class?.grade
                        ? `Grade ${section.class.grade}`
                        : section.class?.name || 'Unknown';
                    return `${gradeStr} - ${section.name}`;
                }) || [],
            };
        });
        return {
            data: transformedTeachers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getTeacherById(teacherId, schoolId) {
        const teacher = await this.prisma.user.findFirst({
            where: {
                id: teacherId,
                schoolId,
                role: 'TEACHER',
            },
            include: {
                teacherProfile: {
                    include: {
                        department: true,
                    },
                },
            },
        });
        if (!teacher) {
            return null;
        }
        return {
            id: teacher.id,
            userId: teacher.id,
            email: teacher.email,
            username: teacher.username,
            name: teacher.name,
            staffId: teacher.teacherProfile?.employeeId || '',
            phone: teacher.phone || '',
            isActive: teacher.isActive,
            employmentStatus: teacher.isActive ? 'Active' : 'Inactive',
            designation: teacher.teacherProfile?.designation || 'Teacher',
            specialization: teacher.teacherProfile?.specialization || '',
            hireDate: teacher.teacherProfile?.hireDate,
            department: teacher.teacherProfile?.department?.name || '',
            createdAt: teacher.createdAt,
            lastLoginAt: teacher.lastLoginAt,
            avatarUrl: teacher.avatarUrl || '',
        };
    }
    async getMyAssignments(teacherId, schoolId, academicYear) {
        const teacher = await this.prisma.user.findFirst({
            where: {
                id: teacherId,
                schoolId,
                role: 'TEACHER',
            },
            select: { id: true },
        });
        if (!teacher) {
            throw new localization_1.LocalizedException('teacher.teacher_not_found_4d6b9155', undefined, common_1.HttpStatus.NOT_FOUND, 'Teacher not found');
        }
        let resolvedAcademicYear;
        if (academicYear) {
            resolvedAcademicYear = await this.prisma.academicYear.findFirst({
                where: {
                    schoolId,
                    OR: [
                        { id: academicYear },
                        { name: academicYear },
                    ],
                },
            });
            if (!resolvedAcademicYear && academicYear) {
                return {
                    homeroomClasses: [],
                    homeroomSections: [],
                    teachingAssignments: [],
                    teachingClasses: [],
                };
            }
        }
        if (!resolvedAcademicYear && !academicYear) {
            resolvedAcademicYear = await this.prisma.academicYear.findFirst({
                where: { schoolId, isActive: true },
            });
        }
        const academicYearId = resolvedAcademicYear?.id;
        const academicYearName = resolvedAcademicYear?.name;
        const homeroomSections = await this.prisma.section.findMany({
            where: {
                homeroomTeacherId: teacherId,
                class: {
                    schoolId,
                    ...(academicYearId ? { academicYearId } : {}),
                },
            },
            select: {
                id: true,
                name: true,
                capacity: true,
                roomNumber: true,
                class: {
                    select: {
                        id: true,
                        name: true,
                        grade: true,
                    },
                },
            },
        });
        const homeroomClasses = Array.from(new Map(homeroomSections.map((s) => [s.class.id, s.class])).values());
        const classSubjects = await this.prisma.classSubject.findMany({
            where: {
                teacherId,
                class: {
                    schoolId,
                    ...(academicYearId ? { academicYearId } : {}),
                },
                ...(academicYearId ? { academicYear: academicYearId } : {}),
            },
            select: {
                id: true,
                classId: true,
                sectionId: true,
                subjectId: true,
                class: {
                    select: {
                        id: true,
                        name: true,
                        grade: true,
                        section: true,
                    },
                },
                section: {
                    select: {
                        id: true,
                        name: true,
                        roomNumber: true,
                    },
                },
                subject: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });
        const classIds = classSubjects.map(cs => cs.classId);
        const sectionIds = classSubjects.map(cs => cs.sectionId);
        const timetableSlots = await this.prisma.timetableSlot.findMany({
            where: {
                schoolId,
                ...(academicYearId ? { academicYearId } : {}),
                OR: [
                    { teacherId },
                    { classId: { in: classIds }, sectionId: { in: sectionIds } },
                ],
            },
            select: {
                id: true,
                dayOfWeek: true,
                startTime: true,
                endTime: true,
                room: true,
                class: {
                    select: {
                        id: true,
                        name: true,
                        grade: true,
                        section: true,
                    },
                },
                section: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                subject: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });
        const homeroomSectionStudentCounts = await Promise.all(homeroomSections.map(async (section) => {
            const studentCount = await this.prisma.studentClass.count({
                where: {
                    schoolId,
                    classId: section.class.id,
                    sectionId: section.id,
                    ...(academicYearName ? { academicYear: academicYearName } : {}),
                },
            });
            return {
                ...section,
                studentCount,
            };
        }));
        const classStudentCountMap = new Map();
        for (const section of homeroomSectionStudentCounts) {
            const existing = classStudentCountMap.get(section.class.id) || 0;
            classStudentCountMap.set(section.class.id, existing + section.studentCount);
        }
        const teachingAssignmentMap = new Map();
        const studentCounts = await Promise.all(classSubjects.map(async (assignment) => {
            const studentCount = await this.prisma.studentClass.count({
                where: {
                    schoolId,
                    classId: assignment.classId,
                    sectionId: assignment.sectionId,
                    ...(academicYearName ? { academicYear: academicYearName } : {}),
                },
            });
            return {
                key: `${assignment.classId}:${assignment.sectionId}:${assignment.subjectId}`,
                studentCount,
            };
        }));
        const studentCountMap = new Map(studentCounts.map((item) => [item.key, item.studentCount]));
        for (const assignment of classSubjects) {
            const key = `${assignment.classId}:${assignment.sectionId}:${assignment.subjectId}`;
            teachingAssignmentMap.set(key, {
                id: assignment.id,
                class: assignment.class,
                section: assignment.section,
                subject: assignment.subject,
                room: assignment.section?.roomNumber || null,
                schedules: [],
                studentCount: studentCountMap.get(key) || 0,
            });
        }
        const formatSchedule = (slot) => `${slot.dayOfWeek}|${slot.startTime}-${slot.endTime}`;
        for (const slot of timetableSlots) {
            const key = `${slot.class.id}:${slot.section?.id || ""}:${slot.subject?.id || ""}`;
            const existing = teachingAssignmentMap.get(key);
            if (existing) {
                existing.room = slot.room || existing.room;
                existing.schedules.push(formatSchedule(slot));
                continue;
            }
            const studentCount = slot.section?.id
                ? await this.prisma.studentClass.count({
                    where: {
                        schoolId,
                        classId: slot.class.id,
                        sectionId: slot.section.id,
                        ...(academicYearName ? { academicYear: academicYearName } : {}),
                    },
                })
                : 0;
            teachingAssignmentMap.set(key, {
                id: slot.id,
                class: slot.class,
                section: slot.section
                    ? {
                        ...slot.section,
                        roomNumber: null,
                    }
                    : null,
                subject: slot.subject,
                room: slot.room || null,
                schedules: [formatSchedule(slot)],
                studentCount,
            });
        }
        const teachingClasses = Array.from(teachingAssignmentMap.values()).map((item) => ({
            id: item.id,
            class: item.class,
            section: item.section,
            subject: item.subject,
            room: item.room,
            studentCount: item.studentCount,
            schedules: Array.from(new Set(item.schedules)).sort(),
        }));
        return {
            homeroomClasses: homeroomClasses.map((cls) => ({
                ...cls,
                studentCount: classStudentCountMap.get(cls.id) || 0,
            })),
            homeroomSections: homeroomSectionStudentCounts,
            teachingAssignments: timetableSlots,
            teachingClasses,
        };
    }
};
exports.TeacherService = TeacherService;
exports.TeacherService = TeacherService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TeacherService);
//# sourceMappingURL=teacher.service.js.map