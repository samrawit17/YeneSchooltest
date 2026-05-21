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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentRequestService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const school_settings_service_1 = require("../school-settings/school-settings.service");
const notification_service_1 = require("../notification/notification.service");
const credential_service_1 = require("../credential/credential.service");
const client_1 = require("@prisma/client");
const role_enum_1 = require("../auth/types/role.enum");
const crypto = __importStar(require("crypto"));
let EnrollmentRequestService = class EnrollmentRequestService {
    prisma;
    schoolSettings;
    notificationService;
    credentialService;
    constructor(prisma, schoolSettings, notificationService, credentialService) {
        this.prisma = prisma;
        this.schoolSettings = schoolSettings;
        this.notificationService = notificationService;
        this.credentialService = credentialService;
    }
    async getPublicSchools() {
        const schools = await this.prisma.school.findMany({
            select: {
                id: true,
                name: true,
                code: true,
                logoUrl: true,
                schoolSettings: {
                    where: {
                        key: 'theme_color',
                    },
                    select: {
                        value: true,
                    },
                    take: 1,
                },
            },
            orderBy: { name: 'asc' },
        });
        return schools.map((school) => ({
            id: school.id,
            name: school.name,
            code: school.code,
            logoUrl: school.logoUrl,
            accentColor: school.schoolSettings[0]?.value || null,
        }));
    }
    async calculateRollNumber(sectionId) {
        const highestRoll = await this.prisma.studentClass.findFirst({
            where: { sectionId },
            orderBy: { student: { studentProfile: { rollNumber: 'desc' } } },
            include: {
                student: {
                    include: { studentProfile: true },
                },
            },
        });
        if (!highestRoll || !highestRoll.student.studentProfile?.rollNumber) {
            return 1;
        }
        const currentMax = parseInt(highestRoll.student.studentProfile.rollNumber) || 0;
        return currentMax + 1;
    }
    async generateStudentUsername(schoolId, academicYearId) {
        const school = await this.prisma.school.findUnique({
            where: { id: schoolId },
        });
        const academicYear = await this.prisma.academicYear.findUnique({
            where: { id: academicYearId },
        });
        const schoolCode = school?.code?.toUpperCase() || 'STU';
        const yearPart = academicYear?.name?.replace(/[^0-9]/g, '').slice(-4) ||
            String(new Date().getFullYear());
        const count = await this.prisma.studentProfile.count({
            where: {
                schoolId,
                academicYear: academicYear?.name,
            },
        });
        const sequence = String(count + 1).padStart(4, '0');
        return `${schoolCode}-${yearPart}-${sequence}`;
    }
    async findBestSection(classId, requestedSection) {
        const sections = await this.prisma.section.findMany({
            where: { classId },
            include: {
                _count: { select: { studentClasses: true } },
            },
        });
        if (sections.length === 0) {
            return null;
        }
        if (requestedSection) {
            const requested = sections.find((s) => s.name === requestedSection && s._count.studentClasses < s.capacity);
            if (requested) {
                return { id: requested.id, name: requested.name };
            }
        }
        const available = sections.filter((s) => s._count.studentClasses < s.capacity);
        if (available.length === 0) {
            return null;
        }
        available.sort((a, b) => a._count.studentClasses - b._count.studentClasses);
        return { id: available[0].id, name: available[0].name };
    }
    async createEnrollmentRequest(dto) {
        const schoolData = await this.prisma.school.findUnique({
            where: { id: dto.schoolId },
        });
        if (!schoolData) {
            throw new common_1.NotFoundException('School not found');
        }
        const enrollmentOpen = await this.schoolSettings.getSetting(dto.schoolId, 'SELF_ENROLLMENT_ACTIVE');
        const isOpen = enrollmentOpen === true || enrollmentOpen === 'true';
        if (!isOpen) {
            throw new common_1.BadRequestException('Online enrollment is currently closed');
        }
        if (dto.email) {
            const existingUser = await this.prisma.user.findFirst({
                where: { email: dto.email, schoolId: dto.schoolId },
            });
            if (existingUser) {
                throw new common_1.BadRequestException('A user with this email already exists');
            }
        }
        const existingParent = await this.prisma.user.findFirst({
            where: { phone: dto.parentPhone, schoolId: dto.schoolId },
        });
        if (existingParent) {
            throw new common_1.BadRequestException('A parent with this phone number already exists');
        }
        const academicYear = await this.prisma.academicYear.findUnique({
            where: { id: dto.academicYearId },
        });
        if (!academicYear) {
            throw new common_1.NotFoundException('Academic year not found');
        }
        const enrollmentCount = await this.prisma.enrollmentRequest.count({
            where: {
                schoolId: dto.schoolId,
                academicYearId: dto.academicYearId,
            },
        });
        const schoolCode = schoolData?.code?.toUpperCase() || 'SCH';
        const yearPart = academicYear.name.replace(/[^0-9]/g, '').slice(-4) ||
            new Date().getFullYear();
        const sequence = String(enrollmentCount + 1).padStart(4, '0');
        const referenceNumber = `${schoolCode}-${yearPart}${sequence}`;
        const enrollment = await this.prisma.enrollmentRequest.create({
            data: {
                schoolId: dto.schoolId,
                academicYearId: dto.academicYearId,
                status: client_1.EnrollmentRequestStatus.PENDING,
                firstName: dto.firstName,
                middleName: dto.middleName,
                lastName: dto.lastName,
                dateOfBirth: new Date(dto.dateOfBirth),
                gender: dto.gender,
                nationality: dto.nationality,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
                previousSchool: dto.previousSchool,
                previousGrade: dto.previousGrade,
                transferCertificate: dto.transferCertificate,
                parentFirstName: dto.parentFirstName,
                parentLastName: dto.parentLastName,
                parentPhone: dto.parentPhone,
                parentEmail: dto.parentEmail,
                parentRelation: dto.parentRelation,
                requestedGrade: dto.requestedGrade,
                documents: dto.documents ? JSON.stringify(dto.documents) : null,
            },
        });
        await this.notificationService.notifyAdminsOfNewEnrollment(dto.schoolId, `${enrollment.firstName} ${enrollment.lastName}`, String(enrollment.requestedGrade));
        return { ...enrollment, referenceNumber };
    }
    async listEnrollmentRequests(query) {
        const { schoolId, academicYearId, status, grade, search, page = 1, limit = 20, } = query;
        const skip = (page - 1) * limit;
        const where = { schoolId };
        if (academicYearId)
            where.academicYearId = academicYearId;
        if (status)
            where.status = status;
        if (grade)
            where.requestedGrade = grade;
        if (search) {
            where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { parentPhone: { contains: search, mode: 'insensitive' } },
                { parentFirstName: { contains: search, mode: 'insensitive' } },
                { parentLastName: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [total, requests] = await this.prisma.$transaction([
            this.prisma.enrollmentRequest.count({ where }),
            this.prisma.enrollmentRequest.findMany({
                where,
                include: {
                    academicYear: { select: { id: true, name: true } },
                    allocatedClass: { select: { id: true, name: true } },
                    allocatedSection: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
        ]);
        return {
            total,
            page,
            limit,
            data: requests,
        };
    }
    async getEnrollmentRequest(id, schoolId) {
        const enrollment = await this.prisma.enrollmentRequest.findFirst({
            where: { id, schoolId },
            include: {
                academicYear: { select: { id: true, name: true } },
                allocatedClass: { select: { id: true, name: true, section: true } },
                allocatedSection: { select: { id: true, name: true } },
                user: { select: { id: true, email: true } },
            },
        });
        if (!enrollment) {
            throw new common_1.NotFoundException('Enrollment request not found');
        }
        return enrollment;
    }
    async approveEnrollment(id, schoolId, approvedBy) {
        const enrollment = await this.prisma.enrollmentRequest.findFirst({
            where: { id, schoolId },
        });
        if (!enrollment) {
            throw new common_1.NotFoundException('Enrollment request not found');
        }
        if (enrollment.status !== client_1.EnrollmentRequestStatus.PENDING) {
            throw new common_1.BadRequestException(`Enrollment request is not pending. Current status: ${enrollment.status}`);
        }
        if (!enrollment.firstName || !enrollment.lastName) {
            throw new common_1.BadRequestException('Invalid enrollment data: missing student name');
        }
        let classInfo = await this.prisma.class.findFirst({
            where: {
                schoolId,
                academicYearId: enrollment.academicYearId,
                name: `Grade ${enrollment.requestedGrade}`,
            },
        });
        if (!classInfo) {
            classInfo = await this.prisma.class.create({
                data: {
                    schoolId,
                    academicYearId: enrollment.academicYearId,
                    name: `Grade ${enrollment.requestedGrade}`,
                    section: '',
                    grade: enrollment.requestedGrade,
                },
            });
        }
        let sectionName = 'A';
        let section = await this.prisma.section.findFirst({
            where: {
                classId: classInfo.id,
                name: sectionName,
            },
        });
        if (!section) {
            section = await this.prisma.section.create({
                data: {
                    classId: classInfo.id,
                    name: sectionName,
                    capacity: 30,
                },
            });
        }
        else {
            const studentCount = await this.prisma.studentClass.count({
                where: { sectionId: section.id },
            });
            if (studentCount >= section.capacity) {
                const existingSections = await this.prisma.section.findMany({
                    where: { classId: classInfo.id },
                    include: {
                        _count: { select: { studentClasses: true } },
                    },
                });
                const availableSection = existingSections.find((s) => s._count.studentClasses < s.capacity);
                if (availableSection) {
                    section = availableSection;
                    sectionName = availableSection.name;
                }
                else {
                    const nextSectionName = String.fromCharCode(65 + existingSections.length);
                    section = await this.prisma.section.create({
                        data: {
                            classId: classInfo.id,
                            name: nextSectionName,
                            capacity: 30,
                        },
                    });
                    sectionName = nextSectionName;
                }
            }
        }
        const academicYearName = (await this.prisma.academicYear.findUnique({
            where: { id: enrollment.academicYearId },
            select: { name: true },
        }))?.name || '';
        const rollNumber = await this.calculateRollNumber(section.id);
        let studentUser = enrollment.userId
            ? await this.prisma.user.findUnique({ where: { id: enrollment.userId } })
            : null;
        if (!studentUser && enrollment.allocatedStudentCode) {
            studentUser = await this.prisma.user.findFirst({
                where: {
                    username: enrollment.allocatedStudentCode,
                    schoolId,
                    role: role_enum_1.Role.STUDENT,
                },
            });
        }
        if (!studentUser && enrollment.email) {
            studentUser = await this.prisma.user.findFirst({
                where: {
                    email: enrollment.email,
                    schoolId,
                    role: role_enum_1.Role.STUDENT,
                },
            });
        }
        let studentProfile = studentUser
            ? await this.prisma.studentProfile.findUnique({
                where: { userId: studentUser.id },
            })
            : null;
        const generatedCredentials = !studentUser && !studentProfile
            ? await this.credentialService.generateStudentCredentials(schoolId, academicYearName || enrollment.academicYearId)
            : null;
        const studentCode = enrollment.allocatedStudentCode ||
            studentUser?.username ||
            studentProfile?.studentCode ||
            generatedCredentials?.username;
        if (!studentCode) {
            throw new common_1.BadRequestException('Failed to generate student username');
        }
        const studentEmail = enrollment.email || null;
        const studentPassword = generatedCredentials?.temporaryPassword ||
            crypto.randomBytes(8).toString('hex');
        const hashedStudentPassword = generatedCredentials?.hashedPassword ||
            studentUser?.password ||
            studentPassword;
        const isNewStudentUser = !studentUser;
        const studentFullName = enrollment.middleName
            ? `${enrollment.firstName} ${enrollment.middleName} ${enrollment.lastName}`
            : `${enrollment.firstName} ${enrollment.lastName}`;
        if (!studentUser) {
            studentUser = await this.prisma.user.create({
                data: {
                    name: studentFullName,
                    email: studentEmail,
                    phone: enrollment.phone,
                    username: studentCode,
                    password: hashedStudentPassword,
                    role: role_enum_1.Role.STUDENT,
                    schoolId,
                    isActive: false,
                    mustChangePassword: true,
                },
            });
        }
        if (!studentProfile) {
            studentProfile = await this.prisma.studentProfile.create({
                data: {
                    userId: studentUser.id,
                    schoolId,
                    studentCode,
                    studentId: studentCode,
                    enrollmentStatus: 'APPROVED',
                    academicYear: academicYearName,
                    className: classInfo.name,
                    section: sectionName,
                    rollNumber: String(rollNumber),
                    gender: enrollment.gender,
                    address: enrollment.address,
                    phone: enrollment.phone,
                    nationality: enrollment.nationality,
                },
            });
        }
        else {
            studentProfile = await this.prisma.studentProfile.update({
                where: { id: studentProfile.id },
                data: {
                    enrollmentStatus: 'APPROVED',
                    academicYear: academicYearName,
                    className: classInfo.name,
                    section: sectionName,
                    rollNumber: String(rollNumber),
                    gender: enrollment.gender,
                    address: enrollment.address,
                    phone: enrollment.phone,
                    nationality: enrollment.nationality,
                },
            });
        }
        const existingStudentClass = await this.prisma.studentClass.findFirst({
            where: {
                studentId: studentUser.id,
                academicYear: academicYearName,
            },
        });
        if (!existingStudentClass) {
            await this.prisma.studentClass.create({
                data: {
                    studentId: studentUser.id,
                    classId: classInfo.id,
                    sectionId: section.id,
                    schoolId,
                    academicYear: academicYearName,
                },
            });
        }
        else {
            await this.prisma.studentClass.update({
                where: { id: existingStudentClass.id },
                data: {
                    classId: classInfo.id,
                    sectionId: section.id,
                    schoolId,
                    academicYear: academicYearName,
                },
            });
        }
        const parentName = `${enrollment.parentFirstName} ${enrollment.lastName}`;
        let parentUser = await this.prisma.user.findFirst({
            where: { phone: enrollment.parentPhone, schoolId },
        });
        let isNewParentUser = false;
        let parentCredentials = null;
        if (!parentUser) {
            isNewParentUser = true;
            parentCredentials = await this.credentialService.generateStaffCredentials(schoolId, role_enum_1.Role.PARENT, academicYearName);
            parentUser = await this.prisma.user.create({
                data: {
                    name: parentName,
                    email: enrollment.parentEmail || null,
                    phone: enrollment.parentPhone,
                    username: parentCredentials.username,
                    password: parentCredentials.hashedPassword,
                    role: role_enum_1.Role.PARENT,
                    schoolId,
                    isActive: false,
                    mustChangePassword: true,
                },
            });
            await this.prisma.parentProfile.create({
                data: {
                    userId: parentUser.id,
                    schoolId,
                    phone: enrollment.parentPhone,
                },
            });
        }
        const parentProfile = await this.prisma.parentProfile.findUnique({
            where: { userId: parentUser.id },
        });
        if (parentProfile) {
            const existingLink = await this.prisma.parentStudent.findFirst({
                where: {
                    parentId: parentProfile.id,
                    studentId: studentProfile.id,
                    schoolId,
                },
            });
            if (!existingLink) {
                await this.prisma.parentStudent.create({
                    data: {
                        parentId: parentProfile.id,
                        studentId: studentProfile.id,
                        schoolId,
                        relation: enrollment.parentRelation,
                        isPrimary: true,
                    },
                });
            }
        }
        const updated = await this.prisma.enrollmentRequest.update({
            where: { id },
            data: {
                status: client_1.EnrollmentRequestStatus.APPROVED,
                approvedBy,
                approvedAt: new Date(),
                allocatedClassId: classInfo.id,
                allocatedSectionId: section.id,
                allocatedRollNumber: rollNumber,
                allocatedStudentCode: studentCode,
                userId: studentUser.id,
            },
        });
        if (isNewStudentUser) {
            await this.credentialService.createPendingCredential({
                schoolId,
                userId: studentUser.id,
                name: studentFullName,
                email: enrollment.email || null,
                username: studentCode,
                temporaryPassword: studentPassword,
                role: 'STUDENT',
            });
        }
        if (isNewParentUser && parentCredentials) {
            await this.credentialService.createPendingCredential({
                schoolId,
                userId: parentUser.id,
                name: parentName,
                email: enrollment.parentEmail || null,
                username: parentCredentials.username,
                temporaryPassword: parentCredentials.temporaryPassword,
                role: 'PARENT',
            });
        }
        return {
            enrollment: updated,
            credentials: {
                student: {
                    userId: studentUser.id,
                    username: studentCode,
                    password: isNewStudentUser ? studentPassword : 'Existing account',
                    studentCode,
                    class: classInfo.name,
                    section: sectionName,
                    rollNumber,
                },
                parent: {
                    userId: parentUser.id,
                    username: parentUser.username || parentCredentials?.username,
                    password: isNewParentUser
                        ? parentCredentials?.temporaryPassword || ''
                        : 'Existing account',
                    phone: enrollment.parentPhone,
                },
            },
        };
    }
    async rejectEnrollment(id, schoolId, reason) {
        const enrollment = await this.prisma.enrollmentRequest.findFirst({
            where: { id, schoolId },
        });
        if (!enrollment) {
            throw new common_1.NotFoundException('Enrollment request not found');
        }
        if (enrollment.status !== client_1.EnrollmentRequestStatus.PENDING) {
            throw new common_1.BadRequestException('Enrollment request is not pending');
        }
        return this.prisma.enrollmentRequest.update({
            where: { id },
            data: {
                status: client_1.EnrollmentRequestStatus.REJECTED,
                rejectionReason: reason,
            },
        });
    }
    async waitlistEnrollment(id, schoolId) {
        const enrollment = await this.prisma.enrollmentRequest.findFirst({
            where: { id, schoolId },
        });
        if (!enrollment) {
            throw new common_1.NotFoundException('Enrollment request not found');
        }
        if (enrollment.status !== client_1.EnrollmentRequestStatus.PENDING) {
            throw new common_1.BadRequestException('Enrollment request is not pending');
        }
        return this.prisma.enrollmentRequest.update({
            where: { id },
            data: {
                status: client_1.EnrollmentRequestStatus.WAITLISTED,
            },
        });
    }
    async cancelEnrollment(id, schoolId) {
        const enrollment = await this.prisma.enrollmentRequest.findFirst({
            where: { id, schoolId },
        });
        if (!enrollment) {
            throw new common_1.NotFoundException('Enrollment request not found');
        }
        if (enrollment.status === client_1.EnrollmentRequestStatus.APPROVED) {
            throw new common_1.BadRequestException('Cannot cancel an approved enrollment');
        }
        return this.prisma.enrollmentRequest.update({
            where: { id },
            data: {
                status: client_1.EnrollmentRequestStatus.CANCELLED,
            },
        });
    }
    async getEnrollmentStats(schoolId, academicYearId) {
        const where = { schoolId };
        if (academicYearId)
            where.academicYearId = academicYearId;
        const [total, pending, approved, rejected, waitlisted] = await Promise.all([
            this.prisma.enrollmentRequest.count({ where }),
            this.prisma.enrollmentRequest.count({
                where: { ...where, status: client_1.EnrollmentRequestStatus.PENDING },
            }),
            this.prisma.enrollmentRequest.count({
                where: { ...where, status: client_1.EnrollmentRequestStatus.APPROVED },
            }),
            this.prisma.enrollmentRequest.count({
                where: { ...where, status: client_1.EnrollmentRequestStatus.REJECTED },
            }),
            this.prisma.enrollmentRequest.count({
                where: { ...where, status: client_1.EnrollmentRequestStatus.WAITLISTED },
            }),
        ]);
        const byGrade = await this.prisma.enrollmentRequest.groupBy({
            by: ['requestedGrade'],
            where,
            _count: { id: true },
        });
        return {
            total,
            pending,
            approved,
            rejected,
            waitlisted,
            byGrade: byGrade.map((g) => ({
                grade: g.requestedGrade,
                count: g._count.id,
            })),
        };
    }
    async checkGradeCapacity(schoolId, grade) {
        const classInfo = await this.prisma.class.findFirst({
            where: {
                schoolId,
                name: `Grade ${grade}`,
            },
            include: {
                sections: {
                    include: {
                        _count: { select: { studentClasses: true } },
                    },
                },
            },
        });
        if (!classInfo) {
            return { exists: false, message: `No class found for Grade ${grade}` };
        }
        const sections = classInfo.sections.map((s) => ({
            name: s.name,
            capacity: s.capacity,
            enrolled: s._count.studentClasses,
            available: s.capacity - s._count.studentClasses,
        }));
        const totalCapacity = sections.reduce((sum, s) => sum + s.capacity, 0);
        const totalEnrolled = sections.reduce((sum, s) => sum + s.enrolled, 0);
        return {
            exists: true,
            grade: classInfo.name,
            totalCapacity,
            totalEnrolled,
            totalAvailable: totalCapacity - totalEnrolled,
            isFull: totalEnrolled >= totalCapacity,
            sections,
        };
    }
    async getEnrollmentStatus(schoolId) {
        const enrollmentOpen = await this.schoolSettings.getSetting(schoolId, 'SELF_ENROLLMENT_ACTIVE');
        const isOpen = enrollmentOpen === true || enrollmentOpen === 'true';
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
        });
        return {
            isOpen,
            academicYearId: academicYear?.id || null,
            academicYearName: academicYear?.name || null,
            message: isOpen
                ? 'Enrollment is currently open'
                : 'Online enrollment is currently closed. Please contact the school for more information.',
        };
    }
};
exports.EnrollmentRequestService = EnrollmentRequestService;
exports.EnrollmentRequestService = EnrollmentRequestService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        school_settings_service_1.SchoolSettingsService,
        notification_service_1.NotificationService,
        credential_service_1.CredentialService])
], EnrollmentRequestService);
//# sourceMappingURL=enrollment-request.service.js.map