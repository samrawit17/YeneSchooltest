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
exports.ClassSubjectService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
let ClassSubjectService = class ClassSubjectService {
    prisma;
    eventBus;
    constructor(prisma, eventBus) {
        this.prisma = prisma;
        this.eventBus = eventBus;
    }
    normalizeTeacherId(teacherId) {
        if (!teacherId)
            return null;
        const trimmed = teacherId.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    getNextSectionName(existingNames) {
        const usedNames = new Set(existingNames.map((name) => name.trim().toUpperCase()));
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let counter = 0;
        while (true) {
            let index = counter++;
            let candidate = '';
            do {
                candidate = alphabet[index % 26] + candidate;
                index = Math.floor(index / 26) - 1;
            } while (index >= 0);
            if (!usedNames.has(candidate.toUpperCase())) {
                return candidate;
            }
        }
    }
    async ensureAssignmentSection(tx, classId, schoolId, academicYearId) {
        const existingSection = await tx.section.findFirst({
            where: { classId },
            orderBy: { name: 'asc' },
        });
        if (existingSection)
            return existingSection;
        const existingNames = await tx.section.findMany({
            where: { classId },
            select: { name: true },
            orderBy: { name: 'asc' },
        });
        const defaultName = this.getNextSectionName(existingNames.map((section) => section.name));
        const classRecord = await tx.class.findFirst({
            where: {
                id: classId,
                schoolId,
                academicYearId,
            },
            select: {
                id: true,
                name: true,
                schoolId: true,
                academicYearId: true,
            },
        });
        if (!classRecord) {
            throw new localization_1.LocalizedException('class_subject.class_not_found_for_virtual_assignment_1a672504', undefined, common_1.HttpStatus.NOT_FOUND, 'Class not found for virtual assignment');
        }
        return tx.section.create({
            data: {
                classId,
                name: defaultName,
                capacity: 30,
            },
        });
    }
    async syncTeacherSubjectAssignment(tx, data) {
        const { classId, sectionId, subjectId, academicYearId, teacherId, schoolId, } = data;
        await tx.teacherSubjectAssignment.updateMany({
            where: {
                classId,
                sectionId,
                subjectId,
                academicYear: academicYearId,
                isActive: true,
            },
            data: { isActive: false },
        });
        if (!teacherId)
            return;
        await tx.teacherSubjectAssignment.upsert({
            where: {
                teacherId_subjectId_classId_sectionId_academicYear: {
                    teacherId,
                    subjectId,
                    classId,
                    sectionId,
                    academicYear: academicYearId,
                },
            },
            update: {
                isActive: true,
                schoolId,
            },
            create: {
                schoolId,
                teacherId,
                subjectId,
                classId,
                sectionId,
                academicYear: academicYearId,
            },
        });
    }
    async create(data, schoolId) {
        const normalizedTeacherId = this.normalizeTeacherId(data.teacherId);
        const existing = await this.prisma.classSubject.findFirst({
            where: {
                classId: data.classId,
                sectionId: data.sectionId,
                subjectId: data.subjectId,
                academicYear: data.academicYearId,
            },
        });
        if (existing) {
            throw new localization_1.LocalizedException('class_subject.this_subject_is_already_assigned_to_this_class_section_for_t_d4cb3abd', undefined, common_1.HttpStatus.CONFLICT, 'This subject is already assigned to this class/section for the academic year');
        }
        return this.prisma.$transaction(async (tx) => {
            const classData = await tx.class.findFirst({
                where: { id: data.classId, schoolId },
                select: { schoolId: true },
            });
            if (!classData) {
                throw new localization_1.LocalizedException('class_subject.class_not_found_7fd09a97', undefined, common_1.HttpStatus.NOT_FOUND, 'Class not found');
            }
            const created = await tx.classSubject.create({
                data: {
                    classId: data.classId,
                    sectionId: data.sectionId,
                    subjectId: data.subjectId,
                    academicYear: data.academicYearId,
                    teacherId: normalizedTeacherId,
                },
                include: {
                    class: true,
                    section: true,
                    subject: true,
                    teacher: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            await this.syncTeacherSubjectAssignment(tx, {
                classId: data.classId,
                sectionId: data.sectionId,
                subjectId: data.subjectId,
                academicYearId: data.academicYearId,
                teacherId: normalizedTeacherId,
                schoolId: classData.schoolId,
            });
            if (normalizedTeacherId) {
                void this.eventBus.emit('teacher.assigned', {
                    schoolId: classData.schoolId,
                    teacherId: normalizedTeacherId,
                    teacherName: created.teacher?.name || 'Unknown',
                    classId: data.classId,
                    className: created.class?.name,
                    subjectId: data.subjectId,
                    subjectName: created.subject?.name,
                    role: 'subject',
                    assignedBy: 'system',
                });
            }
            return created;
        });
    }
    async findAll(schoolId, academicYearId) {
        return this.prisma.classSubject.findMany({
            where: {
                class: { schoolId },
                ...(academicYearId && { academicYear: academicYearId }),
            },
            include: {
                class: true,
                section: true,
                subject: true,
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { class: { name: 'asc' } },
                { section: { name: 'asc' } },
                { subject: { name: 'asc' } },
            ],
        });
    }
    async findByClass(classId, schoolId, sectionId) {
        return this.prisma.classSubject.findMany({
            where: {
                classId,
                class: { schoolId },
                ...(sectionId && { sectionId }),
            },
            include: {
                section: true,
                subject: true,
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { section: { name: 'asc' } },
        });
    }
    async findByTeacher(teacherId, schoolId, academicYearId) {
        const classSubjects = await this.prisma.classSubject.findMany({
            where: {
                teacherId,
                class: { schoolId },
                ...(academicYearId && { academicYear: academicYearId }),
            },
            include: {
                class: true,
                section: true,
                subject: true,
                academicYearRelation: true,
            },
            orderBy: [{ class: { name: 'asc' } }, { section: { name: 'asc' } }],
        });
        const classSubjectsWithCounts = await Promise.all(classSubjects.map(async (cs) => {
            const className = cs.class?.name || '';
            const sectionName = cs.section?.name || '';
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
            const orConditions = possibleClassNames.flatMap((cn) => possibleSections.map((sn) => ({
                className: cn,
                section: sn,
            })));
            const studentCount = await this.prisma.studentProfile.count({
                where: {
                    schoolId,
                    OR: orConditions,
                },
            });
            return {
                ...cs,
                _count: {
                    students: studentCount,
                },
            };
        }));
        return classSubjectsWithCounts;
    }
    async findOne(id, schoolId) {
        const classSubject = await this.prisma.classSubject.findFirst({
            where: { id, class: { schoolId } },
            include: {
                class: true,
                section: true,
                subject: true,
                teacher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!classSubject) {
            throw new localization_1.LocalizedException('class_subject.class_subject_assignment_not_found_ad6ba707', undefined, common_1.HttpStatus.NOT_FOUND, 'Class subject assignment not found');
        }
        return classSubject;
    }
    async update(id, data, schoolId) {
        const assignment = await this.findOne(id, schoolId);
        const normalizedTeacherId = this.normalizeTeacherId(data.teacherId);
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.classSubject.update({
                where: { id },
                data: {
                    ...data,
                    ...(data.teacherId !== undefined && {
                        teacherId: normalizedTeacherId,
                    }),
                },
                include: {
                    class: true,
                    section: true,
                    subject: true,
                    teacher: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            if (data.teacherId !== undefined) {
                await this.syncTeacherSubjectAssignment(tx, {
                    classId: assignment.classId,
                    sectionId: assignment.sectionId,
                    subjectId: assignment.subjectId,
                    academicYearId: assignment.academicYear,
                    teacherId: normalizedTeacherId,
                    schoolId: assignment.class.schoolId,
                });
                if (normalizedTeacherId) {
                    void this.eventBus.emit('teacher.assigned', {
                        schoolId: assignment.class.schoolId,
                        teacherId: normalizedTeacherId,
                        teacherName: updated.teacher?.name || 'Unknown',
                        classId: assignment.classId,
                        className: updated.class?.name,
                        subjectId: assignment.subjectId,
                        subjectName: updated.subject?.name,
                        role: 'subject',
                        assignedBy: 'system',
                    });
                }
                else {
                    void this.eventBus.emit('teacher.unassigned', {
                        schoolId: assignment.class.schoolId,
                        teacherId: assignment.teacherId || '',
                        teacherName: 'Unknown',
                        classId: assignment.classId,
                        className: updated.class?.name,
                        subjectId: assignment.subjectId,
                        subjectName: updated.subject?.name,
                        role: 'subject',
                        unassignedBy: 'system',
                    });
                }
            }
            return updated;
        });
    }
    async delete(id, schoolId) {
        await this.findOne(id, schoolId);
        return this.prisma.classSubject.delete({
            where: { id },
        });
    }
    async bulkAssign(data, schoolId) {
        const { sectionIds, subjectIds, teacherId, academicYearId, classId } = data;
        const normalizedTeacherId = this.normalizeTeacherId(teacherId);
        const realSectionIds = sectionIds.filter((id) => !id.startsWith('virtual-'));
        const virtualClassIds = sectionIds
            .filter((id) => id.startsWith('virtual-'))
            .map((id) => id.replace('virtual-', ''));
        if (classId &&
            virtualClassIds.length > 0 &&
            !virtualClassIds.includes(classId)) {
            throw new localization_1.LocalizedException('class_subject.invalid_virtual_section_selection_d0a6e1b8', undefined, undefined, 'Invalid virtual section selection');
        }
        return this.prisma.$transaction(async (tx) => {
            const results = [];
            const sections = realSectionIds.length > 0
                ? await tx.section.findMany({
                    where: {
                        id: { in: realSectionIds },
                        class: { schoolId },
                    },
                    include: {
                        class: {
                            select: {
                                id: true,
                                schoolId: true,
                                academicYearId: true,
                            },
                        },
                    },
                })
                : [];
            if (sections.length !== realSectionIds.length) {
                throw new localization_1.LocalizedException('class_subject.one_or_more_selected_sections_were_not_found_1eab6e3e', undefined, common_1.HttpStatus.NOT_FOUND, 'One or more selected sections were not found');
            }
            const sectionMap = new Map(sections.map((s) => [s.id, s]));
            const virtualClassMap = virtualClassIds.length > 0
                ? new Map((await tx.class.findMany({
                    where: {
                        id: { in: virtualClassIds },
                        schoolId,
                        academicYearId,
                    },
                    select: {
                        id: true,
                        schoolId: true,
                        academicYearId: true,
                        name: true,
                    },
                })).map((cls) => [cls.id, cls]))
                : new Map();
            if (virtualClassIds.length !== virtualClassMap.size) {
                throw new localization_1.LocalizedException('class_subject.one_or_more_selected_classes_were_not_found_16ba3aec', undefined, common_1.HttpStatus.NOT_FOUND, 'One or more selected classes were not found');
            }
            for (const sectionId of realSectionIds) {
                const section = sectionMap.get(sectionId);
                if (!section) {
                    throw new localization_1.LocalizedException('class_subject.section_not_found_e889c28c', undefined, common_1.HttpStatus.NOT_FOUND, 'Section ${sectionId} not found');
                }
                if (classId && section.classId !== classId) {
                    throw new localization_1.LocalizedException('class_subject.section_does_not_belong_to_the_selected_class_2fea130a', undefined, undefined, 'Section ${section.name} does not belong to the selected class');
                }
                if (section.class.academicYearId !== academicYearId) {
                    throw new localization_1.LocalizedException('class_subject.section_belongs_to_a_different_academic_year_9ee9365f', undefined, undefined, 'Section ${section.name} belongs to a different academic year');
                }
                for (const subjectId of subjectIds) {
                    const assignment = await tx.classSubject.upsert({
                        where: {
                            classId_sectionId_subjectId_academicYear: {
                                classId: section.classId,
                                sectionId,
                                subjectId,
                                academicYear: academicYearId,
                            },
                        },
                        update: {
                            teacherId: normalizedTeacherId,
                        },
                        create: {
                            classId: section.classId,
                            sectionId,
                            subjectId,
                            teacherId: normalizedTeacherId,
                            academicYear: academicYearId,
                        },
                    });
                    await this.syncTeacherSubjectAssignment(tx, {
                        classId: section.classId,
                        sectionId,
                        subjectId,
                        academicYearId,
                        teacherId: normalizedTeacherId,
                        schoolId: section.class.schoolId,
                    });
                    results.push(assignment);
                }
            }
            for (const virtualClassId of virtualClassIds) {
                const classRecord = virtualClassMap.get(virtualClassId);
                if (!classRecord) {
                    throw new localization_1.LocalizedException('class_subject.class_not_found_4a3f1369', undefined, common_1.HttpStatus.NOT_FOUND, 'Class ${virtualClassId} not found');
                }
                if (classId && classRecord.id !== classId) {
                    throw new localization_1.LocalizedException('class_subject.class_does_not_match_the_selected_class_6b1158f9', undefined, undefined, 'Class ${classRecord.name} does not match the selected class');
                }
                const backingSection = await this.ensureAssignmentSection(tx, classRecord.id, classRecord.schoolId, academicYearId);
                for (const subjectId of subjectIds) {
                    const assignment = await tx.classSubject.upsert({
                        where: {
                            classId_sectionId_subjectId_academicYear: {
                                classId: classRecord.id,
                                sectionId: backingSection.id,
                                subjectId,
                                academicYear: academicYearId,
                            },
                        },
                        update: {
                            teacherId: normalizedTeacherId,
                        },
                        create: {
                            classId: classRecord.id,
                            sectionId: backingSection.id,
                            subjectId,
                            teacherId: normalizedTeacherId,
                            academicYear: academicYearId,
                        },
                    });
                    await this.syncTeacherSubjectAssignment(tx, {
                        classId: classRecord.id,
                        sectionId: backingSection.id,
                        subjectId,
                        academicYearId,
                        teacherId: normalizedTeacherId,
                        schoolId: classRecord.schoolId,
                    });
                    results.push(assignment);
                }
            }
            return {
                success: true,
                count: results.length,
                message: `Successfully assigned teacher to ${results.length} subject-section combinations`,
            };
        });
    }
    async getMatrixData(schoolId, academicYearId) {
        const gradeLevels = await this.prisma.gradeLevel.findMany({
            where: { schoolId },
            select: { id: true, level: true },
        });
        const allowedGradeIds = gradeLevels.map((grade) => grade.id);
        const allowedGradeNumbers = gradeLevels.map((grade) => grade.level);
        const gradeFilter = gradeLevels.length > 0
            ? {
                OR: [
                    { gradeId: { in: allowedGradeIds } },
                    { grade: { in: allowedGradeNumbers } },
                ],
            }
            : {};
        const sections = await this.prisma.section.findMany({
            where: {
                class: {
                    schoolId,
                    academicYearId,
                    ...gradeFilter,
                },
            },
            include: {
                class: true,
                homeroomTeacher: {
                    select: { id: true, name: true },
                },
            },
            orderBy: [{ class: { grade: 'asc' } }, { name: 'asc' }],
        });
        const classes = await this.prisma.class.findMany({
            where: {
                schoolId,
                academicYearId,
                ...gradeFilter,
            },
            include: {
                homeroomTeacher: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { grade: 'asc' },
        });
        const classesWithoutSections = classes.filter((cls) => !sections.some((sec) => sec.classId === cls.id));
        const virtualSections = classesWithoutSections.map((cls) => ({
            id: `virtual-${cls.id}`,
            name: cls.name || '',
            class: cls,
            classId: cls.id,
            capacity: 0,
            roomNumber: null,
            homeroomTeacher: null,
            isVirtual: true,
        }));
        const allSections = [...sections, ...virtualSections];
        const subjects = await this.prisma.subject.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' },
        });
        const assignments = await this.prisma.classSubject.findMany({
            where: {
                class: {
                    schoolId,
                    academicYearId,
                    ...gradeFilter,
                },
            },
            include: {
                teacher: {
                    select: { id: true, name: true },
                },
            },
        });
        return {
            sections: allSections,
            subjects,
            assignments,
        };
    }
};
exports.ClassSubjectService = ClassSubjectService;
exports.ClassSubjectService = ClassSubjectService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], ClassSubjectService);
//# sourceMappingURL=class-subject.service.js.map