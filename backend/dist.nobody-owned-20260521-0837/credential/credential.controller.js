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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const credential_service_1 = require("./credential.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const role_enum_1 = require("../auth/types/role.enum");
const prisma_service_1 = require("../prisma/prisma.service");
let CredentialController = class CredentialController {
    credentialService;
    prismaService;
    constructor(credentialService, prismaService) {
        this.credentialService = credentialService;
        this.prismaService = prismaService;
    }
    resolveSchoolScope(reqUser, requestedSchoolId) {
        if (reqUser?.role === role_enum_1.Role.SUPER_ADMIN) {
            if (!requestedSchoolId) {
                throw new common_1.BadRequestException('schoolId is required');
            }
            return requestedSchoolId;
        }
        if (!reqUser?.schoolId) {
            throw new common_1.BadRequestException('School context is required');
        }
        return reqUser.schoolId;
    }
    async createStaffUserRecord(client, data) {
        const now = new Date();
        const rows = await client.$queryRaw(client_1.Prisma.sql `
      INSERT INTO "User" (
        "id",
        "email",
        "username",
        "password",
        "name",
        "role",
        "schoolId",
        "createdAt",
        "updatedAt",
        "mustChangePassword",
        "phone"
      )
      VALUES (
        ${(0, crypto_1.randomUUID)()},
        ${data.email},
        ${data.username},
        ${data.password},
        ${data.name},
        ${data.role}::"Role",
        ${data.schoolId},
        ${now},
        ${now},
        ${data.mustChangePassword},
        ${data.phone ?? null}
      )
      RETURNING "id", "email", "username", "name", "role"
    `);
        return rows[0];
    }
    async previewStudentId(req, schoolId, academicYear) {
        if (!academicYear) {
            throw new common_1.BadRequestException('Academic year is required');
        }
        const effectiveSchoolId = this.resolveSchoolScope(req.user, schoolId);
        const counter = await this.prismaService.schoolYearCounter.findUnique({
            where: {
                schoolId_academicYear: {
                    schoolId: effectiveSchoolId,
                    academicYear,
                },
            },
        });
        const school = await this.prismaService.school.findUnique({
            where: { id: effectiveSchoolId },
            select: { code: true, name: true },
        });
        if (!school) {
            throw new common_1.NotFoundException('School not found');
        }
        const nextSequence = (counter?.studentCount || 0) + 1;
        const year = this.extractYearFromAcademicYear(academicYear);
        return {
            schoolName: school.name,
            schoolCode: school.code,
            academicYear,
            currentCount: counter?.studentCount || 0,
            nextAdmissionNumber: school.code
                ? `${school.code}-${year}-${nextSequence.toString().padStart(4, '0')}`
                : null,
            message: school.code
                ? 'Next admission number preview'
                : 'School code not configured. Please set a school code first.',
        };
    }
    async previewStaffId(req, schoolId, role, academicYear) {
        const effectiveSchoolId = this.resolveSchoolScope(req.user, schoolId);
        const year = academicYear
            ? this.extractYearFromAcademicYear(academicYear)
            : new Date().getFullYear().toString();
        const counter = await this.prismaService.schoolYearCounter.findUnique({
            where: {
                schoolId_academicYear: {
                    schoolId: effectiveSchoolId,
                    academicYear: `${year}-${parseInt(year) + 1}`,
                },
            },
        });
        const school = await this.prismaService.school.findUnique({
            where: { id: effectiveSchoolId },
            select: { code: true, name: true },
        });
        if (!school) {
            throw new common_1.NotFoundException('School not found');
        }
        let nextSequence;
        let roleType;
        switch (role) {
            case role_enum_1.Role.TEACHER:
                nextSequence = (counter?.teacherCount || 0) + 1;
                roleType = 'T';
                break;
            case role_enum_1.Role.ADMIN:
            case role_enum_1.Role.IT_MANAGER:
                nextSequence = (counter?.adminCount || 0) + 1;
                roleType = 'A';
                break;
            case role_enum_1.Role.PARENT:
                nextSequence = (counter?.parentCount || 0) + 1;
                roleType = 'P';
                break;
            default:
                throw new common_1.BadRequestException('Invalid role for staff ID preview');
        }
        return {
            schoolName: school.name,
            schoolCode: school.code,
            role,
            year,
            currentCount: nextSequence - 1,
            nextStaffId: school.code
                ? `${school.code}-${roleType}-${nextSequence.toString().padStart(4, '0')}`
                : null,
            message: school.code
                ? 'Next staff ID preview'
                : 'School code not configured. Please set a school code first.',
        };
    }
    async generateBulkCredentials(dto, req) {
        const schoolId = req.user.schoolId;
        const { count, academicYear, role } = dto;
        if (count < 1 || count > 1000) {
            throw new common_1.BadRequestException('Count must be between 1 and 1000');
        }
        const credentials = [];
        for (let i = 0; i < count; i++) {
            if (role === role_enum_1.Role.STUDENT) {
                const cred = await this.credentialService.generateStudentCredentials(schoolId, academicYear);
                credentials.push({
                    ...cred,
                    role: role_enum_1.Role.STUDENT,
                });
            }
            else if (role === role_enum_1.Role.TEACHER ||
                role === role_enum_1.Role.ADMIN ||
                role === role_enum_1.Role.IT_MANAGER ||
                role === role_enum_1.Role.REGISTRAR ||
                role === role_enum_1.Role.FINANCE) {
                const cred = await this.credentialService.generateStaffCredentials(schoolId, role, academicYear);
                credentials.push({
                    ...cred,
                    role,
                });
            }
            else {
                throw new common_1.BadRequestException('Role must be STUDENT, TEACHER, ADMIN, IT_MANAGER, REGISTRAR, or FINANCE');
            }
        }
        return {
            message: `Generated ${count} credentials for ${role}`,
            credentials,
        };
    }
    async bulkCreateStudents(dto, req) {
        const schoolId = req.user.schoolId;
        const { students, academicYear, grade, className, section } = dto;
        if (!students || students.length === 0) {
            throw new common_1.BadRequestException('At least one student is required');
        }
        if (students.length > 100) {
            throw new common_1.BadRequestException('Maximum 100 students per bulk creation');
        }
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { code: true, name: true },
        });
        if (!school) {
            throw new common_1.NotFoundException('School not found');
        }
        if (!school.code) {
            throw new common_1.BadRequestException(`School code not set for "${school.name}". Please configure a school code first.`);
        }
        const createdStudents = [];
        for (const student of students) {
            const credentials = await this.credentialService.generateStudentCredentials(schoolId, academicYear);
            const user = await this.prismaService.user.create({
                data: {
                    email: student.email || null,
                    username: credentials.username,
                    password: credentials.hashedPassword,
                    name: student.name,
                    role: role_enum_1.Role.STUDENT,
                    schoolId,
                    mustChangePassword: true,
                    phone: student.phone || undefined,
                },
            });
            await this.prismaService.studentProfile.create({
                data: {
                    userId: user.id,
                    schoolId,
                    studentCode: credentials.username,
                    studentId: credentials.username,
                    enrollmentStatus: 'PENDING',
                    academicYear,
                    className: className || 'Pending',
                    section: section || 'Pending',
                    gender: student.gender,
                    address: student.address,
                    phone: student.phone,
                },
            });
            await this.prismaService.enrollment.create({
                data: {
                    studentId: user.id,
                    schoolId,
                    status: 'PENDING',
                    academicYear,
                    grade,
                },
            });
            createdStudents.push({
                id: user.id,
                name: user.name,
                email: user.email,
                username: credentials.username,
                temporaryPassword: credentials.temporaryPassword,
                role: role_enum_1.Role.STUDENT,
            });
        }
        await this.credentialService.logCredentialGeneration(schoolId, req.user.id, 'STUDENT', createdStudents.length, academicYear, createdStudents.map((s) => s.username));
        return {
            message: `Successfully created ${createdStudents.length} students with credentials`,
            students: createdStudents,
            credentials: createdStudents.map((s) => ({
                name: s.name,
                email: s.email,
                username: s.username,
                temporaryPassword: s.temporaryPassword,
                role: s.role,
            })),
            note: 'Temporary passwords are only shown once. Make sure to download or print the credentials.',
        };
    }
    async bulkCreateStaff(dto, req) {
        const schoolId = req.user.schoolId;
        const { staff, academicYear } = dto;
        if (!staff || staff.length === 0) {
            throw new common_1.BadRequestException('At least one staff member is required');
        }
        if (staff.length > 50) {
            throw new common_1.BadRequestException('Maximum 50 staff per bulk creation');
        }
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { code: true, name: true },
        });
        if (!school) {
            throw new common_1.NotFoundException('School not found');
        }
        if (!school.code) {
            throw new common_1.BadRequestException(`School code not set for "${school.name}". Please configure a school code first.`);
        }
        const createdStaff = [];
        for (const member of staff) {
            if (![
                role_enum_1.Role.TEACHER,
                role_enum_1.Role.ADMIN,
                role_enum_1.Role.IT_MANAGER,
                role_enum_1.Role.REGISTRAR,
                role_enum_1.Role.FINANCE,
            ].includes(member.role)) {
                throw new common_1.BadRequestException(`Invalid role: ${member.role}. Must be TEACHER, ADMIN, IT_MANAGER, REGISTRAR, or FINANCE`);
            }
            const credentials = await this.credentialService.generateStaffCredentials(schoolId, member.role, academicYear);
            const user = await this.createStaffUserRecord(this.prismaService, {
                email: member.email,
                username: credentials.username,
                password: credentials.hashedPassword,
                name: member.name,
                role: member.role,
                schoolId,
                mustChangePassword: true,
                phone: member.phone,
            });
            if (member.role === role_enum_1.Role.TEACHER) {
                await this.prismaService.teacherProfile.create({
                    data: {
                        userId: user.id,
                        schoolId,
                        employeeId: credentials.username,
                    },
                });
            }
            createdStaff.push({
                id: user.id,
                name: user.name,
                email: user.email || '',
                username: credentials.username,
                temporaryPassword: credentials.temporaryPassword,
                role: user.role,
            });
        }
        await this.credentialService.logCredentialGeneration(schoolId, req.user.id, 'STAFF', createdStaff.length, academicYear || null, createdStaff.map((s) => s.username));
        return {
            message: `Successfully created ${createdStaff.length} staff with credentials`,
            staff: createdStaff,
            credentials: createdStaff.map((s) => ({
                name: s.name,
                email: s.email,
                username: s.username,
                temporaryPassword: s.temporaryPassword,
                role: s.role,
            })),
            note: 'Temporary passwords are only shown once. Make sure to download or print the credentials.',
        };
    }
    async createStaff(dto, req) {
        const schoolId = req.user.schoolId;
        const { staff, academicYear } = dto;
        if (!staff || staff.length === 0) {
            throw new common_1.BadRequestException('At least one staff member is required');
        }
        if (staff.length > 50) {
            throw new common_1.BadRequestException('Maximum 50 staff per creation');
        }
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { code: true, name: true },
        });
        if (!school) {
            throw new common_1.NotFoundException('School not found');
        }
        const createdStaff = [];
        for (const member of staff) {
            if (![
                role_enum_1.Role.TEACHER,
                role_enum_1.Role.ADMIN,
                role_enum_1.Role.IT_MANAGER,
                role_enum_1.Role.REGISTRAR,
                role_enum_1.Role.FINANCE,
            ].includes(member.role)) {
                throw new common_1.BadRequestException(`Invalid role: ${member.role}. Must be TEACHER, ADMIN, IT_MANAGER, REGISTRAR, or FINANCE`);
            }
            const generateCredentials = member.generateCredentials !== false;
            let username;
            let temporaryPassword;
            let hashedPassword;
            if (generateCredentials) {
                const credentials = await this.credentialService.generateStaffCredentials(schoolId, member.role, academicYear);
                username = credentials.username;
                temporaryPassword = credentials.temporaryPassword;
                hashedPassword = credentials.hashedPassword;
            }
            else {
                if (!member.username || !member.password) {
                    throw new common_1.BadRequestException(`Username and password are required when generateCredentials is false`);
                }
                username = member.username;
                temporaryPassword = member.password;
                hashedPassword = await this.credentialService.hashPassword(member.password);
            }
            const createdMember = await this.prismaService.$transaction(async (tx) => {
                const user = await this.createStaffUserRecord(tx, {
                    email: member.email,
                    username,
                    password: hashedPassword,
                    name: member.name,
                    role: member.role,
                    schoolId,
                    mustChangePassword: generateCredentials,
                    phone: member.phone,
                });
                if (member.role === role_enum_1.Role.TEACHER) {
                    await tx.teacherProfile.create({
                        data: {
                            userId: user.id,
                            schoolId,
                            employeeId: username,
                        },
                    });
                }
                await this.credentialService.createPendingCredential({
                    schoolId,
                    userId: user.id,
                    name: member.name,
                    email: member.email,
                    username,
                    temporaryPassword,
                    role: member.role.toString(),
                }, tx);
                return user;
            });
            createdStaff.push({
                id: createdMember.id,
                name: createdMember.name,
                email: createdMember.email || '',
                username: createdMember.username || '',
                temporaryPassword,
                role: createdMember.role,
                wasAutoGenerated: generateCredentials,
            });
        }
        await this.credentialService.logCredentialGeneration(schoolId, req.user.id, 'STAFF', createdStaff.length, academicYear || null, createdStaff.map((s) => s.username));
        const generateCredentials = dto.staff[0]?.generateCredentials !== false;
        return {
            message: `Successfully created ${createdStaff.length} staff`,
            staff: createdStaff,
            credentials: createdStaff.map((s) => ({
                name: s.name,
                email: s.email,
                username: s.username,
                temporaryPassword: s.temporaryPassword,
                role: s.role,
                wasAutoGenerated: s.wasAutoGenerated,
            })),
            note: generateCredentials
                ? 'Temporary passwords are only shown once. Make sure to download or print the credentials.'
                : 'Custom passwords were provided by the user.',
        };
    }
    async createStudents(dto, req) {
        const schoolId = req.user.schoolId;
        const { students, academicYear } = dto;
        if (!students || students.length === 0) {
            throw new common_1.BadRequestException('At least one student is required');
        }
        if (students.length > 100) {
            throw new common_1.BadRequestException('Maximum 100 students per creation');
        }
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { code: true, name: true },
        });
        if (!school) {
            throw new common_1.NotFoundException('School not found');
        }
        const createdStudents = [];
        for (const student of students) {
            const generateCredentials = student.generateCredentials !== false;
            let username;
            let temporaryPassword;
            let hashedPassword;
            if (generateCredentials) {
                if (!school.code) {
                    throw new common_1.BadRequestException(`School code not set for "${school.name}". Please configure a school code first.`);
                }
                const credentials = await this.credentialService.generateStudentCredentials(schoolId, academicYear || new Date().getFullYear().toString());
                username = credentials.username;
                temporaryPassword = credentials.temporaryPassword;
                hashedPassword = credentials.hashedPassword;
            }
            else {
                if (!student.username || !student.password) {
                    throw new common_1.BadRequestException(`Username and password are required when generateCredentials is false`);
                }
                username = student.username;
                temporaryPassword = student.password;
                hashedPassword = await this.credentialService.hashPassword(student.password);
            }
            const createdStudent = await this.prismaService.$transaction(async (tx) => {
                let assignedClassName = 'Pending';
                let assignedSectionName;
                let rollNumber;
                if (student.classId) {
                    const selectedClass = await tx.class.findFirst({
                        where: { id: student.classId, schoolId },
                        select: { id: true, name: true },
                    });
                    if (!selectedClass) {
                        throw new common_1.NotFoundException(`Class not found: ${student.classId}`);
                    }
                    assignedClassName = selectedClass.name;
                    if (student.sectionId) {
                        const selectedSection = await tx.section.findFirst({
                            where: { id: student.sectionId, classId: selectedClass.id },
                            select: { id: true, name: true },
                        });
                        if (!selectedSection) {
                            throw new common_1.NotFoundException(`Section not found: ${student.sectionId}`);
                        }
                        assignedSectionName = selectedSection.name;
                        rollNumber =
                            await this.credentialService.generateSectionRollNumber(schoolId, assignedClassName, assignedSectionName, undefined, tx);
                    }
                }
                const user = await tx.user.create({
                    data: {
                        email: student.email || null,
                        username,
                        password: hashedPassword,
                        name: student.name,
                        role: role_enum_1.Role.STUDENT,
                        schoolId,
                        mustChangePassword: generateCredentials,
                        phone: student.phone || undefined,
                    },
                });
                const profile = await tx.studentProfile.create({
                    data: {
                        userId: user.id,
                        schoolId,
                        studentCode: username,
                        studentId: username,
                        enrollmentStatus: student.classId && student.sectionId ? 'APPROVED' : 'PENDING',
                        academicYear,
                        className: assignedClassName,
                        section: assignedSectionName,
                        rollNumber,
                        phone: student.phone,
                        motherName: student.motherName || null,
                        motherPhone: student.motherPhone || null,
                    },
                });
                await tx.enrollment.create({
                    data: {
                        studentId: user.id,
                        schoolId,
                        status: student.classId && student.sectionId ? 'APPROVED' : 'PENDING',
                        academicYear: academicYear || new Date().getFullYear().toString(),
                    },
                });
                if (student.classId && student.sectionId) {
                    await tx.studentClass.create({
                        data: {
                            studentId: user.id,
                            classId: student.classId,
                            sectionId: student.sectionId,
                            schoolId,
                            academicYear: academicYear || new Date().getFullYear().toString(),
                        },
                    });
                }
                await this.credentialService.createPendingCredential({
                    schoolId,
                    userId: user.id,
                    name: student.name,
                    email: student.email || null,
                    username,
                    temporaryPassword,
                    role: role_enum_1.Role.STUDENT.toString(),
                }, tx);
                return { user, profile };
            });
            createdStudents.push({
                id: createdStudent.user.id,
                name: createdStudent.user.name,
                email: createdStudent.user.email,
                username: createdStudent.user.username || '',
                temporaryPassword,
                role: createdStudent.user.role,
                wasAutoGenerated: generateCredentials,
            });
        }
        await this.credentialService.logCredentialGeneration(schoolId, req.user.id, 'STUDENT', createdStudents.length, academicYear || null, createdStudents.map((s) => s.username));
        const generateCredentials = dto.students[0]?.generateCredentials !== false;
        return {
            message: `Successfully created ${createdStudents.length} students`,
            students: createdStudents,
            credentials: createdStudents.map((s) => ({
                name: s.name,
                email: s.email,
                username: s.username,
                temporaryPassword: s.temporaryPassword,
                role: s.role,
                wasAutoGenerated: s.wasAutoGenerated,
            })),
            note: generateCredentials
                ? 'Temporary passwords are only shown once. Make sure to download or print the credentials.'
                : 'Custom passwords were provided by the user.',
        };
    }
    async exportCredentialsToCSV(credentials, res) {
        const csv = this.credentialService.exportToCSV(credentials);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=credentials.csv');
        res.send(csv);
    }
    async generateCredentialSlips(credentials, req) {
        const schoolId = req.user.schoolId;
        const slips = await this.credentialService.generateCredentialSlips(schoolId, credentials);
        return {
            slips,
            printableFormat: slips.map((slip) => ({
                title: 'STUDENT CREDENTIAL SLIP',
                header: `
          ${slip.schoolLogo ? `<img src="${slip.schoolLogo}" alt="School Logo" style="max-width: 100px; max-height: 100px;" />` : ''}
          <h1>${slip.schoolName}</h1>
          <p>School Code: ${slip.schoolCode}</p>
        `,
                body: `
          <div style="border: 2px solid #000; padding: 20px; margin: 10px;">
            <h2>Student Information</h2>
            <p><strong>Name:</strong> ${slip.studentName}</p>
            <p><strong>Admission Number:</strong> ${slip.admissionNumber}</p>
            <hr />
            <h2>Login Credentials</h2>
            <p><strong>Username:</strong> ${slip.username}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 5px;">${slip.temporaryPassword}</code></p>
            <hr />
            <h2>Important Instructions</h2>
            <ul>
              ${slip.instructions.map((i) => `<li>${i}</li>`).join('')}
            </ul>
            <p><em>Generated on: ${slip.generatedAt.toLocaleDateString()}</em></p>
          </div>
        `,
            })),
        };
    }
    async validatePassword(password) {
        return this.credentialService.validatePasswordStrength(password);
    }
    async checkUsername(username, req) {
        const schoolId = req.user.schoolId;
        const isUnique = await this.credentialService.isUsernameUnique(schoolId, username);
        return {
            username,
            isUnique,
            message: isUnique
                ? 'Username is available'
                : 'Username already exists in this school',
        };
    }
    async listCredentials(req, status, role, search, page, limit) {
        const schoolId = req.user.schoolId;
        const pageNum = parseInt(page || '1');
        const limitNum = parseInt(limit || '20');
        return this.credentialService.listCredentials(schoolId, {
            status: status || 'all',
            role,
            search,
            page: pageNum,
            limit: limitNum,
        });
    }
    async getCredentialStats(req) {
        const schoolId = req.user.schoolId;
        return this.credentialService.getCredentialStats(schoolId);
    }
    async markAsSent(id, sentVia = 'MANUAL', req) {
        const schoolId = req.user.schoolId;
        return this.credentialService.markCredentialSent(id, schoolId, sentVia);
    }
    async deleteCredential(id, req) {
        const schoolId = req.user.schoolId;
        await this.credentialService.deletePendingCredential(id, schoolId);
        return { success: true, message: 'Credential deleted successfully' };
    }
    async assignRollNumbersByAlphabet(req, body) {
        const schoolId = req.user.schoolId;
        const result = await this.credentialService.assignRollNumbersByAlphabet(schoolId, body.academicYearId);
        return { success: true, ...result };
    }
    extractYearFromAcademicYear(academicYear) {
        if (academicYear.includes('-')) {
            const parts = academicYear.split('-');
            return parts[parts.length - 1];
        }
        if (academicYear.includes('/')) {
            const parts = academicYear.split('/');
            return parts[parts.length - 1];
        }
        return academicYear;
    }
};
exports.CredentialController = CredentialController;
__decorate([
    (0, common_1.Get)('preview/student/:schoolId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('schoolId')),
    __param(2, (0, common_1.Query)('academicYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "previewStudentId", null);
__decorate([
    (0, common_1.Get)('preview/staff/:schoolId'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('schoolId')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Query)('academicYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "previewStaffId", null);
__decorate([
    (0, common_1.Post)('generate/bulk'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "generateBulkCredentials", null);
__decorate([
    (0, common_1.Post)('students/bulk'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "bulkCreateStudents", null);
__decorate([
    (0, common_1.Post)('staff/bulk'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "bulkCreateStaff", null);
__decorate([
    (0, common_1.Post)('staff/create'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "createStaff", null);
__decorate([
    (0, common_1.Post)('students/create'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "createStudents", null);
__decorate([
    (0, common_1.Post)('export/csv'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "exportCredentialsToCSV", null);
__decorate([
    (0, common_1.Post)('slips'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "generateCredentialSlips", null);
__decorate([
    (0, common_1.Post)('validate-password'),
    __param(0, (0, common_1.Body)('password')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "validatePassword", null);
__decorate([
    (0, common_1.Get)('check-username/:username'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "checkUsername", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "listCredentials", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "getCredentialStats", null);
__decorate([
    (0, common_1.Post)(':id/send'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('sentVia')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "markAsSent", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "deleteCredential", null);
__decorate([
    (0, common_1.Post)('assign-roll-numbers'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CredentialController.prototype, "assignRollNumbersByAlphabet", null);
exports.CredentialController = CredentialController = __decorate([
    (0, common_1.Controller)('credentials'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [credential_service_1.CredentialService,
        prisma_service_1.PrismaService])
], CredentialController);
//# sourceMappingURL=credential.controller.js.map