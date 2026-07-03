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
exports.RegistrarService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const auto_assignment_service_1 = require("../auto-assignment/auto-assignment.service");
const credential_service_1 = require("../credential/credential.service");
let RegistrarService = class RegistrarService {
    prismaService;
    autoAssignmentService;
    credentialService;
    constructor(prismaService, autoAssignmentService, credentialService) {
        this.prismaService = prismaService;
        this.autoAssignmentService = autoAssignmentService;
        this.credentialService = credentialService;
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
            throw new localization_1.LocalizedException('registrar.student_stream_must_be_social_or_natural_for_grade_11_and_12_8c69d008', undefined, undefined, 'Student stream must be SOCIAL or NATURAL for Grade 11 and 12');
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
            throw new localization_1.LocalizedException('registrar.selected_class_and_section_are_not_valid_for_this_academic_y_95bee42c', undefined, undefined, 'Selected class and section are not valid for this academic year');
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
            throw new localization_1.LocalizedException('registrar.selected_section_is_already_at_capacity_00ec9761', undefined, undefined, 'Selected section is already at capacity');
        }
        return {
            class: targetClass,
            section: targetSection,
        };
    }
    async createStudent(createStudentDto, schoolId, createdById) {
        const { email, name, academicYear, gradeId, stream, gender, address, phone, motherName, motherPhone, emergencyContact, guardianName, guardianPhone, guardianEmail, photo, documents, } = createStudentDto;
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
        });
        if (!school) {
            throw new localization_1.LocalizedException('registrar.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        }
        const existingUser = await this.prismaService.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new localization_1.LocalizedException('registrar.email_already_exists_d76fd2d8', undefined, undefined, 'Email already exists');
        }
        const studentCreds = await this.credentialService.generateStudentCredentials(schoolId, academicYear);
        const studentCode = studentCreds.username;
        const user = await this.prismaService.user.create({
            data: {
                email,
                name,
                username: studentCode,
                password: studentCreds.hashedPassword,
                role: client_1.Role.STUDENT,
                schoolId,
                avatarUrl: photo || undefined,
                isActive: false,
                mustChangePassword: true,
            },
        });
        const studentProfile = await this.prismaService.studentProfile.create({
            data: {
                userId: user.id,
                schoolId,
                studentCode,
                studentId: studentCode,
                enrollmentStatus: client_1.EnrollmentStatus.PENDING,
                academicYear,
                stream: this.normalizeStudentStream(stream, null),
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
                status: client_1.EnrollmentStatus.PENDING,
                academicYear,
                gradeId,
            },
        });
        return {
            user,
            studentProfile,
            enrollment,
            studentCode,
            username: studentCreds.username,
            temporaryPassword: studentCreds.temporaryPassword,
        };
    }
    async getStudents(schoolId, filters) {
        const where = { schoolId };
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
            },
            orderBy: { createdAt: 'desc' },
        });
        const enrollments = await this.prismaService.enrollment.findMany({
            where: {
                studentId: { in: studentProfiles.map((sp) => sp.userId) },
            },
        });
        return studentProfiles.map((profile) => ({
            ...profile,
            enrollment: enrollments.find((e) => e.studentId === profile.userId),
        }));
    }
    async getStudentById(studentId, schoolId) {
        const student = await this.prismaService.studentProfile.findFirst({
            where: {
                userId: studentId,
                schoolId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        isActive: true,
                    },
                },
            },
        });
        if (!student) {
            throw new localization_1.LocalizedException('registrar.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const enrollment = await this.prismaService.enrollment.findFirst({
            where: {
                studentId,
                schoolId,
            },
        });
        return {
            ...student,
            enrollment,
        };
    }
    async updateStudent(studentId, schoolId, updateStudentDto) {
        const student = await this.prismaService.studentProfile.findFirst({
            where: {
                userId: studentId,
                schoolId,
            },
        });
        if (!student) {
            throw new localization_1.LocalizedException('registrar.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
        }
        const { name, gender, stream, address, phone, motherName, motherPhone, dateOfBirth, faydaNumber, emergencyContact, guardianName, guardianPhone, guardianEmail, documents, } = updateStudentDto;
        if (name) {
            await this.prismaService.user.update({
                where: { id: studentId },
                data: { name },
            });
        }
        return this.prismaService.studentProfile.update({
            where: { userId: studentId },
            data: {
                ...(gender && { gender }),
                ...(stream !== undefined && {
                    stream: this.normalizeStudentStream(stream, this.extractGradeFromClassName(student.className)),
                }),
                ...(address && { address }),
                ...(phone && { phone }),
                ...(motherName !== undefined && { motherName }),
                ...(motherPhone !== undefined && { motherPhone }),
                ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
                ...(faydaNumber !== undefined && { faydaNumber: faydaNumber || null }),
                ...(emergencyContact && {
                    emergencyContact: JSON.stringify(emergencyContact),
                }),
                ...(guardianName && { guardianName }),
                ...(guardianPhone && { guardianPhone }),
                ...(guardianEmail && { guardianEmail }),
                ...(documents && { documents: JSON.stringify(documents) }),
            },
        });
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
    async getEnrollments(schoolId, status, page = 1) {
        const PAGE_SIZE = 10;
        const skip = (page - 1) * PAGE_SIZE;
        const where = {
            schoolId,
        };
        if (status && status !== '') {
            where.status = status.toUpperCase();
        }
        const [enrollments, total] = await Promise.all([
            this.prismaService.enrollment.findMany({
                where,
                include: {
                    student: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            phone: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: PAGE_SIZE,
                skip,
            }),
            this.prismaService.enrollment.count({ where }),
        ]);
        const studentIds = enrollments.map((e) => e.studentId);
        const studentProfiles = await this.prismaService.studentProfile.findMany({
            where: {
                userId: { in: studentIds },
            },
        });
        const enrichments = enrollments.map((enrollment) => ({
            ...enrollment,
            user: enrollment.student,
            studentProfile: studentProfiles.find((sp) => sp.userId === enrollment.studentId),
        }));
        return {
            data: enrichments,
            total,
            page,
            totalPages: Math.ceil(total / PAGE_SIZE),
        };
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
            throw new localization_1.LocalizedException('registrar.enrollment_not_found_a5c5ebf0', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment not found');
        }
        if (enrollment.status !== client_1.EnrollmentStatus.PENDING) {
            throw new localization_1.LocalizedException('registrar.enrollment_is_not_pending_5a9c23f5', undefined, undefined, 'Enrollment is not pending');
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
        return { message: 'Enrollment approved successfully' };
    }
    async approveEnrollmentAuto(enrollmentId, schoolId) {
        return this.autoAssignmentService.autoAssignStudent(enrollmentId, schoolId);
    }
    async rejectEnrollment(enrollmentId, schoolId, rejectionReason) {
        const enrollment = await this.prismaService.enrollment.findFirst({
            where: {
                id: enrollmentId,
                schoolId,
            },
        });
        if (!enrollment) {
            throw new localization_1.LocalizedException('registrar.enrollment_not_found_a5c5ebf0', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment not found');
        }
        if (enrollment.status !== client_1.EnrollmentStatus.PENDING) {
            throw new localization_1.LocalizedException('registrar.enrollment_is_not_pending_5a9c23f5', undefined, undefined, 'Enrollment is not pending');
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
            throw new localization_1.LocalizedException('registrar.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
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
                throw new localization_1.LocalizedException('registrar.selected_class_and_section_are_not_valid_7e616270', undefined, undefined, 'Selected class and section are not valid');
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
                throw new localization_1.LocalizedException('registrar.selected_section_is_already_at_capacity_00ec9761', undefined, undefined, 'Selected section is already at capacity');
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
            throw new localization_1.LocalizedException('registrar.student_not_found_2525e0b2', undefined, common_1.HttpStatus.NOT_FOUND, 'Student not found');
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
        return {
            message: 'Documents uploaded successfully',
            studentId,
            documentCount: updatedDocs.length,
        };
    }
    async generateStudentCode(schoolId) {
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { name: true },
        });
        if (!school) {
            throw new localization_1.LocalizedException('registrar.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
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
exports.RegistrarService = RegistrarService;
exports.RegistrarService = RegistrarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        auto_assignment_service_1.AutoAssignmentService,
        credential_service_1.CredentialService])
], RegistrarService);
//# sourceMappingURL=registrar.service.js.map