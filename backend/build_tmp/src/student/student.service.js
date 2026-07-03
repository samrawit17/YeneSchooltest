"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const storage_service_1 = require("../storage/storage.service");
const pdf_lib_1 = require("pdf-lib");
const QRCode = __importStar(require("qrcode"));
const archiver_1 = __importDefault(require("archiver"));
const sharp_1 = __importDefault(require("sharp"));
const prisma_service_1 = require("../prisma/prisma.service");
const credential_service_1 = require("../credential/credential.service");
const client_1 = require("@prisma/client");
const class_service_1 = require("../class/class.service");
const cache_service_1 = require("../infrastructure/cache/cache.service");
const cache_constants_1 = require("../infrastructure/cache/cache.constants");
const school_settings_service_1 = require("../school-settings/school-settings.service");
const MAX_ID_CARD_BULK_COUNT = 200;
let StudentService = class StudentService {
    prismaService;
    credentialService;
    classService;
    cacheService;
    storageService;
    constructor(prismaService, credentialService, classService, cacheService, storageService) {
        this.prismaService = prismaService;
        this.credentialService = credentialService;
        this.classService = classService;
        this.cacheService = cacheService;
        this.storageService = storageService;
    }
    normalizeStudentStream(stream, grade) {
        if (!grade || ![11, 12].includes(grade)) {
            return null;
        }
        const normalized = String(stream || '').trim().toUpperCase();
        if (!normalized) {
            return null;
        }
        if (!['SOCIAL', 'NATURAL'].includes(normalized)) {
            throw new localization_1.LocalizedException('student.student_stream_must_be_social_or_natural_for_grade_11_and_12_8c69d008', undefined, undefined, 'Student stream must be SOCIAL or NATURAL for Grade 11 and 12');
        }
        return normalized;
    }
    extractGradeFromClassName(className) {
        const match = String(className || '').match(/\d+/);
        return match ? Number(match[0]) : null;
    }
    async resolveSectionWithCapacity(schoolId, academicYear, className, sectionName, studentId) {
        const targetClass = await this.prismaService.class.findFirst({
            where: {
                schoolId,
                name: className,
                academicYear: { name: academicYear },
            },
            include: {
                sections: {
                    where: { name: sectionName },
                },
            },
        });
        const targetSection = targetClass?.sections[0];
        if (!targetClass || !targetSection) {
            throw new localization_1.LocalizedException('student.selected_class_and_section_are_not_valid_for_this_academic_y_95bee42c', undefined, undefined, 'Selected class and section are not valid for this academic year');
        }
        const enrolledCount = await this.prismaService.studentClass.count({
            where: {
                schoolId,
                classId: targetClass.id,
                sectionId: targetSection.id,
                academicYear,
                ...(studentId ? { studentId: { not: studentId } } : {}),
            },
        });
        if (targetSection.capacity && enrolledCount >= targetSection.capacity) {
            throw new localization_1.LocalizedException('student.selected_section_is_already_at_capacity_00ec9761', undefined, undefined, 'Selected section is already at capacity');
        }
        return {
            class: targetClass,
            section: targetSection,
        };
    }
    getStudentListNamespace(schoolId) {
        return `students:school:${schoolId}`;
    }
    async invalidateStudentCaches(schoolId, studentUserIds = []) {
        await this.cacheService.bumpVersion(this.getStudentListNamespace(schoolId));
        await this.cacheService.bumpVersion(`dashboard:school:${schoolId}`);
        for (const studentUserId of studentUserIds) {
            await this.cacheService.bumpVersion(`dashboard:school:${schoolId}:user:${studentUserId}`);
            await this.cacheService.bumpVersion(`grades:school:${schoolId}:student:${studentUserId}`);
        }
    }
    async getMyClassAssignment(studentUserId, schoolId) {
        const activeAcademicYear = await this.prismaService.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true, name: true },
        });
        const include = {
            class: {
                select: {
                    id: true,
                    name: true,
                    section: true,
                    grade: true,
                },
            },
            section: {
                select: {
                    id: true,
                    name: true,
                },
            },
        };
        const findLatestAssignment = async (where) => this.prismaService.studentClass.findFirst({
            where,
            include,
            orderBy: { updatedAt: 'desc' },
        });
        let assignment = await findLatestAssignment({
            studentId: studentUserId,
            schoolId,
            ...(activeAcademicYear ? { academicYear: activeAcademicYear.id } : {}),
        });
        if (!assignment) {
            assignment = await findLatestAssignment({
                studentId: studentUserId,
                schoolId,
            });
        }
        if (!assignment) {
            return {
                assigned: false,
                classId: null,
                sectionId: null,
                className: null,
                section: null,
                academicYearId: activeAcademicYear?.id || null,
                academicYearName: activeAcademicYear?.name || null,
            };
        }
        return {
            assigned: true,
            classId: assignment.classId,
            sectionId: assignment.sectionId,
            className: assignment.class?.name || null,
            section: assignment.section?.name || null,
            grade: assignment.class?.grade ?? null,
            academicYearId: assignment.academicYear || activeAcademicYear?.id || null,
            academicYearName: activeAcademicYear?.name || null,
        };
    }
    async createStudent(createStudentDto, createdById) {
        const { email, name, schoolId, academicYear, grade, className, stream, section, rollNumber, gender, address, phone, motherName, motherPhone, emergencyContact, guardianName, guardianPhone, guardianEmail, photo, documents, } = createStudentDto;
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
        });
        if (!school) {
            throw new localization_1.LocalizedException('student.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        }
        if (email) {
            const existingUser = await this.prismaService.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                throw new localization_1.LocalizedException('student.email_already_exists_d76fd2d8', undefined, undefined, 'Email already exists');
            }
        }
        const credentials = await this.credentialService.generateStudentCredentials(schoolId, academicYear);
        const user = await this.prismaService.user.create({
            data: {
                email: email || null,
                name,
                username: credentials.username,
                password: credentials.hashedPassword,
                role: client_1.Role.STUDENT,
                schoolId,
                avatarUrl: photo || undefined,
                mustChangePassword: true,
            },
        });
        const studentProfile = await this.prismaService.studentProfile.create({
            data: {
                userId: user.id,
                schoolId,
                studentCode: credentials.username,
                studentId: credentials.username,
                enrollmentStatus: client_1.EnrollmentStatus.APPROVED,
                academicYear,
                className,
                stream: this.normalizeStudentStream(stream, grade),
                section,
                rollNumber,
                gender,
                address,
                phone,
                motherName,
                motherPhone,
                emergencyContact: emergencyContact
                    ? JSON.stringify(emergencyContact)
                    : undefined,
                documents: documents ? JSON.stringify(documents) : undefined,
            },
        });
        const enrollment = await this.prismaService.enrollment.create({
            data: {
                studentId: user.id,
                schoolId,
                status: client_1.EnrollmentStatus.APPROVED,
                academicYear,
                grade,
            },
        });
        await this.invalidateStudentCaches(schoolId, [user.id]);
        return {
            user,
            studentProfile,
            enrollment,
            username: credentials.username,
            temporaryPassword: credentials.temporaryPassword,
        };
    }
    async getStudents(schoolId, filters, pagination, requesterId, requesterRole, search, rollNumber) {
        const where = { schoolId };
        if (requesterRole === 'TEACHER' && requesterId) {
            const homeroomClasses = await this.prismaService.class.findMany({
                where: {
                    schoolId,
                    homeroomTeacherId: requesterId,
                },
                select: { id: true, name: true, section: true },
            });
            const homeroomClassIds = homeroomClasses.map((c) => c.id);
            const teacherClassSubjects = await this.prismaService.classSubject.findMany({
                where: {
                    teacherId: requesterId,
                },
                select: { classId: true },
            });
            const subjectClassIds = teacherClassSubjects.map((cs) => cs.classId);
            const allClassIds = [
                ...new Set([...homeroomClassIds, ...subjectClassIds]),
            ];
            let studentIdsFromClasses = [];
            if (allClassIds.length > 0) {
                const studentClasses = await this.prismaService.studentClass.findMany({
                    where: {
                        classId: { in: allClassIds },
                        schoolId,
                    },
                    select: { studentId: true },
                });
                studentIdsFromClasses = studentClasses.map((sc) => sc.studentId);
            }
            for (const homeroomClass of homeroomClasses) {
                const classNameVariants = [
                    homeroomClass.name,
                    homeroomClass.name.replace('Grade ', ''),
                    `Grade ${homeroomClass.name.replace('Grade ', '')}`,
                ];
                const studentsByProfile = await this.prismaService.studentProfile.findMany({
                    where: {
                        schoolId,
                        OR: classNameVariants.map((name) => ({
                            className: name,
                            section: homeroomClass.section,
                        })),
                    },
                    select: { userId: true },
                });
                studentIdsFromClasses = [
                    ...studentIdsFromClasses,
                    ...studentsByProfile.map((s) => s.userId),
                ];
            }
            studentIdsFromClasses = [...new Set(studentIdsFromClasses)];
            if (studentIdsFromClasses.length > 0) {
                where.userId = { in: studentIdsFromClasses };
                if (search || rollNumber) {
                    const conditions = [];
                    if (search) {
                        conditions.push({
                            user: {
                                name: { contains: search, mode: 'insensitive' },
                            },
                        });
                    }
                    if (rollNumber) {
                        conditions.push({
                            rollNumber: { contains: rollNumber, mode: 'insensitive' },
                        });
                    }
                    if (conditions.length > 0) {
                        where.OR = conditions;
                    }
                }
            }
            else {
                return {
                    data: [],
                    total: 0,
                    page: pagination?.page || 1,
                    limit: pagination?.limit || 10,
                    totalPages: 0,
                };
            }
        }
        if (filters?.status === 'ACTIVE') {
            where.enrollmentStatus = client_1.EnrollmentStatus.APPROVED;
            where.user = { ...(where.user || {}), isActive: true };
        }
        else if (filters?.status === 'INACTIVE') {
            where.user = { ...(where.user || {}), isActive: false };
        }
        else if (filters?.status) {
            where.enrollmentStatus = filters.status;
        }
        if (filters?.grade) {
            where.className = { contains: `Grade ${filters.grade}` };
        }
        if (filters?.section) {
            where.section = filters.section;
        }
        if (filters?.academicYear) {
            const academicYear = await this.prismaService.academicYear.findFirst({
                where: {
                    schoolId,
                    OR: [
                        { id: filters.academicYear },
                        { name: filters.academicYear },
                    ],
                },
                select: { id: true, name: true },
            });
            where.academicYear = academicYear
                ? { in: [academicYear.id, academicYear.name] }
                : filters.academicYear;
        }
        if (search || rollNumber) {
            const conditions = [];
            if (search) {
                conditions.push({
                    studentCode: { contains: search, mode: 'insensitive' },
                });
                conditions.push({
                    rollNumber: { contains: search, mode: 'insensitive' },
                });
                conditions.push({
                    user: {
                        name: { contains: search, mode: 'insensitive' },
                    },
                });
                conditions.push({
                    user: {
                        email: { contains: search, mode: 'insensitive' },
                    },
                });
            }
            if (rollNumber) {
                conditions.push({
                    rollNumber: { contains: rollNumber },
                });
            }
            if (conditions.length > 0) {
                where.OR = conditions;
            }
        }
        const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
        const take = pagination?.limit || 20;
        return this.cacheService.getOrSetVersioned(this.getStudentListNamespace(schoolId), JSON.stringify({
            filters,
            pagination,
            requesterId,
            requesterRole,
            search,
            rollNumber,
            where,
        }), cache_constants_1.CACHE_TTL.STUDENTS_LIST, async () => {
            const studentProfiles = await this.prismaService.studentProfile.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            isActive: true,
                        },
                    },
                    parents: {
                        include: {
                            parent: {
                                include: {
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
                orderBy: { createdAt: 'desc' },
                skip,
                take,
            });
            const enrollments = await this.prismaService.enrollment.findMany({
                where: {
                    studentId: { in: studentProfiles.map((sp) => sp.userId) },
                },
            });
            const academicYearValues = [
                ...new Set(studentProfiles
                    .map((profile) => profile.academicYear)
                    .filter((value) => !!value)),
            ];
            const academicYears = academicYearValues.length
                ? await this.prismaService.academicYear.findMany({
                    where: {
                        schoolId,
                        OR: [
                            { id: { in: academicYearValues } },
                            { name: { in: academicYearValues } },
                        ],
                    },
                    select: { id: true, name: true, ethiopianYear: true },
                })
                : [];
            const academicYearDisplayByValue = new Map();
            academicYears.forEach((year) => {
                const display = String(year.ethiopianYear || year.name || '').trim();
                if (!display)
                    return;
                academicYearDisplayByValue.set(year.id, display);
                academicYearDisplayByValue.set(year.name, display);
            });
            const total = await this.prismaService.studentProfile.count({ where });
            const data = studentProfiles.map((profile) => {
                let gradeNum = undefined;
                if (profile.className) {
                    const gradeMatch = profile.className.match(/Grade\s*(\d+)/i);
                    gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : undefined;
                }
                return {
                    ...profile,
                    grade: gradeNum,
                    academicYearDisplay: academicYearDisplayByValue.get(profile.academicYear || '') ||
                        profile.academicYear ||
                        null,
                    parentName: profile.parents?.[0]?.parent?.user?.name || null,
                    parentPhone: profile.parents?.[0]?.parent?.user?.phone || null,
                    enrollment: enrollments.find((e) => e.studentId === profile.userId),
                };
            });
            return {
                data,
                total,
                page: pagination?.page || 1,
                limit: take,
                totalPages: Math.ceil(total / take),
            };
        });
    }
    async getStudentById(studentId, schoolId) {
        const student = await this.prismaService.studentProfile.findFirst({
            where: {
                OR: [{ userId: studentId }, { id: studentId }],
                schoolId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        name: true,
                        avatarUrl: true,
                        isActive: true,
                        lastLoginAt: true,
                    },
                },
                parents: {
                    include: {
                        parent: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        phone: true,
                                        lastLoginAt: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!student) {
            throw new localization_1.LocalizedException('student.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const enrollment = await this.prismaService.enrollment.findFirst({
            where: {
                studentId,
                schoolId,
            },
        });
        let academicYearName = null;
        if (student.academicYear) {
            const academicYear = await this.prismaService.academicYear.findFirst({
                where: {
                    schoolId,
                    OR: [{ id: student.academicYear }, { name: student.academicYear }],
                },
                select: { id: true, name: true, ethiopianYear: true },
            });
            academicYearName = academicYear
                ? String(academicYear.ethiopianYear || academicYear.name || '').trim()
                : null;
        }
        const currentStudentClass = await this.prismaService.studentClass.findFirst({
            where: {
                studentId: student.userId,
                schoolId,
            },
            orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
            include: {
                class: {
                    include: {
                        homeroomTeacher: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                section: {
                    include: {
                        homeroomTeacher: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        let classWithTeacher = null;
        let sectionWithTeacher = null;
        if (currentStudentClass) {
            classWithTeacher = currentStudentClass.class;
            sectionWithTeacher = currentStudentClass.section;
        }
        else if (student.className && student.section) {
            const classNameVariants = [
                student.className,
                student.className.replace('Grade ', ''),
                `Grade ${student.className.replace('Grade ', '')}`,
            ];
            const classRecord = await this.prismaService.class.findFirst({
                where: {
                    schoolId,
                    section: student.section,
                    OR: classNameVariants.map((name) => ({ name })),
                },
                include: {
                    homeroomTeacher: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    sections: {
                        where: { name: student.section },
                        include: {
                            homeroomTeacher: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                        take: 1,
                    },
                },
            });
            classWithTeacher = classRecord;
            sectionWithTeacher = classRecord?.sections?.[0] || null;
        }
        const homeroomTeacher = sectionWithTeacher?.homeroomTeacher || classWithTeacher?.homeroomTeacher || null;
        const parentInfo = student.parents?.map((p) => ({
            id: p.parent?.user?.id,
            name: p.parent?.user?.name,
            email: p.parent?.user?.email,
            phone: p.parent?.user?.phone,
            relation: p.relation,
            isPrimary: p.isPrimary,
            emergencyContact: p.emergencyContact,
            lastLogin: p.parent?.user?.lastLoginAt,
        })) || [];
        return {
            ...student,
            academicYearDisplay: academicYearName || student.academicYear || null,
            enrollment,
            enrollmentYear: enrollment?.academicYear || academicYearName || null,
            classTeacher: homeroomTeacher?.name || null,
            class: classWithTeacher
                ? {
                    id: classWithTeacher.id,
                    name: classWithTeacher.name,
                    section: classWithTeacher.section,
                    homeroomTeacher,
                }
                : null,
            lastLogin: student.user?.lastLoginAt || null,
            parents: parentInfo,
        };
    }
    async getStudentsForIdCards(schoolId, filters) {
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                code: true,
                email: true,
                phone: true,
                address: true,
                logoUrl: true,
            },
        });
        if (!school) {
            throw new localization_1.LocalizedException('student.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        }
        const where = {
            schoolId,
            enrollmentStatus: 'APPROVED',
        };
        if (filters?.grade) {
            const gradeStr = filters.grade;
            where.OR = [
                { className: gradeStr },
                { className: `Grade ${gradeStr}` },
                { className: gradeStr.replace('Grade ', '') },
            ];
        }
        if (filters?.section) {
            where.section = filters.section;
        }
        if (filters?.academicYear) {
            where.academicYear = filters.academicYear;
        }
        if (filters?.studentIds && filters.studentIds.length > 0) {
            where.userId = { in: filters.studentIds };
        }
        const studentProfiles = await this.prismaService.studentProfile.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatarUrl: true,
                        phone: true,
                    },
                },
                parents: {
                    include: {
                        parent: {
                            include: {
                                user: {
                                    select: {
                                        name: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                    take: 1,
                },
            },
            orderBy: [
                { className: 'asc' },
                { section: 'asc' },
                { rollNumber: 'asc' },
            ],
            take: 500,
        });
        let academicYearName = '';
        if (filters?.academicYear) {
            const ay = await this.prismaService.academicYear.findFirst({
                where: { id: filters.academicYear, schoolId },
                select: { name: true },
            });
            academicYearName = ay?.name || filters.academicYear;
        }
        else {
            const activeAy = await this.prismaService.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { name: true },
            });
            academicYearName = activeAy?.name || '';
        }
        const profileAcademicYearValues = Array.from(new Set(studentProfiles
            .map((profile) => profile.academicYear)
            .filter((value) => Boolean(value))));
        const academicYearRows = profileAcademicYearValues.length
            ? await this.prismaService.academicYear.findMany({
                where: {
                    schoolId,
                    OR: [
                        { id: { in: profileAcademicYearValues } },
                        { name: { in: profileAcademicYearValues } },
                    ],
                },
                select: { id: true, name: true },
            })
            : [];
        const academicYearLabelByValue = new Map();
        for (const year of academicYearRows) {
            academicYearLabelByValue.set(year.id, year.name);
            academicYearLabelByValue.set(year.name, year.name);
        }
        const students = studentProfiles.map((profile) => {
            let gradeNum = 0;
            if (profile.className) {
                const match = profile.className.match(/(\d+)/);
                gradeNum = match ? parseInt(match[1]) : 0;
            }
            let emergencyContact = null;
            if (profile.emergencyContact) {
                try {
                    emergencyContact = JSON.parse(profile.emergencyContact);
                }
                catch { }
            }
            if (!emergencyContact && profile.parents?.[0]) {
                const parentData = profile.parents[0];
                emergencyContact = {
                    name: parentData.parent?.user?.name || 'N/A',
                    phone: parentData.parent?.user?.phone || 'N/A',
                    relation: parentData.relation || 'Parent',
                };
            }
            let bloodGroup;
            if (profile.medicalInfo) {
                try {
                    const medical = JSON.parse(profile.medicalInfo);
                    bloodGroup = medical.bloodGroup || medical.blood_group;
                }
                catch { }
            }
            return {
                studentId: profile.userId,
                studentCode: profile.studentCode,
                name: profile.user?.name || 'Unknown',
                grade: gradeNum,
                section: profile.section || 'N/A',
                academicYear: academicYearLabelByValue.get(profile.academicYear || '') ||
                    academicYearName ||
                    profile.academicYear ||
                    '',
                dateOfBirth: null,
                gender: profile.gender || undefined,
                bloodGroup,
                address: profile.address || undefined,
                phone: profile.user?.phone || profile.phone || undefined,
                email: profile.user?.email || undefined,
                photoUrl: profile.user?.avatarUrl || undefined,
                rollNumber: profile.rollNumber || undefined,
                emergencyContact,
            };
        });
        return {
            students,
            school: {
                name: school.name,
                code: school.code,
                address: school.address || '',
                phone: school.phone || '',
                email: school.email || '',
                logo: school.logoUrl || undefined,
            },
            academicYear: academicYearName,
            total: students.length,
        };
    }
    async getIdCardTemplate(schoolId) {
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { name: true, phone: true, address: true, logoUrl: true },
        });
        const stored = await this.prismaService.schoolSetting.findFirst({
            where: { schoolId, key: school_settings_service_1.SCHOOL_SETTING_KEYS.ID_CARD_TEMPLATE },
            select: { value: true },
        });
        let template = {};
        if (stored?.value) {
            try {
                template = JSON.parse(stored.value);
            }
            catch {
                template = {};
            }
        }
        return {
            schoolId,
            title: template.title || 'Student ID Card',
            themeColor: this.normalizeHexColor(template.themeColor, '#1B4F72'),
            schoolName: template.schoolName || school?.name || '',
            schoolPhone: template.schoolPhone || school?.phone || '',
            schoolAddress: template.schoolAddress || school?.address || '',
            schoolLogoUrl: school?.logoUrl || '',
            showEmergencyContact: template.showEmergencyContact !== false,
            showBloodGroup: template.showBloodGroup === true,
            useCustomBackground: template.useCustomBackground === true,
            customBackgroundUrl: template.customBackgroundUrl || '',
        };
    }
    async saveIdCardTemplate(schoolId, value) {
        const normalized = {
            title: String(value.title || 'Student ID Card').trim(),
            themeColor: this.normalizeHexColor(value.themeColor, '#1B4F72'),
            schoolName: String(value.schoolName || '').trim(),
            schoolPhone: String(value.schoolPhone || '').trim(),
            schoolAddress: String(value.schoolAddress || '').trim(),
            showEmergencyContact: value.showEmergencyContact !== false,
            showBloodGroup: value.showBloodGroup === true,
            useCustomBackground: value.useCustomBackground === true,
            customBackgroundUrl: String(value.customBackgroundUrl || '').trim(),
        };
        const existing = await this.prismaService.schoolSetting.findFirst({
            where: { schoolId, key: school_settings_service_1.SCHOOL_SETTING_KEYS.ID_CARD_TEMPLATE },
            select: { id: true },
        });
        if (existing) {
            await this.prismaService.schoolSetting.update({
                where: { id: existing.id },
                data: { value: JSON.stringify(normalized) },
            });
        }
        else {
            await this.prismaService.schoolSetting.create({
                data: {
                    schoolId,
                    key: school_settings_service_1.SCHOOL_SETTING_KEYS.ID_CARD_TEMPLATE,
                    value: JSON.stringify(normalized),
                },
            });
        }
        return this.getIdCardTemplate(schoolId);
    }
    async uploadIdCardWatermark(schoolId, file) {
        if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype)) {
            throw new localization_1.LocalizedException('student.watermark_must_be_a_png_jpg_or_webp_image_17a9de60', undefined, undefined, 'Watermark must be a PNG, JPG, or WEBP image');
        }
        const extension = file.mimetype === 'image/png' ? '.png' :
            file.mimetype === 'image/webp' ? '.webp' :
                '.jpg';
        const fileName = `${schoolId}-${Date.now()}${extension}`;
        const storedFile = await this.storageService.upload(file.buffer, fileName, file.mimetype, { schoolId, folder: 'id-card-watermarks', generateName: false });
        return storedFile.url;
    }
    normalizeHexColor(value, fallback) {
        const raw = String(value || '').trim();
        return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
    }
    hexToRgbColor(value) {
        const raw = this.normalizeHexColor(value, '#1B4F72').replace('#', '');
        return (0, pdf_lib_1.rgb)(parseInt(raw.slice(0, 2), 16) / 255, parseInt(raw.slice(2, 4), 16) / 255, parseInt(raw.slice(4, 6), 16) / 255);
    }
    resolvePublicAssetPath(urlPath) {
        const raw = String(urlPath || '').trim();
        if (!raw)
            return null;
        if (path.isAbsolute(raw) && !raw.includes('..') && fs.existsSync(raw))
            return raw;
        const clean = raw.replace(/^\/+/, '');
        if (!clean || clean.includes('..'))
            return null;
        const candidates = [
            path.join(process.cwd(), 'public', clean),
            path.join(process.cwd(), 'backend', 'public', clean),
            path.join(process.cwd(), 'frontend', 'public', clean),
            path.resolve(__dirname, '..', '..', 'public', clean),
            path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', clean),
            path.join(process.cwd(), '..', 'frontend', 'public', clean),
        ].filter(Boolean);
        return candidates.find((candidate) => fs.existsSync(candidate)) || null;
    }
    async generateIdCardPdf(schoolId, studentId) {
        const template = await this.getIdCardTemplate(schoolId);
        const list = await this.getStudentsForIdCards(schoolId, { studentIds: [studentId] });
        const student = list.students?.[0];
        throw new localization_1.LocalizedException('student.student_not_found_for_id_card_cc52d3e4', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found for ID card');
        const pdfDoc = await pdf_lib_1.PDFDocument.create();
        const page = pdfDoc.addPage([336, 212]);
        const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
        const bold = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
        const { width, height } = page.getSize();
        const theme = this.hexToRgbColor(template.themeColor);
        const darkText = (0, pdf_lib_1.rgb)(0.08, 0.1, 0.14);
        const mutedText = (0, pdf_lib_1.rgb)(0.38, 0.42, 0.48);
        const lightSurface = (0, pdf_lib_1.rgb)(0.95, 0.97, 1);
        const drawText = (text, x, y, size = 8, textFont = font, color = darkText) => {
            page.drawText(String(text || ''), { x, y, size, font: textFont, color });
        };
        const readImageBytes = async (url) => {
            const clean = String(url || '').trim();
            if (!clean)
                return null;
            if (clean.startsWith('data:image/')) {
                const encoded = clean.split(',')[1];
                return encoded ? Buffer.from(encoded, 'base64') : null;
            }
            const assetPath = this.resolvePublicAssetPath(clean);
            if (!assetPath || !fs.existsSync(assetPath))
                return null;
            return fs.readFileSync(assetPath);
        };
        const drawImage = async (url, x, y, w, h) => {
            const bytes = await readImageBytes(url);
            if (!bytes)
                return false;
            try {
                const lower = String(url || '').toLowerCase();
                const image = lower.includes('image/png') || lower.endsWith('.png')
                    ? await pdfDoc.embedPng(bytes)
                    : lower.includes('image/jpeg') || lower.includes('image/jpg') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')
                        ? await pdfDoc.embedJpg(bytes)
                        : await pdfDoc.embedPng(await (0, sharp_1.default)(bytes).png().toBuffer());
                page.drawImage(image, { x, y, width: w, height: h });
                return true;
            }
            catch {
                return false;
            }
        };
        const drawWatermark = async () => {
            if (!template.useCustomBackground || !template.customBackgroundUrl)
                return;
            const bytes = await readImageBytes(template.customBackgroundUrl);
            if (!bytes)
                return;
            try {
                const lower = template.customBackgroundUrl.toLowerCase();
                const image = lower.endsWith('.png')
                    ? await pdfDoc.embedPng(bytes)
                    : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
                        ? await pdfDoc.embedJpg(bytes)
                        : await pdfDoc.embedPng(await (0, sharp_1.default)(bytes).png().toBuffer());
                const watermarkW = width * 0.58;
                const watermarkH = watermarkW * (image.height / image.width);
                page.drawImage(image, {
                    x: (width - watermarkW) / 2,
                    y: (height - watermarkH) / 2 - 4,
                    width: watermarkW,
                    height: watermarkH,
                    opacity: 0.12,
                });
            }
            catch {
                return;
            }
        };
        page.drawRectangle({ x: 0, y: 0, width, height, color: (0, pdf_lib_1.rgb)(1, 1, 1) });
        await drawWatermark();
        page.drawRectangle({ x: 0, y: height - 48, width, height: 48, color: theme });
        page.drawRectangle({ x: 0, y: 0, width, height: 24, color: lightSurface });
        await drawImage(template.schoolLogoUrl, 14, height - 40, 28, 28);
        drawText(template.schoolName || 'School Name', 50, height - 24, 13, bold, (0, pdf_lib_1.rgb)(1, 1, 1));
        drawText([template.schoolPhone, template.schoolAddress].filter(Boolean).join('  •  '), 50, height - 39, 6.4, font, (0, pdf_lib_1.rgb)(0.88, 0.94, 1));
        drawText(template.title || 'Student ID Card', width - 98, height - 24, 9, bold, (0, pdf_lib_1.rgb)(1, 1, 1));
        const photoX = 18;
        const photoY = 70;
        page.drawRectangle({ x: photoX, y: photoY, width: 78, height: 92, color: (0, pdf_lib_1.rgb)(1, 1, 1), borderColor: theme, borderWidth: 1 });
        const hasPhoto = await drawImage(student.photoUrl, photoX + 4, photoY + 4, 70, 84);
        if (!hasPhoto) {
            page.drawRectangle({ x: photoX + 4, y: photoY + 4, width: 70, height: 84, color: lightSurface });
            drawText('PHOTO', photoX + 23, photoY + 43, 8, bold, mutedText);
        }
        const detailsX = 112;
        drawText(student.name || 'Student Name', detailsX, 151, 15, bold, theme);
        drawText(`ID: ${student.studentCode || '-'}`, detailsX, 133, 9, bold, darkText);
        drawText(`Class: Grade ${student.grade || '-'} ${student.section || ''}`.trim(), detailsX, 118, 8.5, font, darkText);
        drawText(`Academic Year: ${student.academicYear || list.academicYear || '-'}`, detailsX, 104, 8.5, font, darkText);
        if (template.showBloodGroup && student.bloodGroup)
            drawText(`Blood Group: ${student.bloodGroup}`, detailsX, 90, 8.5, font, darkText);
        if (template.showEmergencyContact && student.emergencyContact?.phone) {
            drawText(`Emergency: ${student.emergencyContact.phone}`, detailsX, 76, 8, font, darkText);
        }
        const qrDataUrl = await QRCode.toDataURL(JSON.stringify({
            studentId: student.studentId,
            studentCode: student.studentCode,
            schoolId,
        }));
        const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        const qrImage = await pdfDoc.embedPng(qrBytes);
        page.drawImage(qrImage, { x: width - 70, y: 54, width: 48, height: 48 });
        drawText('Scan to verify', width - 70, 44, 6.5, font, mutedText);
        page.drawLine({ start: { x: 24, y: 14 }, end: { x: 104, y: 14 }, thickness: 0.7, color: mutedText });
        page.drawLine({ start: { x: width - 116, y: 14 }, end: { x: width - 24, y: 14 }, thickness: 0.7, color: mutedText });
        drawText('School Stamp', 42, 6, 6.5, font, mutedText);
        drawText('Principal Signature', width - 100, 6, 6.5, font, mutedText);
        return Buffer.from(await pdfDoc.save());
    }
    async generateIdCardBulkZip(schoolId, studentIds) {
        const ids = Array.from(new Set((Array.isArray(studentIds) ? studentIds : [])
            .map((id) => String(id || '').trim())
            .filter(Boolean)));
        throw new localization_1.LocalizedException('student.no_student_ids_provided_30ba7a1e', undefined, undefined, 'No student IDs provided');
        if (ids.length > MAX_ID_CARD_BULK_COUNT) {
            throw new localization_1.LocalizedException('student.you_can_generate_up_to_id_cards_per_zip_download_b1ed9731', undefined, undefined, 'You can generate up to ${MAX_ID_CARD_BULK_COUNT} ID cards per ZIP download');
        }
        const chunks = [];
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const done = new Promise((resolve, reject) => {
            archive.on('end', () => resolve(Buffer.concat(chunks)));
            archive.on('error', reject);
        });
        archive.on('data', (d) => chunks.push(d));
        for (const id of ids) {
            const pdf = await this.generateIdCardPdf(schoolId, id);
            archive.append(pdf, { name: `id-card-${id}.pdf` });
        }
        await archive.finalize();
        return done;
    }
    async updateStudent(studentId, schoolId, updateStudentDto) {
        const student = await this.prismaService.studentProfile.findFirst({
            where: {
                userId: studentId,
                schoolId,
            },
        });
        if (!student) {
            throw new localization_1.LocalizedException('student.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const { name, gender, stream, address, phone, motherName, motherPhone, emergencyContact, guardianName, guardianPhone, guardianEmail, photo, documents, } = updateStudentDto;
        if (name || photo) {
            await this.prismaService.user.update({
                where: { id: studentId },
                data: {
                    ...(name && { name }),
                    ...(photo && { avatarUrl: photo }),
                },
            });
        }
        const updated = await this.prismaService.studentProfile.update({
            where: { userId: studentId },
            data: {
                ...(gender && { gender }),
                ...(stream !== undefined && { stream: this.normalizeStudentStream(stream, this.extractGradeFromClassName(student.className)) }),
                ...(address && { address }),
                ...(phone && { phone }),
                ...(motherName !== undefined && { motherName }),
                ...(motherPhone !== undefined && { motherPhone }),
                ...(emergencyContact && {
                    emergencyContact: JSON.stringify(emergencyContact),
                }),
                ...(guardianName && { guardianName }),
                ...(guardianPhone && { guardianPhone }),
                ...(guardianEmail && { guardianEmail }),
                ...(documents && { documents: JSON.stringify(documents) }),
            },
        });
        await this.invalidateStudentCaches(schoolId, [studentId]);
        return updated;
    }
    async deleteStudent(studentId, schoolId, deletedById) {
        const student = await this.prismaService.studentProfile.findFirst({
            where: {
                userId: studentId,
                schoolId,
            },
        });
        if (!student) {
            throw new localization_1.LocalizedException('student.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const archivedAt = new Date();
        await this.prismaService.$transaction([
            this.prismaService.$executeRaw(client_1.Prisma.sql `
          UPDATE "Enrollment"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `),
            this.prismaService.$executeRaw(client_1.Prisma.sql `
          UPDATE "StudentProfile"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "userId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `),
            this.prismaService.$executeRaw(client_1.Prisma.sql `
          UPDATE "ReportCard"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `),
            this.prismaService.$executeRaw(client_1.Prisma.sql `
          UPDATE "Grade"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `),
            this.prismaService.$executeRaw(client_1.Prisma.sql `
          UPDATE "StudentFee"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `),
            this.prismaService.$executeRaw(client_1.Prisma.sql `
          UPDATE "Payment"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `),
            this.prismaService.$executeRaw(client_1.Prisma.sql `
          UPDATE "User"
          SET "deletedAt" = ${archivedAt},
              "deletedById" = ${deletedById || null},
              "isActive" = false,
              "updatedAt" = ${archivedAt}
          WHERE "id" = ${studentId}
            AND "deletedAt" IS NULL
        `),
        ]);
        await this.invalidateStudentCaches(schoolId, [studentId]);
        return { message: 'Student archived successfully' };
    }
    async getPendingEnrollments(schoolId) {
        const enrollments = await this.prismaService.enrollment.findMany({
            where: {
                schoolId,
                status: client_1.EnrollmentStatus.PENDING,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const studentIds = enrollments.map((e) => e.studentId);
        const studentProfiles = await this.prismaService.studentProfile.findMany({
            where: {
                userId: { in: studentIds },
            },
        });
        return enrollments.map((enrollment) => ({
            ...enrollment,
            studentProfile: studentProfiles.find((sp) => sp.userId === enrollment.studentId),
        }));
    }
    async approveEnrollment(enrollmentId, schoolId, approveData) {
        const enrollment = await this.prismaService.enrollment.findFirst({
            where: {
                id: enrollmentId,
                schoolId,
            },
            include: {
                student: true,
            },
        });
        if (!enrollment) {
            throw new localization_1.LocalizedException('student.enrollment_not_found_a5c5ebf0', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment not found');
        }
        if (enrollment.status !== client_1.EnrollmentStatus.PENDING) {
            throw new localization_1.LocalizedException('student.enrollment_is_not_pending_5a9c23f5', undefined, undefined, 'Enrollment is not pending');
        }
        const { className, section, rollNumber } = approveData;
        const placement = await this.resolveSectionWithCapacity(schoolId, enrollment.academicYear, className, section, enrollment.studentId);
        await this.prismaService.enrollment.update({
            where: { id: enrollmentId },
            data: {
                status: client_1.EnrollmentStatus.APPROVED,
            },
        });
        await this.prismaService.studentClass.upsert({
            where: {
                studentId_academicYear: {
                    studentId: enrollment.studentId,
                    academicYear: enrollment.academicYear,
                },
            },
            create: {
                studentId: enrollment.studentId,
                classId: placement.class.id,
                sectionId: placement.section.id,
                schoolId,
                academicYear: enrollment.academicYear,
            },
            update: {
                classId: placement.class.id,
                sectionId: placement.section.id,
                schoolId,
            },
        });
        await this.prismaService.studentProfile.update({
            where: { userId: enrollment.studentId },
            data: {
                enrollmentStatus: client_1.EnrollmentStatus.APPROVED,
                className,
                section,
                rollNumber,
            },
        });
        await this.invalidateStudentCaches(schoolId, [enrollment.studentId]);
        return { message: 'Enrollment approved successfully' };
    }
    async rejectEnrollment(enrollmentId, schoolId, rejectionReason) {
        const enrollment = await this.prismaService.enrollment.findFirst({
            where: {
                id: enrollmentId,
                schoolId,
            },
        });
        if (!enrollment) {
            throw new localization_1.LocalizedException('student.enrollment_not_found_a5c5ebf0', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment not found');
        }
        if (enrollment.status !== client_1.EnrollmentStatus.PENDING) {
            throw new localization_1.LocalizedException('student.enrollment_is_not_pending_5a9c23f5', undefined, undefined, 'Enrollment is not pending');
        }
        await this.prismaService.enrollment.update({
            where: { id: enrollmentId },
            data: {
                status: client_1.EnrollmentStatus.REJECTED,
                rejectionReason,
            },
        });
        await this.prismaService.studentProfile.update({
            where: { userId: enrollment.studentId },
            data: {
                enrollmentStatus: client_1.EnrollmentStatus.REJECTED,
            },
        });
        await this.invalidateStudentCaches(schoolId, [enrollment.studentId]);
        return { message: 'Enrollment rejected successfully' };
    }
    async assignClass(studentId, schoolId, assignData) {
        const student = await this.prismaService.studentProfile.findFirst({
            where: {
                userId: studentId,
                schoolId,
            },
        });
        if (!student) {
            throw new localization_1.LocalizedException('student.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const { className, section, rollNumber, classId, sectionId, stream } = assignData;
        let academicYear = student.academicYear;
        let targetGrade = this.extractGradeFromClassName(className);
        if (classId && sectionId) {
            const targetSection = await this.prismaService.section.findFirst({
                where: { id: sectionId, classId, class: { schoolId } },
                include: { class: true },
            });
            if (!targetSection) {
                throw new localization_1.LocalizedException('student.selected_class_and_section_are_not_valid_7e616270', undefined, undefined, 'Selected class and section are not valid');
            }
            const activeAcademicYear = await this.prismaService.academicYear.findFirst({
                where: { schoolId, isActive: true },
                select: { name: true },
            });
            academicYear = student.academicYear || activeAcademicYear?.name || new Date().getFullYear().toString();
            const enrolledCount = await this.prismaService.studentClass.count({
                where: {
                    schoolId,
                    classId,
                    sectionId,
                    academicYear,
                    studentId: { not: studentId },
                },
            });
            if (targetSection.capacity && enrolledCount >= targetSection.capacity) {
                throw new localization_1.LocalizedException('student.selected_section_is_already_at_capacity_00ec9761', undefined, undefined, 'Selected section is already at capacity');
            }
            await this.prismaService.studentClass.upsert({
                where: {
                    studentId_academicYear: {
                        studentId,
                        academicYear,
                    },
                },
                create: {
                    studentId,
                    classId,
                    sectionId,
                    schoolId,
                    academicYear,
                },
                update: {
                    classId,
                    sectionId,
                    schoolId,
                },
            });
            targetGrade = targetSection.class.grade;
        }
        await this.prismaService.studentProfile.update({
            where: { userId: studentId },
            data: {
                className,
                stream: this.normalizeStudentStream(stream, targetGrade),
                section,
                rollNumber,
                academicYear,
            },
        });
        await this.invalidateStudentCaches(schoolId, [studentId]);
        return {
            message: 'Class assigned successfully',
            studentId,
            className,
            stream: this.normalizeStudentStream(stream, targetGrade),
            section,
            rollNumber,
        };
    }
    async uploadDocuments(studentId, schoolId, documents) {
        const student = await this.prismaService.studentProfile.findFirst({
            where: {
                userId: studentId,
                schoolId,
            },
        });
        if (!student) {
            throw new localization_1.LocalizedException('student.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const existingDocs = student.documents ? JSON.parse(student.documents) : [];
        const updatedDocs = [
            ...existingDocs,
            ...documents.map((doc) => ({
                ...doc,
                uploadedAt: new Date().toISOString(),
            })),
        ];
        await this.prismaService.studentProfile.update({
            where: { userId: studentId },
            data: {
                documents: JSON.stringify(updatedDocs),
            },
        });
        await this.invalidateStudentCaches(schoolId, [studentId]);
        return {
            message: 'Documents uploaded successfully',
            studentId,
            documentCount: updatedDocs.length,
        };
    }
    async deleteDocument(studentId, schoolId, documentKey) {
        const student = await this.prismaService.studentProfile.findFirst({
            where: {
                OR: [{ userId: studentId }, { id: studentId }],
                schoolId,
            },
        });
        if (!student) {
            throw new localization_1.LocalizedException('student.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const existingDocs = student.documents ? JSON.parse(student.documents) : [];
        const normalizedKey = decodeURIComponent(documentKey || '').toLowerCase();
        const updatedDocs = existingDocs.filter((doc) => {
            const candidates = [
                doc.id,
                doc.type,
                doc.title,
                doc.name,
            ]
                .filter(Boolean)
                .map((value) => String(value).toLowerCase());
            return !candidates.includes(normalizedKey);
        });
        if (updatedDocs.length === existingDocs.length) {
            throw new localization_1.LocalizedException('student.document_not_found_9d4ed206', undefined, common_1.HttpStatus.NOT_FOUND, 'Document not found');
        }
        await this.prismaService.studentProfile.update({
            where: { id: student.id },
            data: {
                documents: JSON.stringify(updatedDocs),
            },
        });
        await this.invalidateStudentCaches(schoolId, [student.userId]);
        return {
            message: 'Document deleted successfully',
            studentId: student.userId,
            documentCount: updatedDocs.length,
        };
    }
    async uploadDocumentFile(studentId, schoolId, file, data) {
        if (!file) {
            throw new localization_1.LocalizedException('student.document_file_is_required_6e96c09b', undefined, undefined, 'Document file is required');
        }
        const allowedTypes = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            throw new localization_1.LocalizedException('student.document_must_be_a_pdf_png_jpg_or_webp_file_cf722ced', undefined, undefined, 'Document must be a PDF, PNG, JPG, or WEBP file');
        }
        const extension = path.extname(file.originalname || '') || (file.mimetype === 'application/pdf'
            ? '.pdf'
            : file.mimetype === 'image/png'
                ? '.png'
                : file.mimetype === 'image/webp'
                    ? '.webp'
                    : '.jpg');
        const safeType = String(data.type || data.title || 'document')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '') || 'document';
        const fileName = `${studentId}-${safeType}-${Date.now()}${extension}`;
        const storedFile = await this.storageService.upload(file.buffer, fileName, file.mimetype, { schoolId, folder: 'student-documents', generateName: false });
        const fileUrl = storedFile.url;
        const document = {
            id: `${safeType}-${Date.now()}`,
            type: safeType,
            title: data.title || data.type || file.originalname || 'Document',
            name: data.title || file.originalname || 'Document',
            category: 'student_registration',
            status: 'SUBMITTED',
            submitted: true,
            description: data.description || undefined,
            fileUrl,
            mimeType: file.mimetype,
            size: file.size,
        };
        return this.uploadDocuments(studentId, schoolId, [document]);
    }
    async getStudentsByClassProxy(classId, sectionId, search, pagination, schoolId) {
        if (!schoolId) {
            throw new Error('schoolId is required');
        }
        return this.classService.getStudentsByClass(schoolId, classId, sectionId, search, pagination);
    }
    async getStudentsByHomeroomTeacher(schoolId, teacherId, requesterRole, academicYearId) {
        let resolvedAcademicYear;
        if (academicYearId) {
            resolvedAcademicYear = await this.prismaService.academicYear.findFirst({
                where: {
                    schoolId,
                    OR: [
                        { id: academicYearId },
                        { name: academicYearId },
                    ],
                },
            });
        }
        else {
            resolvedAcademicYear = await this.prismaService.academicYear.findFirst({
                where: { schoolId, isActive: true },
            });
        }
        const resolvedAcademicYearId = resolvedAcademicYear?.id;
        const [homeroomSections, classSubjectAssignments, timetableAssignments] = await Promise.all([
            this.prismaService.section.findMany({
                where: {
                    homeroomTeacherId: teacherId,
                    class: {
                        schoolId,
                        ...(resolvedAcademicYearId ? { academicYearId: resolvedAcademicYearId } : {}),
                    },
                },
                select: {
                    id: true,
                    name: true,
                    class: {
                        select: {
                            id: true,
                            name: true,
                            grade: true,
                        },
                    },
                },
            }),
            this.prismaService.classSubject.findMany({
                where: {
                    teacherId,
                    class: {
                        schoolId,
                        ...(resolvedAcademicYearId ? { academicYearId: resolvedAcademicYearId } : {}),
                    },
                },
                select: {
                    classId: true,
                    sectionId: true,
                    class: {
                        select: {
                            id: true,
                            name: true,
                            grade: true,
                        },
                    },
                    section: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
            this.prismaService.timetableSlot.findMany({
                where: {
                    teacherId,
                    class: {
                        schoolId,
                        ...(resolvedAcademicYearId ? { academicYearId: resolvedAcademicYearId } : {}),
                    },
                },
                select: {
                    classId: true,
                    sectionId: true,
                    class: {
                        select: {
                            id: true,
                            name: true,
                            grade: true,
                        },
                    },
                    section: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            }),
        ]);
        const assignedSectionsMap = new Map();
        for (const section of homeroomSections) {
            assignedSectionsMap.set(`${section.class.id}:${section.id}`, {
                classId: section.class.id,
                sectionId: section.id,
                className: section.class.name,
                sectionName: section.name,
                grade: section.class.grade,
            });
        }
        for (const assignment of [
            ...classSubjectAssignments,
            ...timetableAssignments,
        ]) {
            assignedSectionsMap.set(`${assignment.classId}:${assignment.sectionId}`, {
                classId: assignment.classId,
                sectionId: assignment.sectionId,
                className: assignment.class.name,
                sectionName: assignment.section.name,
                grade: assignment.class.grade,
            });
        }
        const assignedSections = Array.from(assignedSectionsMap.values()).sort((left, right) => {
            const classCompare = left.className.localeCompare(right.className);
            if (classCompare !== 0) {
                return classCompare;
            }
            return left.sectionName.localeCompare(right.sectionName);
        });
        if (assignedSections.length === 0) {
            return { data: [] };
        }
        const studentsFromClassLinks = await this.prismaService.studentClass.findMany({
            where: {
                schoolId,
                ...(resolvedAcademicYear?.name ? { academicYear: resolvedAcademicYear.name } : {}),
                OR: assignedSections.map((section) => ({
                    classId: section.classId,
                    sectionId: section.sectionId,
                })),
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                        email: true,
                        phone: true,
                    },
                },
                class: {
                    select: {
                        id: true,
                        name: true,
                        grade: true,
                    },
                },
                section: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [
                { class: { name: 'asc' } },
                { section: { name: 'asc' } },
                { student: { name: 'asc' } },
            ],
        });
        const assignedProfileMatchers = assignedSections.flatMap((assignment) => {
            const className = assignment.className || `Grade ${assignment.grade}`;
            const classNameVariants = [
                className,
                className.replace('Grade ', ''),
                `Grade ${className.replace('Grade ', '')}`,
            ].filter((value, index, array) => value && array.indexOf(value) === index);
            const sectionVariants = [
                assignment.sectionName,
                assignment.sectionName.toUpperCase(),
                assignment.sectionName.toLowerCase(),
            ].filter((value, index, array) => value && array.indexOf(value) === index);
            return classNameVariants.flatMap((name) => sectionVariants.map((section) => ({
                className: name,
                section,
                classId: assignment.classId,
                sectionId: assignment.sectionId,
                grade: assignment.grade,
            })));
        });
        const studentsFromProfiles = assignedProfileMatchers.length > 0
            ? await this.prismaService.studentProfile.findMany({
                where: {
                    schoolId,
                    OR: assignedProfileMatchers.map((matcher) => ({
                        className: matcher.className,
                        section: matcher.section,
                    })),
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
                orderBy: {
                    user: {
                        name: 'asc',
                    },
                },
            })
            : [];
        const studentMap = new Map();
        for (const studentClass of studentsFromClassLinks) {
            studentMap.set(studentClass.student.id, {
                id: studentClass.student.id,
                name: studentClass.student.name,
                avatarUrl: studentClass.student.avatarUrl,
                email: studentClass.student.email,
                phone: studentClass.student.phone,
                classId: studentClass.class.id,
                className: studentClass.class.name,
                section: studentClass.section.name,
                grade: studentClass.class.grade,
                academicYear: studentClass.academicYear,
            });
        }
        for (const profile of studentsFromProfiles) {
            if (studentMap.has(profile.userId)) {
                continue;
            }
            const matchedClass = assignedProfileMatchers.find((matcher) => matcher.className === profile.className &&
                matcher.section === profile.section);
            if (!matchedClass) {
                continue;
            }
            studentMap.set(profile.userId, {
                id: profile.user.id,
                name: profile.user.name,
                avatarUrl: profile.user.avatarUrl,
                email: profile.user.email,
                phone: profile.user.phone,
                classId: matchedClass.classId,
                className: profile.className ||
                    assignedSections.find((section) => section.classId === matchedClass.classId &&
                        section.sectionId === matchedClass.sectionId)?.className ||
                    '',
                section: profile.section,
                grade: matchedClass.grade ?? null,
                academicYear: null,
            });
        }
        return {
            data: Array.from(studentMap.values()).sort((left, right) => {
                const classCompare = `${left.className}-${left.section || ''}`.localeCompare(`${right.className}-${right.section || ''}`);
                if (classCompare !== 0) {
                    return classCompare;
                }
                return left.name.localeCompare(right.name);
            }),
        };
    }
    async generateStudentCode(schoolId) {
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { name: true },
        });
        if (!school) {
            throw new localization_1.LocalizedException('student.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        }
        const schoolPrefix = school.name.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
        return `${schoolPrefix}${timestamp}${random}`;
    }
    generateTempPassword() {
        return this.credentialService.generateTemporaryPassword(16);
    }
};
exports.StudentService = StudentService;
exports.StudentService = StudentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        credential_service_1.CredentialService,
        class_service_1.ClassService,
        cache_service_1.CacheService,
        storage_service_1.StorageService])
], StudentService);
//# sourceMappingURL=student.service.js.map