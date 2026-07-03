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
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const school_settings_service_1 = require("../school-settings/school-settings.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const credential_service_1 = require("../credential/credential.service");
const client_1 = require("@prisma/client");
const role_enum_1 = require("../auth/types/role.enum");
const crypto = __importStar(require("crypto"));
let EnrollmentRequestService = class EnrollmentRequestService {
    prisma;
    schoolSettings;
    eventBus;
    credentialService;
    constructor(prisma, schoolSettings, eventBus, credentialService) {
        this.prisma = prisma;
        this.schoolSettings = schoolSettings;
        this.eventBus = eventBus;
        this.credentialService = credentialService;
    }
    async getPublicSchools() {
        const schools = await this.prisma.school.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                code: true,
                publicUrlSlug: true,
                logoUrl: true,
                schoolSettings: {
                    where: {
                        key: { in: ['theme_color', 'login_image_url', 'SCHOOL_STARTS_AT', 'REGISTRATION_STARTS_AT', 'MAINTENANCE_MODE'] },
                    },
                    select: {
                        key: true,
                        value: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
        return schools.map((school) => ({
            id: school.id,
            name: school.name,
            code: school.code,
            publicUrlSlug: school.publicUrlSlug,
            logoUrl: school.logoUrl,
            accentColor: school.schoolSettings.find((setting) => setting.key === 'theme_color')
                ?.value || null,
            loginImageUrl: school.schoolSettings.find((setting) => setting.key === 'login_image_url')?.value || null,
            schoolStartsAt: school.schoolSettings.find((setting) => setting.key === 'SCHOOL_STARTS_AT')?.value || null,
            registrationStartsAt: school.schoolSettings.find((setting) => setting.key === 'REGISTRATION_STARTS_AT')?.value || null,
            isMaintenance: school.schoolSettings.find((setting) => setting.key === 'MAINTENANCE_MODE')
                ?.value === 'true',
        }));
    }
    async getPublicSchoolById(id) {
        const school = await this.prisma.school.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                code: true,
                publicUrlSlug: true,
                logoUrl: true,
                email: true,
                phone: true,
                address: true,
                isActive: true,
                schoolSettings: {
                    where: { key: { in: ['theme_color', 'login_image_url', 'SCHOOL_STARTS_AT', 'REGISTRATION_STARTS_AT', 'MAINTENANCE_MODE'] } },
                    select: { key: true, value: true },
                },
            },
        });
        if (!school)
            return null;
        return {
            id: school.id,
            name: school.name,
            code: school.code,
            publicUrlSlug: school.publicUrlSlug,
            logoUrl: school.logoUrl,
            email: school.email,
            phone: school.phone,
            address: school.address,
            isActive: school.isActive,
            accentColor: school.schoolSettings.find((setting) => setting.key === 'theme_color')
                ?.value || null,
            loginImageUrl: school.schoolSettings.find((setting) => setting.key === 'login_image_url')?.value || null,
            schoolStartsAt: school.schoolSettings.find((setting) => setting.key === 'SCHOOL_STARTS_AT')?.value || null,
            registrationStartsAt: school.schoolSettings.find((setting) => setting.key === 'REGISTRATION_STARTS_AT')?.value || null,
            isMaintenance: school.schoolSettings.find((setting) => setting.key === 'MAINTENANCE_MODE')
                ?.value === 'true',
        };
    }
    async getPublicSchoolByUrlSlug(publicUrlSlug) {
        const school = await this.prisma.school.findUnique({
            where: { publicUrlSlug },
            select: {
                id: true,
                name: true,
                code: true,
                publicUrlSlug: true,
                logoUrl: true,
                email: true,
                phone: true,
                address: true,
                isActive: true,
                schoolSettings: {
                    where: { key: { in: ['theme_color', 'login_image_url', 'SCHOOL_STARTS_AT', 'REGISTRATION_STARTS_AT', 'MAINTENANCE_MODE'] } },
                    select: { key: true, value: true },
                },
            },
        });
        if (!school)
            return null;
        return {
            id: school.id,
            name: school.name,
            code: school.code,
            publicUrlSlug: school.publicUrlSlug,
            logoUrl: school.logoUrl,
            email: school.email,
            phone: school.phone,
            address: school.address,
            isActive: school.isActive,
            accentColor: school.schoolSettings.find((setting) => setting.key === 'theme_color')
                ?.value || null,
            loginImageUrl: school.schoolSettings.find((setting) => setting.key === 'login_image_url')?.value || null,
            schoolStartsAt: school.schoolSettings.find((setting) => setting.key === 'SCHOOL_STARTS_AT')?.value || null,
            registrationStartsAt: school.schoolSettings.find((setting) => setting.key === 'REGISTRATION_STARTS_AT')?.value || null,
            isMaintenance: school.schoolSettings.find((setting) => setting.key === 'MAINTENANCE_MODE')
                ?.value === 'true',
        };
    }
    async getAvailableGrades(schoolId) {
        const school = await this.prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true },
        });
        if (!school) {
            throw new localization_1.LocalizedException('enrollment.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        }
        const gradeLevels = await this.schoolSettings.getGradeLevelsForSchool(schoolId);
        return gradeLevels
            .filter((gradeLevel) => gradeLevel.level >= 1)
            .map((gradeLevel) => ({ grade: gradeLevel.level }));
    }
    async assertRequestedGradeAllowed(schoolId, grade) {
        const availableGrades = await this.getAvailableGrades(schoolId);
        if (!availableGrades.some((available) => available.grade === grade)) {
            throw new localization_1.LocalizedException('enrollment.grade_is_not_available_for_this_schools_grade_system_11cac308', undefined, undefined, 'Grade ${grade} is not available for this school\'s grade system');
        }
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
    normalizeStudentStream(stream, grade) {
        if (!grade || ![11, 12].includes(grade)) {
            return null;
        }
        const normalized = String(stream || '')
            .trim()
            .toUpperCase();
        if (!normalized) {
            return null;
        }
        if (!['SOCIAL', 'NATURAL'].includes(normalized)) {
            throw new localization_1.LocalizedException('enrollment.student_stream_must_be_social_or_natural_for_grade_11_and_12_8c69d008', undefined, undefined, 'Student stream must be SOCIAL or NATURAL for Grade 11 and 12');
        }
        return normalized;
    }
    async createEnrollmentRequest(dto) {
        const schoolData = await this.prisma.school.findUnique({
            where: { id: dto.schoolId },
        });
        if (!schoolData) {
            throw new localization_1.LocalizedException('enrollment.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        }
        if (!schoolData.isActive) {
            throw new localization_1.LocalizedException('enrollment.school_is_not_active_046ac9f6', undefined, undefined, 'School is not active');
        }
        const enrollmentOpen = await this.schoolSettings.getSetting(dto.schoolId, 'SELF_ENROLLMENT_ACTIVE');
        const isOpen = enrollmentOpen === true || enrollmentOpen === 'true';
        if (!isOpen) {
            throw new localization_1.LocalizedException('enrollment.online_enrollment_is_currently_closed_6d41f9a8', undefined, undefined, 'Online enrollment is currently closed');
        }
        await this.assertRequestedGradeAllowed(dto.schoolId, dto.requestedGrade);
        const faydaNumber = String(dto.faydaNumber || '').replace(/\D/g, '');
        if (!/^\d{12}$/.test(faydaNumber)) {
            throw new localization_1.LocalizedException('enrollment.fayda_number_fan_must_be_12_digits_7a3c8a9f', undefined, undefined, 'Fayda Number (FAN) must be 12 digits');
        }
        const existingStudentFayda = await this.prisma.studentProfile.findFirst({
            where: { schoolId: dto.schoolId, faydaNumber },
            select: { id: true },
        });
        if (existingStudentFayda) {
            throw new localization_1.LocalizedException('enrollment.fayda_number_fan_is_already_registered_7386d724', undefined, undefined, 'Fayda Number (FAN) is already registered');
        }
        const existingEnrollmentFayda = await this.prisma.enrollmentRequest.findFirst({
            where: {
                schoolId: dto.schoolId,
                faydaNumber,
                status: {
                    in: [
                        client_1.EnrollmentRequestStatus.PENDING,
                        client_1.EnrollmentRequestStatus.WAITLISTED,
                    ],
                },
            },
            select: { id: true },
        });
        if (existingEnrollmentFayda) {
            throw new localization_1.LocalizedException('enrollment.an_active_enrollment_request_already_uses_this_fayda_number__5a66e6ed', undefined, undefined, 'An active enrollment request already uses this Fayda Number (FAN)');
        }
        const requestedStream = this.normalizeStudentStream(dto.requestedStream, dto.requestedGrade);
        if ((dto.requestedGrade === 11 || dto.requestedGrade === 12) &&
            !requestedStream) {
            throw new localization_1.LocalizedException('enrollment.grade_11_and_12_enrollment_requires_social_or_natural_stream_927b3d1e', undefined, undefined, 'Grade 11 and 12 enrollment requires SOCIAL or NATURAL stream');
        }
        if (dto.email) {
            const existingUser = await this.prisma.user.findFirst({
                where: { email: dto.email, schoolId: dto.schoolId },
            });
            if (existingUser) {
                throw new localization_1.LocalizedException('enrollment.a_user_with_this_email_already_exists_daaa1c70', undefined, undefined, 'A user with this email already exists');
            }
        }
        const existingParent = await this.prisma.user.findFirst({
            where: { phone: dto.parentPhone, schoolId: dto.schoolId },
        });
        if (existingParent) {
            throw new localization_1.LocalizedException('enrollment.a_parent_with_this_phone_number_already_exists_1268171c', undefined, undefined, 'A parent with this phone number already exists');
        }
        const academicYear = await this.prisma.academicYear.findUnique({
            where: { id: dto.academicYearId },
        });
        if (!academicYear) {
            throw new localization_1.LocalizedException('enrollment.academic_year_not_found_561c725b', undefined, common_1.HttpStatus.NOT_FOUND, 'Academic year not found');
        }
        if (academicYear.schoolId !== dto.schoolId) {
            throw new localization_1.LocalizedException('enrollment.academic_year_does_not_belong_to_the_selected_school_00d0bf24', undefined, undefined, 'Academic year does not belong to the selected school');
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
                faydaNumber,
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
                requestedStream,
                documents: dto.documents ? JSON.stringify(dto.documents) : null,
            },
        });
        void this.eventBus.emit('enrollment.created', {
            schoolId: dto.schoolId,
            studentId: `${enrollment.firstName} ${enrollment.lastName}`,
            gradeId: String(enrollment.requestedGrade),
        });
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
            throw new localization_1.LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment request not found');
        }
        return enrollment;
    }
    async approveEnrollment(id, schoolId, approvedBy) {
        const enrollment = await this.prisma.enrollmentRequest.findFirst({
            where: { id, schoolId },
        });
        if (!enrollment) {
            throw new localization_1.LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment request not found');
        }
        const approvableStatuses = [
            client_1.EnrollmentRequestStatus.PENDING,
            client_1.EnrollmentRequestStatus.WAITLISTED,
        ];
        if (!approvableStatuses.includes(enrollment.status)) {
            throw new localization_1.LocalizedException('enrollment.enrollment_request_cannot_be_approved_from_status_811c380e', undefined, undefined, 'Enrollment request cannot be approved from status: ${enrollment.status}');
        }
        if (!enrollment.firstName || !enrollment.lastName) {
            throw new localization_1.LocalizedException('enrollment.invalid_enrollment_data_missing_student_name_860bfa87', undefined, undefined, 'Invalid enrollment data: missing student name');
        }
        const requestedStream = this.normalizeStudentStream(enrollment.requestedStream, enrollment.requestedGrade);
        await this.assertRequestedGradeAllowed(schoolId, enrollment.requestedGrade);
        if ((enrollment.requestedGrade === 11 || enrollment.requestedGrade === 12) &&
            !requestedStream) {
            throw new localization_1.LocalizedException('enrollment.grade_11_and_12_enrollment_requires_social_or_natural_stream_4f0544ad', undefined, undefined, 'Grade 11 and 12 enrollment requires SOCIAL or NATURAL stream before approval');
        }
        const className = `Grade ${enrollment.requestedGrade}`;
        let classInfo = await this.prisma.class.findFirst({
            where: {
                schoolId,
                academicYearId: enrollment.academicYearId,
                name: className,
            },
        });
        if (!classInfo) {
            classInfo = await this.prisma.class.create({
                data: {
                    schoolId,
                    academicYearId: enrollment.academicYearId,
                    name: className,
                    section: '',
                    grade: enrollment.requestedGrade,
                },
            });
        }
        const existingSections = await this.prisma.section.findMany({
            where: { classId: classInfo.id },
            include: {
                _count: { select: { studentClasses: true } },
            },
            orderBy: { name: 'asc' },
        });
        let section = existingSections.find((s) => (!s.stream || s.stream === requestedStream) &&
            s._count.studentClasses < s.capacity);
        if (!section) {
            const nextSectionName = String.fromCharCode(65 + existingSections.length);
            section = await this.prisma.section.create({
                data: {
                    classId: classInfo.id,
                    name: nextSectionName,
                    stream: requestedStream,
                    capacity: 30,
                },
            });
        }
        else if (!section.stream) {
            section = await this.prisma.section.update({
                where: { id: section.id },
                data: { stream: requestedStream },
                include: {
                    _count: { select: { studentClasses: true } },
                },
            });
        }
        const sectionName = section.name;
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
            throw new localization_1.LocalizedException('enrollment.failed_to_generate_student_username_6f663242', undefined, undefined, 'Failed to generate student username');
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
                    stream: requestedStream,
                    section: sectionName,
                    rollNumber: String(rollNumber),
                    gender: enrollment.gender,
                    faydaNumber: enrollment.faydaNumber || undefined,
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
                    stream: requestedStream,
                    section: sectionName,
                    rollNumber: String(rollNumber),
                    gender: enrollment.gender,
                    faydaNumber: enrollment.faydaNumber || undefined,
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
            throw new localization_1.LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment request not found');
        }
        const rejectableStatuses = [
            client_1.EnrollmentRequestStatus.PENDING,
            client_1.EnrollmentRequestStatus.WAITLISTED,
        ];
        if (!rejectableStatuses.includes(enrollment.status)) {
            throw new localization_1.LocalizedException('enrollment.enrollment_request_cannot_be_rejected_from_status_c6199927', undefined, undefined, 'Enrollment request cannot be rejected from status: ${enrollment.status}');
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
            throw new localization_1.LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment request not found');
        }
        if (enrollment.status !== client_1.EnrollmentRequestStatus.PENDING) {
            throw new localization_1.LocalizedException('enrollment.enrollment_request_is_not_pending_19200b3a', undefined, undefined, 'Enrollment request is not pending');
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
            throw new localization_1.LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment request not found');
        }
        if (enrollment.status === client_1.EnrollmentRequestStatus.APPROVED) {
            throw new localization_1.LocalizedException('enrollment.cannot_cancel_an_approved_enrollment_71c5999b', undefined, undefined, 'Cannot cancel an approved enrollment');
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
        event_bus_service_1.EventBusService,
        credential_service_1.CredentialService])
], EnrollmentRequestService);
//# sourceMappingURL=enrollment-request.service.js.map