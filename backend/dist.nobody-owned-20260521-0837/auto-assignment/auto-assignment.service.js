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
var AutoAssignmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoAssignmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AutoAssignmentService = AutoAssignmentService_1 = class AutoAssignmentService {
    prisma;
    logger = new common_1.Logger(AutoAssignmentService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async autoAssignStudent(enrollmentId, schoolId) {
        try {
            const result = await this.completeAutoAssignment(null, schoolId, enrollmentId);
            return result;
        }
        catch (error) {
            this.logger.error(`Auto-assignment failed for enrollment ${enrollmentId}: ${error.message}`);
            return {
                success: false,
                message: error.message,
            };
        }
    }
    async bulkAutoAssign(enrollmentIds, schoolId) {
        const results = [];
        for (const enrollmentId of enrollmentIds) {
            const result = await this.autoAssignStudent(enrollmentId, schoolId);
            results.push(result);
        }
        return results;
    }
    async reAssignStudent(enrollmentId, schoolId) {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: { id: enrollmentId },
        });
        if (enrollment) {
            await this.prisma.studentClass.deleteMany({
                where: {
                    studentId: enrollment.studentId,
                    academicYear: enrollment.academicYear,
                },
            });
        }
        return this.autoAssignStudent(enrollmentId, schoolId);
    }
    async getStudentAssignment(studentId, schoolId) {
        const assignment = await this.prisma.studentClass.findFirst({
            where: {
                studentId,
                schoolId,
            },
            include: {
                class: true,
                section: true,
            },
        });
        if (!assignment) {
            return {
                hasAssignment: false,
                message: 'Student is not assigned to any class',
            };
        }
        return {
            hasAssignment: true,
            assignment: {
                classId: assignment.classId,
                className: assignment.class?.name,
                sectionId: assignment.sectionId,
                sectionName: assignment.section?.name,
                academicYear: assignment.academicYear,
            },
        };
    }
    async findAcademicYearByName(schoolId, academicYearName) {
        return this.prisma.academicYear.findFirst({
            where: {
                schoolId,
                name: academicYearName,
            },
        });
    }
    async getClassCapacityInfo(schoolId, academicYearId, grade) {
        const classes = await this.prisma.class.findMany({
            where: {
                schoolId,
                academicYearId,
                grade,
            },
            include: {
                sections: {
                    include: {
                        _count: {
                            select: { studentClasses: true },
                        },
                    },
                },
            },
        });
        return classes.map((cls) => ({
            classId: cls.id,
            className: cls.name,
            totalSections: cls.sections.length,
            sections: cls.sections.map((section) => ({
                sectionId: section.id,
                sectionName: section.name,
                capacity: section.capacity,
                currentCount: section._count.studentClasses,
                available: section.capacity - section._count.studentClasses,
            })),
        }));
    }
    async completeAutoAssignment(studentId, schoolId, enrollmentId) {
        return this.prisma.$transaction(async (tx) => {
            const enrollment = await tx.enrollment.findUnique({
                where: { id: enrollmentId },
                include: {
                    student: {
                        include: {
                            studentProfile: true,
                        },
                    },
                },
            });
            if (!enrollment) {
                throw new common_1.NotFoundException(`Enrollment not found: ${enrollmentId}`);
            }
            if (!studentId) {
                studentId = enrollment.studentId;
            }
            if (enrollment.status !== client_1.EnrollmentStatus.APPROVED) {
                return {
                    success: false,
                    message: `Enrollment status is ${enrollment.status}, expected APPROVED`,
                    studentName: enrollment.student?.name,
                };
            }
            const existingAssignment = await tx.studentClass.findFirst({
                where: {
                    studentId: enrollment.studentId,
                    academicYear: enrollment.academicYear,
                },
            });
            if (existingAssignment) {
                return {
                    success: true,
                    message: 'Student is already assigned to a class/section',
                    studentName: enrollment.student?.name,
                    classId: existingAssignment.classId,
                    sectionId: existingAssignment.sectionId,
                };
            }
            const academicYearRecord = await tx.academicYear.findFirst({
                where: {
                    schoolId,
                    name: enrollment.academicYear,
                },
            });
            if (!academicYearRecord) {
                throw new common_1.NotFoundException(`Academic year not found: ${enrollment.academicYear}`);
            }
            const classSectionInfo = await this.findOrCreateClassSection(tx, schoolId, academicYearRecord.id, enrollment.gradeId);
            const rollNumber = await this.generateRollNumber(tx, classSectionInfo.classId, classSectionInfo.sectionId, schoolId);
            await tx.studentClass.create({
                data: {
                    studentId: enrollment.studentId,
                    classId: classSectionInfo.classId,
                    sectionId: classSectionInfo.sectionId,
                    schoolId,
                    academicYear: enrollment.academicYear,
                },
            });
            if (enrollment.student.studentProfile) {
                await tx.studentProfile.update({
                    where: { id: enrollment.student.studentProfile.id },
                    data: {
                        enrollmentStatus: client_1.EnrollmentStatus.APPROVED,
                        academicYear: enrollment.academicYear,
                        className: classSectionInfo.classId,
                        section: classSectionInfo.sectionId,
                        rollNumber,
                    },
                });
            }
            await tx.enrollment.update({
                where: { id: enrollmentId },
                data: { status: client_1.EnrollmentStatus.APPROVED },
            });
            return {
                success: true,
                message: `Auto-assignment completed: ${enrollment.student.name} assigned to class ${classSectionInfo.classId}, section ${classSectionInfo.sectionId}`,
                studentName: enrollment.student?.name,
                classId: classSectionInfo.classId,
                sectionId: classSectionInfo.sectionId,
                rollNumber,
            };
        });
    }
    async findOrCreateClassSection(tx, schoolId, academicYearId, gradeId) {
        if (!gradeId) {
            throw new Error('gradeId is required for auto-assignment');
        }
        let classRecord = await tx.class.findFirst({
            where: {
                schoolId,
                gradeId,
                academicYearId,
            },
        });
        if (!classRecord) {
            classRecord = await tx.class.create({
                data: {
                    schoolId,
                    gradeId,
                    academicYearId,
                    name: `Grade ${gradeId}`,
                    section: 'A',
                },
            });
            this.logger.log(`Created new class for gradeId ${gradeId} for academic year ${academicYearId}`);
        }
        const sections = await tx.section.findMany({
            where: { classId: classRecord.id },
            include: {
                _count: {
                    select: { studentClasses: true },
                },
            },
        });
        let selectedSection = sections.find((s) => s._count.studentClasses < s.capacity);
        if (!selectedSection) {
            const nextSectionLetter = this.getNextSectionLetter(sections.length);
            selectedSection = await tx.section.create({
                data: {
                    classId: classRecord.id,
                    name: nextSectionLetter,
                    capacity: 30,
                },
            });
            this.logger.log(`Created new section ${nextSectionLetter} for class ${classRecord.id}`);
        }
        return {
            classId: classRecord.id,
            sectionId: selectedSection.id,
        };
    }
    async generateRollNumber(tx, classId, sectionId, schoolId) {
        const existingStudents = await tx.studentProfile.findMany({
            where: {
                className: classId,
                section: sectionId,
                schoolId,
            },
            orderBy: {
                rollNumber: 'desc',
            },
            take: 1,
        });
        let nextNumber = 1;
        if (existingStudents.length > 0 && existingStudents[0].rollNumber) {
            const lastRollNumber = existingStudents[0].rollNumber;
            const lastNumber = parseInt(lastRollNumber.replace(/\D/g, ''), 10);
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        return String(nextNumber).padStart(3, '0');
    }
    getNextSectionLetter(currentCount) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return letters[currentCount % letters.length];
    }
};
exports.AutoAssignmentService = AutoAssignmentService;
exports.AutoAssignmentService = AutoAssignmentService = AutoAssignmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AutoAssignmentService);
//# sourceMappingURL=auto-assignment.service.js.map