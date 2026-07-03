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
exports.ClassService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const role_enum_1 = require("../auth/types/role.enum");
let ClassService = class ClassService {
    prisma;
    eventBus;
    constructor(prisma, eventBus) {
        this.prisma = prisma;
        this.eventBus = eventBus;
    }
    async assertAcademicYearBelongsToSchool(schoolId, academicYearId) {
        if (!academicYearId) {
            throw new localization_1.LocalizedException('class.academic_year_is_required_1bde6487', undefined, undefined, 'Academic year is required');
        }
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { id: academicYearId, schoolId },
            select: { id: true, endDate: true, name: true },
        });
        if (!academicYear) {
            throw new localization_1.LocalizedException('class.academic_year_not_found_for_this_school_bdabd329', undefined, undefined, 'Academic year not found for this school');
        }
        if (new Date(academicYear.endDate) < new Date()) {
            throw new localization_1.LocalizedException('class.cannot_modify_classes_for_academic_year_because_it_has_ended_7c207759', undefined, undefined, 'Cannot modify classes for academic year "${academicYear.name}" because it has ended.');
        }
    }
    async create(data) {
        await this.assertAcademicYearBelongsToSchool(data.schoolId, data.academicYearId);
        const existingClass = await this.prisma.class.findFirst({
            where: {
                schoolId: data.schoolId,
                academicYearId: data.academicYearId,
                name: data.name || `Grade ${data.grade}`,
                section: data.section,
            },
        });
        if (existingClass) {
            throw new localization_1.LocalizedException('class.class_for_grade_section_in_academic_year_already_exists_d9e8007c', undefined, common_1.HttpStatus.CONFLICT, 'Class for grade ${data.grade} section ${data.section} in academic year already exists');
        }
        const created = await this.prisma.class.create({
            data: {
                schoolId: data.schoolId,
                academicYearId: data.academicYearId,
                grade: data.grade,
                section: data.section,
                name: data.name || `Grade ${data.grade}`,
            },
        });
        void this.eventBus.emit('class.created', {
            schoolId: data.schoolId,
            classId: created.id,
            name: created.name,
            grade: created.grade,
            section: created.section,
            academicYearId: data.academicYearId,
            createdBy: 'system',
        });
        return created;
    }
    async findAll(schoolId, academicYearId) {
        return this.prisma.class.findMany({
            where: {
                schoolId,
                ...(academicYearId && { academicYearId }),
            },
            select: {
                id: true,
                schoolId: true,
                academicYearId: true,
                name: true,
                grade: true,
                section: true,
                academicYear: true,
                homeroomTeacher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                sections: {
                    orderBy: { name: 'asc' },
                    include: {
                        homeroomTeacher: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { grade: 'asc' },
        });
    }
    async findOne(id, schoolId) {
        const classData = await this.prisma.class.findFirst({
            where: { id, schoolId },
            include: {
                sections: {
                    orderBy: { name: 'asc' },
                    include: {
                        homeroomTeacher: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                school: true,
                homeroomTeacher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        if (!classData) {
            throw new localization_1.LocalizedException('class.class_not_found_7fd09a97', undefined, common_1.HttpStatus.NOT_FOUND, 'Class not found');
        }
        return classData;
    }
    async findByGradeAndYear(schoolId, academicYearId, grade) {
        return this.prisma.class.findFirst({
            where: {
                schoolId,
                academicYearId,
                grade,
            },
            include: {
                sections: {
                    orderBy: { name: 'asc' },
                },
            },
        });
    }
    async update(id, schoolId, data) {
        const currentClass = await this.findOne(id, schoolId);
        if (data.academicYearId !== undefined) {
            await this.assertAcademicYearBelongsToSchool(schoolId, data.academicYearId);
        }
        if (data.academicYearId !== undefined ||
            data.name !== undefined ||
            data.section !== undefined) {
            const existingClass = await this.prisma.class.findFirst({
                where: {
                    id: { not: id },
                    schoolId,
                    academicYearId: data.academicYearId ?? currentClass.academicYearId,
                    name: data.name ?? currentClass.name,
                    section: data.section ?? currentClass.section,
                },
            });
            if (existingClass) {
                throw new localization_1.LocalizedException('class.class_section_already_exists_in_this_academic_year_a243d528', undefined, common_1.HttpStatus.CONFLICT, 'Class ${data.name ?? currentClass.name} section ${data.section ?? currentClass.section} already exists in this academic year');
            }
        }
        if (data.homeroomTeacherId) {
            const teacher = await this.prisma.user.findUnique({
                where: { id: data.homeroomTeacherId },
            });
            if (!teacher || teacher.schoolId !== schoolId) {
                throw new localization_1.LocalizedException('class.teacher_not_found_4d6b9155', undefined, common_1.HttpStatus.NOT_FOUND, 'Teacher not found');
            }
            if (teacher.role !== role_enum_1.Role.TEACHER) {
                throw new localization_1.LocalizedException('class.the_selected_user_must_be_a_teacher_to_be_assigned_as_homero_e35708e1', undefined, undefined, 'The selected user must be a teacher to be assigned as homeroom teacher');
            }
        }
        const updateData = {};
        if (data.academicYearId !== undefined)
            updateData.academicYearId = data.academicYearId;
        if (data.grade !== undefined)
            updateData.grade = data.grade;
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.section !== undefined)
            updateData.section = data.section;
        if (data.homeroomTeacherId !== undefined)
            updateData.homeroomTeacherId = data.homeroomTeacherId || null;
        const updatedClass = await this.prisma.class.update({
            where: { id },
            data: updateData,
            include: {
                sections: {
                    include: {
                        homeroomTeacher: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        const changedFields = Object.keys(updateData);
        void this.eventBus.emit('class.updated', {
            schoolId,
            classId: id,
            name: updatedClass.name,
            grade: updatedClass.grade,
            section: updatedClass.section,
            changes: changedFields,
            updatedBy: 'system',
        });
        return updatedClass;
    }
    async delete(id, schoolId) {
        const classData = await this.findOne(id, schoolId);
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { id: classData.academicYearId, schoolId },
            select: { endDate: true, name: true },
        });
        if (academicYear && new Date(academicYear.endDate) < new Date()) {
            throw new localization_1.LocalizedException('class.cannot_delete_classes_for_academic_year_because_it_has_ended_973450df', undefined, undefined, 'Cannot delete classes for academic year "${academicYear.name}" because it has ended.');
        }
        const deleted = await this.prisma.class.delete({
            where: { id },
        });
        void this.eventBus.emit('class.deleted', {
            schoolId,
            classId: id,
            name: classData.name,
            grade: classData.grade,
            section: classData.section,
            deletedBy: 'system',
        });
        return deleted;
    }
    async getOrCreate(schoolId, academicYearId, grade, section) {
        let classData = await this.findByGradeAndYear(schoolId, academicYearId, grade);
        if (!classData) {
            const created = await this.create({
                schoolId,
                academicYearId,
                grade,
                section,
            });
            classData = {
                ...created,
                sections: [],
                school: undefined,
                academicYear: undefined,
            };
        }
        return classData;
    }
    async getGrades(schoolId) {
        if (schoolId) {
            const classes = await this.prisma.class.findMany({
                where: { schoolId },
                select: { grade: true },
                distinct: ['grade'],
            });
            return classes
                .map((c) => c.grade)
                .filter((g) => g !== null)
                .sort((a, b) => a - b);
        }
        else {
            return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        }
    }
    async search(schoolId, query, academicYearId) {
        const searchTerm = query.toLowerCase();
        const gradeNum = parseInt(query);
        return this.prisma.class.findMany({
            where: {
                schoolId,
                ...(academicYearId && { academicYearId }),
                OR: [
                    { name: { contains: searchTerm } },
                    { grade: !isNaN(gradeNum) ? gradeNum : undefined },
                    { section: { contains: searchTerm } },
                ],
            },
            select: {
                id: true,
                schoolId: true,
                academicYearId: true,
                name: true,
                grade: true,
                section: true,
                academicYear: true,
                homeroomTeacher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                sections: {
                    orderBy: { name: 'asc' },
                    include: {
                        homeroomTeacher: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { grade: 'asc' },
            take: 50,
        });
    }
    async getStudentsByClass(schoolId, classId, sectionId, search, pagination, requester) {
        const classData = await this.findOne(classId, schoolId);
        const teacherScope = requester?.role === role_enum_1.Role.TEACHER
            ? await this.resolveTeacherClassStudentScope(schoolId, classId, requester.id, sectionId, classData)
            : null;
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const skip = (page - 1) * limit;
        const orderByField = pagination?.orderBy || 'name';
        const where = { schoolId, classId };
        if (sectionId) {
            where.sectionId = sectionId;
        }
        else if (teacherScope?.sectionIds?.length) {
            where.sectionId = { in: teacherScope.sectionIds };
        }
        const studentClassCount = await this.prisma.studentClass.count({ where });
        let students = [];
        let total = 0;
        if (studentClassCount > 0) {
            total = studentClassCount;
            const studentClasses = await this.prisma.studentClass.findMany({
                where,
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            avatarUrl: true,
                            studentProfile: {
                                select: {
                                    studentCode: true,
                                    academicYear: true,
                                    rollNumber: true,
                                    gender: true,
                                    stream: true,
                                    parents: {
                                        take: 1,
                                        select: {
                                            parent: {
                                                select: {
                                                    user: {
                                                        select: {
                                                            name: true,
                                                            phone: true,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    section: {
                        select: {
                            id: true,
                            name: true,
                            stream: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: orderByField === 'rollNumber'
                    ? [
                        { student: { studentProfile: { rollNumber: 'asc' } } },
                        { student: { name: 'asc' } },
                    ]
                    : { student: { name: 'asc' } },
            });
            students = studentClasses.map((sc) => ({
                id: sc.student.id,
                name: sc.student.name,
                email: sc.student.email,
                phone: sc.student.phone,
                gender: sc.student.studentProfile?.gender,
                avatarUrl: sc.student.avatarUrl,
                studentCode: sc.student.studentProfile?.studentCode,
                academicYear: sc.student.studentProfile?.academicYear,
                rollNumber: sc.student.studentProfile?.rollNumber,
                stream: sc.student.studentProfile?.stream || sc.section?.stream || null,
                parentName: sc.student.studentProfile?.parents?.[0]?.parent?.user?.name || null,
                parentPhone: sc.student.studentProfile?.parents?.[0]?.parent?.user?.phone || null,
                section: sc.section,
            }));
        }
        else {
            const className = classData.name || '';
            const scopedSections = teacherScope?.sectionIds?.length
                ? classData.sections.filter((section) => teacherScope.sectionIds.includes(section.id))
                : sectionId
                    ? classData.sections.filter((section) => section.id === sectionId)
                    : [];
            const sectionName = scopedSections[0]?.name || classData.section || '';
            const possibleClassNames = [
                className,
                className.replace('Grade ', ''),
                `Grade ${className.replace('Grade ', '')}`,
            ].filter((v, i, a) => a.indexOf(v) === i);
            const sectionNames = scopedSections.length
                ? scopedSections.map((section) => section.name).filter(Boolean)
                : sectionName
                    ? [sectionName]
                    : [];
            const orConditions = possibleClassNames.flatMap((cn) => {
                if (sectionNames.length) {
                    return sectionNames.flatMap((name) => [
                        { className: cn, section: name },
                        { className: cn, section: name.toUpperCase() },
                        { className: cn, section: name.toLowerCase() },
                    ]);
                }
                return [{ className: cn }];
            });
            total = await this.prisma.studentProfile.count({
                where: { schoolId, OR: orConditions },
            });
            const studentProfiles = await this.prisma.studentProfile.findMany({
                where: { schoolId, OR: orConditions },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            avatarUrl: true,
                        },
                    },
                    parents: {
                        take: 1,
                        select: {
                            parent: {
                                select: {
                                    user: {
                                        select: {
                                            name: true,
                                            phone: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: orderByField === 'rollNumber'
                    ? [{ rollNumber: 'asc' }, { user: { name: 'asc' } }]
                    : { user: { name: 'asc' } },
            });
            students = studentProfiles.map((sp) => ({
                id: sp.user.id,
                name: sp.user.name,
                email: sp.user.email,
                phone: sp.user.phone || sp.phone,
                gender: sp.gender,
                avatarUrl: sp.user.avatarUrl,
                studentCode: sp.studentCode,
                academicYear: sp.academicYear,
                rollNumber: sp.rollNumber,
                stream: sp.stream || null,
                parentName: sp.parents?.[0]?.parent?.user?.name || null,
                parentPhone: sp.parents?.[0]?.parent?.user?.phone || null,
                section: {
                    id: sectionId || '',
                    name: sp.section || sectionName,
                },
            }));
        }
        if (search) {
            const searchLower = search.toLowerCase();
            students = students.filter((s) => s.name?.toLowerCase().includes(searchLower) ||
                s.email?.toLowerCase().includes(searchLower) ||
                s.studentCode?.toLowerCase().includes(searchLower) ||
                s.rollNumber?.toLowerCase().includes(searchLower));
        }
        return {
            class: {
                id: classData.id,
                name: classData.name,
                grade: classData.grade,
                section: sectionId
                    ? classData.sections.find((section) => section.id === sectionId)
                        ?.name || classData.section
                    : classData.section,
                homeroomTeacherId: classData.homeroomTeacher?.id || null,
                sectionHomeroomTeacherId: (sectionId
                    ? classData.sections.find((section) => section.id === sectionId)
                        ?.homeroomTeacher?.id
                    : null) || null,
            },
            students,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async resolveTeacherClassStudentScope(schoolId, classId, teacherId, sectionId, classData) {
        const allowedSectionIds = new Set();
        let classLevelAccess = classData.homeroomTeacher?.id === teacherId;
        for (const section of classData.sections || []) {
            if (section.homeroomTeacher?.id === teacherId) {
                allowedSectionIds.add(section.id);
            }
        }
        const classSubjects = await this.prisma.classSubject.findMany({
            where: {
                classId,
                teacherId,
                class: { schoolId },
            },
            select: { sectionId: true },
        });
        for (const assignment of classSubjects) {
            if (assignment.sectionId) {
                allowedSectionIds.add(assignment.sectionId);
            }
            else {
                classLevelAccess = true;
            }
        }
        if (sectionId) {
            const sectionBelongsToClass = (classData.sections || []).some((section) => section.id === sectionId);
            if (!sectionBelongsToClass) {
                throw new localization_1.LocalizedException('class.section_not_found_for_this_class_cfd1891e', undefined, common_1.HttpStatus.NOT_FOUND, 'Section not found for this class');
            }
            if (!classLevelAccess && !allowedSectionIds.has(sectionId)) {
                throw new localization_1.LocalizedException('class.you_can_only_view_students_in_your_assigned_class_or_homeroo_3ab74ec3', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only view students in your assigned class or homeroom section');
            }
            return classLevelAccess ? null : { sectionIds: [sectionId] };
        }
        if (classLevelAccess)
            return null;
        if (allowedSectionIds.size === 0) {
            throw new localization_1.LocalizedException('class.you_can_only_view_students_in_your_assigned_class_or_homeroo_3ab74ec3', undefined, common_1.HttpStatus.FORBIDDEN, 'You can only view students in your assigned class or homeroom section');
        }
        return { sectionIds: Array.from(allowedSectionIds) };
    }
    async getClassStats(schoolId, classId, sectionId) {
        const classData = await this.findOne(classId, schoolId);
        const where = { schoolId, classId };
        if (sectionId) {
            where.sectionId = sectionId;
        }
        const totalStudents = await this.prisma.studentClass.count({ where });
        let maleCount = 0;
        let femaleCount = 0;
        if (totalStudents > 0) {
            const studentClasses = await this.prisma.studentClass.findMany({
                where,
                include: {
                    student: {
                        include: {
                            studentProfile: true,
                        },
                    },
                },
            });
            for (const sc of studentClasses) {
                const gender = sc.student.studentProfile?.gender;
                if (gender === 'MALE' || gender === 'Male' || gender === 'male') {
                    maleCount++;
                }
                else if (gender === 'FEMALE' ||
                    gender === 'Female' ||
                    gender === 'female') {
                    femaleCount++;
                }
            }
        }
        else {
            const className = classData.name || '';
            const sectionName = classData.section || '';
            const possibleClassNames = [
                className,
                className.replace('Grade ', ''),
                `Grade ${className.replace('Grade ', '')}`,
            ].filter((v, i, a) => a.indexOf(v) === i);
            const orConditions = possibleClassNames.flatMap((cn) => {
                if (sectionName) {
                    return [
                        { className: cn, section: sectionName },
                        { className: cn, section: sectionName.toUpperCase() },
                        { className: cn, section: sectionName.toLowerCase() },
                    ];
                }
                return [{ className: cn }];
            });
            const profiles = await this.prisma.studentProfile.findMany({
                where: { schoolId, OR: orConditions },
            });
            for (const profile of profiles) {
                const gender = profile.gender;
                if (gender === 'MALE' || gender === 'Male' || gender === 'male') {
                    maleCount++;
                }
                else if (gender === 'FEMALE' ||
                    gender === 'Female' ||
                    gender === 'female') {
                    femaleCount++;
                }
            }
        }
        return {
            class: {
                id: classData.id,
                name: classData.name,
                grade: classData.grade,
                section: classData.section,
                homeroomTeacher: classData.homeroomTeacher || null,
                sections: classData.sections.map((s) => ({
                    id: s.id,
                    name: s.name,
                    capacity: s.capacity,
                    roomNumber: s.roomNumber,
                    homeroomTeacher: s.homeroomTeacher,
                })),
            },
            stats: {
                totalStudents: totalStudents > 0 ? totalStudents : maleCount + femaleCount,
                maleCount,
                femaleCount,
            },
        };
    }
};
exports.ClassService = ClassService;
exports.ClassService = ClassService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], ClassService);
//# sourceMappingURL=class.service.js.map