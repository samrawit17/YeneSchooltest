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
exports.EnrollmentService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const school_service_1 = require("../school/school.service");
const academic_year_service_1 = require("../academic-year/academic-year.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const client_1 = require("@prisma/client");
const crypto = __importStar(require("crypto"));
let EnrollmentService = class EnrollmentService {
    prisma;
    schoolService;
    academicYearService;
    eventBus;
    constructor(prisma, schoolService, academicYearService, eventBus) {
        this.prisma = prisma;
        this.schoolService = schoolService;
        this.academicYearService = academicYearService;
        this.eventBus = eventBus;
    }
    async resolveSchoolByKey(enrollmentKey) {
        const school = await this.schoolService.getSchoolByEnrollmentKey(enrollmentKey);
        if (!school) {
            throw new localization_1.LocalizedException('enrollment.invalid_enrollment_key_f6383576', undefined, common_1.HttpStatus.NOT_FOUND, 'Invalid enrollment key');
        }
        return school;
    }
    generateEnrollmentToken(schoolId) {
        const payload = JSON.stringify({ schoolId, exp: Date.now() + 3600000 });
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(payload, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }
    verifyEnrollmentToken(token) {
        try {
            const [ivHex, authTagHex, encrypted] = token.split(':');
            if (!ivHex || !authTagHex || !encrypted) {
                return { valid: false, error: 'Invalid token format' };
            }
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            const payload = JSON.parse(decrypted);
            if (payload.exp < Date.now()) {
                return { valid: false, error: 'Token expired' };
            }
            return { valid: true, schoolId: payload.schoolId };
        }
        catch (error) {
            return { valid: false, error: 'Invalid token' };
        }
    }
    getSchoolIdFromToken(token) {
        const result = this.verifyEnrollmentToken(token);
        if (!result.valid || !result.schoolId) {
            throw new localization_1.LocalizedException('enrollment.invalid_or_expired_enrollment_token_e372a38b', undefined, common_1.HttpStatus.NOT_FOUND, 'Invalid or expired enrollment token');
        }
        return result.schoolId;
    }
    async approveEnrollment(enrollmentId, schoolId) {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                gradeLevel: true,
                student: {
                    include: {
                        studentProfile: {
                            include: {
                                parents: {
                                    include: {
                                        parent: {
                                            include: {
                                                user: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!enrollment) {
            throw new localization_1.LocalizedException('enrollment.enrollment_not_found_a5c5ebf0', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment not found');
        }
        if (enrollment.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('enrollment.enrollment_does_not_belong_to_this_school_8b1685e0', undefined, undefined, 'Enrollment does not belong to this school');
        }
        if (enrollment.status !== client_1.EnrollmentStatus.PENDING) {
            throw new localization_1.LocalizedException('enrollment.enrollment_is_not_pending_5a9c23f5', undefined, undefined, 'Enrollment is not pending');
        }
        const autoSectionAssignment = await this.isAutoSectionAssignmentEnabled(schoolId);
        let targetClass = null;
        let availableSection = null;
        if (autoSectionAssignment) {
            const academicYear = await this.academicYearService.getActiveAcademicYear(schoolId);
            if (!academicYear) {
                throw new localization_1.LocalizedException('enrollment.no_active_academic_year_found_47ece9b3', undefined, undefined, 'No active academic year found');
            }
            targetClass = await this.findClassForGrade(enrollment.gradeId, academicYear.id, schoolId);
            if (!targetClass) {
                throw new localization_1.LocalizedException('enrollment.no_class_found_for_grade_in_the_current_academic_year_9291ea69', undefined, undefined, 'No class found for grade ${enrollment.gradeLevel?.name || enrollment.gradeId} in the current academic year');
            }
            availableSection = await this.findAvailableSection(targetClass.id);
            if (!availableSection) {
                throw new localization_1.LocalizedException('enrollment.all_sections_are_full_cannot_approve_enrollment_7a3639ca', undefined, undefined, 'All sections are full. Cannot approve enrollment.');
            }
            await this.prisma.studentClass.create({
                data: {
                    studentId: enrollment.studentId,
                    classId: targetClass.id,
                    sectionId: availableSection.id,
                    schoolId,
                    academicYear: academicYear.name,
                },
            });
        }
        const updatedEnrollment = await this.prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { status: client_1.EnrollmentStatus.APPROVED },
        });
        const className = targetClass
            ? `${targetClass.name}${availableSection ? ` - ${availableSection.name}` : ''}`
            : enrollment.gradeLevel?.name || 'their class';
        void this.eventBus.emit('enrollment.approved', {
            schoolId,
            studentId: enrollment.studentId,
            studentName: enrollment.student.name || 'Student',
            className,
            approvedBy: 'system',
        });
        return updatedEnrollment;
    }
    async isAutoSectionAssignmentEnabled(schoolId) {
        const setting = await this.prisma.schoolSetting.findUnique({
            where: {
                schoolId_key: {
                    schoolId,
                    key: 'autoSectionAssignment',
                },
            },
        });
        if (!setting) {
            return true;
        }
        return setting.value === 'true';
    }
    async findClassForGrade(gradeId, academicYearId, schoolId) {
        if (!gradeId) {
            return null;
        }
        return this.prisma.class.findFirst({
            where: {
                gradeId,
                academicYearId,
                schoolId,
            },
            select: {
                id: true,
                name: true,
            },
        });
    }
    async findAvailableSection(classId) {
        const sections = await this.prisma.section.findMany({
            where: { classId },
            include: {
                _count: {
                    select: { studentClasses: true },
                },
            },
        });
        const availableSections = sections.filter((section) => section._count.studentClasses < section.capacity);
        if (availableSections.length === 0) {
            return null;
        }
        availableSections.sort((a, b) => a._count.studentClasses - b._count.studentClasses);
        return {
            id: availableSections[0].id,
            name: availableSections[0].name,
        };
    }
    async getEnrollmentById(enrollmentId) {
        return this.prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                gradeLevel: true,
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    async getEnrollmentsBySchool(schoolId, status) {
        return this.prisma.enrollment.findMany({
            where: {
                schoolId,
                ...(status && { status }),
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                gradeLevel: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createEnrollment(data) {
        const enrollment = await this.prisma.enrollment.create({
            data: {
                studentId: data.studentId,
                schoolId: data.schoolId,
                academicYear: data.academicYear,
                gradeId: data.gradeId,
                documents: data.documents,
                metadata: data.metadata,
                status: client_1.EnrollmentStatus.PENDING,
            },
            include: {
                student: true,
                gradeLevel: true,
            },
        });
        void this.eventBus.emit('enrollment.created', {
            schoolId: data.schoolId,
            studentId: enrollment.studentId,
            gradeId: enrollment.gradeLevel?.name || data.gradeId || 'Unknown grade',
        });
        return enrollment;
    }
    async rejectEnrollment(enrollmentId, schoolId, reason) {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                student: {
                    include: {
                        studentProfile: {
                            include: {
                                parents: {
                                    include: {
                                        parent: {
                                            include: {
                                                user: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!enrollment) {
            throw new localization_1.LocalizedException('enrollment.enrollment_not_found_a5c5ebf0', undefined, common_1.HttpStatus.NOT_FOUND, 'Enrollment not found');
        }
        if (enrollment.schoolId !== schoolId) {
            throw new localization_1.LocalizedException('enrollment.enrollment_does_not_belong_to_this_school_8b1685e0', undefined, undefined, 'Enrollment does not belong to this school');
        }
        const updatedEnrollment = await this.prisma.enrollment.update({
            where: { id: enrollmentId },
            data: {
                status: client_1.EnrollmentStatus.REJECTED,
                rejectionReason: reason,
            },
        });
        void this.eventBus.emit('enrollment.rejected', {
            schoolId,
            studentId: enrollment.studentId,
            studentName: enrollment.student.name || 'Student',
            reason,
            rejectedBy: 'system',
        });
        return updatedEnrollment;
    }
};
exports.EnrollmentService = EnrollmentService;
exports.EnrollmentService = EnrollmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        school_service_1.SchoolService,
        academic_year_service_1.AcademicYearService,
        event_bus_service_1.EventBusService])
], EnrollmentService);
//# sourceMappingURL=enrollment.service.js.map