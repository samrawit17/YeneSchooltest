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
const prisma_service_1 = require("../prisma/prisma.service");
const role_enum_1 = require("../auth/types/role.enum");
let ClassService = class ClassService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const existingClass = await this.prisma.class.findFirst({
            where: {
                schoolId: data.schoolId,
                academicYearId: data.academicYearId,
                name: data.name || `Grade ${data.grade}`,
                section: data.section,
            },
        });
        if (existingClass) {
            throw new common_1.ConflictException(`Class for grade ${data.grade} section ${data.section} in academic year already exists`);
        }
        return this.prisma.class.create({
            data: {
                schoolId: data.schoolId,
                academicYearId: data.academicYearId,
                grade: data.grade,
                section: data.section,
                name: data.name || `Grade ${data.grade}`,
            },
        });
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
            throw new common_1.NotFoundException('Class not found');
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
        if (data.grade || data.academicYearId) {
            const currentClass = await this.findOne(id, schoolId);
            const existingClass = await this.prisma.class.findFirst({
                where: {
                    id: { not: id },
                    schoolId,
                    academicYearId: data.academicYearId || currentClass.academicYearId,
                    grade: data.grade,
                },
            });
            if (existingClass) {
                throw new common_1.ConflictException(`Class with grade ${data.grade} and academic year already exists`);
            }
        }
        if (data.homeroomTeacherId) {
            const teacher = await this.prisma.user.findUnique({
                where: { id: data.homeroomTeacherId },
            });
            if (!teacher || teacher.schoolId !== schoolId) {
                throw new common_1.NotFoundException('Teacher not found');
            }
            if (teacher.role !== role_enum_1.Role.TEACHER) {
                throw new common_1.BadRequestException('The selected user must be a teacher to be assigned as homeroom teacher');
            }
        }
        const updateData = {};
        if (data.academicYearId !== undefined)
            updateData.academicYearId = data.academicYearId;
        if (data.grade !== undefined)
            updateData.grade = data.grade;
        if (data.name !== undefined)
            updateData.name = data.name;
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
        return updatedClass;
    }
    async delete(id, schoolId) {
        await this.findOne(id, schoolId);
        return this.prisma.class.delete({
            where: { id },
        });
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
    async getStudentsByClass(schoolId, classId, sectionId, search, pagination) {
        const classData = await this.findOne(classId, schoolId);
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const skip = (page - 1) * limit;
        const orderByField = pagination?.orderBy || 'name';
        const where = { schoolId, classId };
        if (sectionId) {
            where.sectionId = sectionId;
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
                                    rollNumber: true,
                                    gender: true,
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
                rollNumber: sc.student.studentProfile?.rollNumber,
                parentName: sc.student.studentProfile?.parents?.[0]?.parent?.user?.name || null,
                parentPhone: sc.student.studentProfile?.parents?.[0]?.parent?.user?.phone || null,
                section: sc.section,
            }));
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
                rollNumber: sp.rollNumber,
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
                section: classData.section,
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClassService);
//# sourceMappingURL=class.service.js.map