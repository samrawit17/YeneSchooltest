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
exports.CredentialService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const role_enum_1 = require("../auth/types/role.enum");
let CredentialService = class CredentialService {
    prismaService;
    constructor(prismaService) {
        this.prismaService = prismaService;
    }
    async generateStudentAdmissionNumber(schoolId, academicYear) {
        const resolvedAcademicYear = await this.resolveAcademicYearValue(schoolId, academicYear);
        const counter = await this.getOrCreateSchoolYearCounter(schoolId, resolvedAcademicYear);
        const newCount = counter.studentCount + 1;
        await this.prismaService.schoolYearCounter.update({
            where: { id: counter.id },
            data: { studentCount: newCount },
        });
        const sequence = this.padSequence(newCount, 3);
        return `STU-${sequence}`;
    }
    generateTemporaryPassword(length = 10) {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '@#$%&*!?';
        const allChars = uppercase + lowercase + numbers + special;
        let password = '';
        password += this.securePick(uppercase);
        password += this.securePick(lowercase);
        password += this.securePick(numbers);
        password += this.securePick(special);
        for (let i = password.length; i < length; i++) {
            password += this.securePick(allChars);
        }
        return this.shuffleString(password);
    }
    async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }
    async generateStudentCredentials(schoolId, academicYear) {
        const username = await this.generateStudentAdmissionNumber(schoolId, academicYear);
        const temporaryPassword = this.generateTemporaryPassword();
        const hashedPassword = await this.hashPassword(temporaryPassword);
        return {
            username,
            temporaryPassword,
            hashedPassword,
        };
    }
    async generateStaffCredentials(schoolId, role, academicYear) {
        const username = await this.generateStaffId(schoolId, role, academicYear);
        const temporaryPassword = this.generateTemporaryPassword();
        const hashedPassword = await this.hashPassword(temporaryPassword);
        return {
            username,
            temporaryPassword,
            hashedPassword,
        };
    }
    async generateBulkStudentCredentials(schoolId, academicYear, count) {
        const credentials = [];
        for (let i = 0; i < count; i++) {
            const cred = await this.generateStudentCredentials(schoolId, academicYear);
            credentials.push(cred);
        }
        return credentials;
    }
    async generateCredentialSlips(schoolId, credentials) {
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { name: true, code: true, logoUrl: true },
        });
        if (!school) {
            throw new localization_1.LocalizedException('credential.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        }
        return credentials.map((cred) => ({
            schoolLogo: school.logoUrl,
            schoolName: school.name,
            schoolCode: school.code,
            studentName: cred.name,
            admissionNumber: cred.username,
            username: cred.username,
            temporaryPassword: cred.temporaryPassword,
            instructions: [
                'Keep this credential slip secure and confidential.',
                'Log in using the username and temporary password above.',
                'You will be required to change your password on first login.',
                'Do not share your credentials with anyone.',
                'Contact the school administration if you lose your credentials.',
            ],
            generatedAt: new Date(),
        }));
    }
    exportToCSV(credentials) {
        const headers = ['Name', 'Email', 'Username', 'Temporary Password', 'Role'];
        const rows = credentials.map((cred) => [
            cred.name,
            cred.email || '',
            cred.username,
            cred.temporaryPassword,
            cred.role,
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');
        return csvContent;
    }
    validatePasswordStrength(password) {
        const errors = [];
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (password.length > 128) {
            errors.push('Password must be less than 128 characters');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[@#$%&*!?]/.test(password)) {
            errors.push('Password must contain at least one special character (@#$%&!?)');
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    async isUsernameUnique(schoolId, username) {
        const existingUser = await this.prismaService.user.findFirst({
            where: {
                schoolId,
                username,
            },
        });
        return !existingUser;
    }
    async ensureUniqueUsername(schoolId, baseUsername) {
        let username = baseUsername;
        let suffix = 1;
        while (!(await this.isUsernameUnique(schoolId, username))) {
            const match = baseUsername.match(/^(.+)-(\d+)$/);
            if (match) {
                const prefix = match[1];
                const num = parseInt(match[2]) + suffix;
                username = `${prefix}-${this.padSequence(num, 4)}`;
            }
            else {
                username = `${baseUsername}-${suffix}`;
            }
            suffix++;
        }
        return username;
    }
    async createPasswordResetToken(userId) {
        const token = this.generateTemporaryPassword(32);
        const hashedToken = await this.hashPassword(token);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await this.prismaService.passwordResetToken.updateMany({
            where: { userId, used: false },
            data: { used: true, usedAt: new Date() },
        });
        await this.prismaService.passwordResetToken.create({
            data: {
                userId,
                token: hashedToken,
                expiresAt,
            },
        });
        return token;
    }
    async validatePasswordResetToken(token) {
        const tokens = await this.prismaService.passwordResetToken.findMany({
            where: {
                used: false,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
        for (const resetToken of tokens) {
            const isValid = await bcrypt.compare(token, resetToken.token);
            if (isValid) {
                return resetToken.userId;
            }
        }
        return null;
    }
    async markTokenAsUsed(token) {
        const tokens = await this.prismaService.passwordResetToken.findMany({
            where: { used: false },
        });
        for (const resetToken of tokens) {
            const isValid = await bcrypt.compare(token, resetToken.token);
            if (isValid) {
                await this.prismaService.passwordResetToken.update({
                    where: { id: resetToken.id },
                    data: { used: true, usedAt: new Date() },
                });
                break;
            }
        }
    }
    async logCredentialGeneration(schoolId, generatedById, targetType, targetCount, academicYear, usernames) {
        await this.prismaService.credentialGenerationLog.create({
            data: {
                schoolId,
                generatedById,
                targetType,
                targetCount,
                academicYear,
                usernames: JSON.stringify(usernames),
            },
        });
    }
    async getOrCreateSchoolYearCounter(schoolId, academicYear) {
        let counter = await this.prismaService.schoolYearCounter.findUnique({
            where: {
                schoolId_academicYear: {
                    schoolId,
                    academicYear,
                },
            },
        });
        if (!counter) {
            counter = await this.prismaService.schoolYearCounter.create({
                data: {
                    schoolId,
                    academicYear,
                    studentCount: 0,
                    teacherCount: 0,
                    adminCount: 0,
                    parentCount: 0,
                    staffCount: 0,
                },
            });
        }
        return counter;
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
    getRoleTypePrefix(role) {
        switch (role) {
            case role_enum_1.Role.TEACHER:
                return 'TH';
            case role_enum_1.Role.ADMIN:
            case role_enum_1.Role.IT_MANAGER:
                return 'AD';
            case role_enum_1.Role.PARENT:
                return 'PR';
            case role_enum_1.Role.FINANCE:
                return 'FI';
            case role_enum_1.Role.REGISTRAR:
                return 'RE';
            default:
                throw new localization_1.LocalizedException('credential.unsupported_role_for_credential_generation_6dbaf8d1', undefined, undefined, 'Unsupported role for credential generation: ${role}');
        }
    }
    padSequence(num, length) {
        return num.toString().padStart(length, '0');
    }
    shuffleString(str) {
        const arr = str.split('');
        for (let i = arr.length - 1; i > 0; i--) {
            const j = (0, crypto_1.randomInt)(i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join('');
    }
    securePick(chars) {
        return chars[(0, crypto_1.randomInt)(chars.length)];
    }
    async generateStaffId(schoolId, role, academicYear) {
        const roleType = this.getRoleTypePrefix(role);
        const resolvedAcademicYear = academicYear
            ? await this.resolveAcademicYearValue(schoolId, academicYear)
            : `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        const counter = await this.getOrCreateSchoolYearCounter(schoolId, resolvedAcademicYear);
        let newCount;
        let updateField = null;
        switch (role) {
            case role_enum_1.Role.TEACHER:
                newCount = counter.teacherCount + 1;
                updateField = 'teacherCount';
                break;
            case role_enum_1.Role.ADMIN:
            case role_enum_1.Role.IT_MANAGER:
                newCount = counter.adminCount + 1;
                updateField = 'adminCount';
                break;
            case role_enum_1.Role.PARENT:
                newCount = counter.parentCount + 1;
                updateField = 'parentCount';
                break;
            case role_enum_1.Role.FINANCE:
            case role_enum_1.Role.REGISTRAR:
                newCount = counter.staffCount + 1;
                updateField = 'staffCount';
                break;
            default:
                throw new localization_1.LocalizedException('credential.invalid_role_for_staff_id_generation_d091a080', undefined, undefined, 'Invalid role for staff ID generation');
        }
        await this.prismaService.schoolYearCounter.update({
            where: { id: counter.id },
            data: { [updateField]: newCount },
        });
        const sequence = this.padSequence(newCount, 3);
        return `${roleType}-${sequence}`;
    }
    async generateSectionRollNumber(schoolId, className, sectionName, studentName, prismaArg) {
        const prisma = prismaArg || this.prismaService;
        const studentsInSection = await prisma.studentProfile.findMany({
            where: {
                schoolId,
                className,
                section: sectionName,
            },
            include: {
                user: true,
            },
            orderBy: {
                user: { name: 'asc' },
            },
        });
        let position = studentsInSection.length + 1;
        if (studentName) {
            const existingIndex = studentsInSection.findIndex((s) => s.user?.name?.toLowerCase() === studentName.toLowerCase());
            if (existingIndex >= 0) {
                position = existingIndex + 1;
            }
        }
        return String(position);
    }
    async assignRollNumbersByAlphabet(schoolId, academicYear) {
        const studentClasses = await this.prismaService.studentClass.findMany({
            where: { schoolId, academicYear },
            include: {
                student: { select: { name: true } },
                class: { select: { name: true } },
                section: { select: { name: true } },
            },
        });
        const groupedBySection = new Map();
        for (const sc of studentClasses) {
            const key = `${sc.classId}-${sc.sectionId}`;
            if (!groupedBySection.has(key))
                groupedBySection.set(key, []);
            groupedBySection.get(key).push(sc);
        }
        let updated = 0;
        for (const [, students] of groupedBySection) {
            const sorted = [...students].sort((a, b) => (a.student?.name || '').localeCompare(b.student?.name || ''));
            for (let i = 0; i < sorted.length; i++) {
                const profile = await this.prismaService.studentProfile.findFirst({
                    where: { userId: sorted[i].studentId },
                });
                if (profile) {
                    await this.prismaService.studentProfile.update({
                        where: { id: profile.id },
                        data: { rollNumber: String(i + 1) },
                    });
                    updated++;
                }
            }
        }
        return { updated };
    }
    async createPendingCredential(data, prisma = this.prismaService) {
        return prisma.pendingCredential.create({
            data: {
                schoolId: data.schoolId,
                userId: data.userId,
                name: data.name,
                email: data.email || null,
                username: data.username,
                temporaryPassword: data.temporaryPassword,
                role: data.role,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
    }
    async resolveAcademicYearValue(schoolId, academicYear) {
        const academicYearRecord = await this.prismaService.academicYear.findFirst({
            where: {
                schoolId,
                OR: [{ id: academicYear }, { name: academicYear }],
            },
            select: { name: true },
        });
        return academicYearRecord?.name || academicYear;
    }
    async listCredentials(schoolId, options) {
        const { status, role, search, page, limit } = options;
        const skip = (page - 1) * limit;
        const where = { schoolId };
        if (status === 'pending') {
            where.isSent = false;
        }
        else if (status === 'sent') {
            where.isSent = true;
        }
        if (role) {
            where.role = role;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [total, data] = await Promise.all([
            this.prismaService.pendingCredential.count({ where }),
            this.prismaService.pendingCredential.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { id: true, isActive: true },
                    },
                },
            }),
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async getCredentialStats(schoolId) {
        const [total, pending, sent, byRole] = await Promise.all([
            this.prismaService.pendingCredential.count({ where: { schoolId } }),
            this.prismaService.pendingCredential.count({
                where: { schoolId, isSent: false },
            }),
            this.prismaService.pendingCredential.count({
                where: { schoolId, isSent: true },
            }),
            this.prismaService.pendingCredential.groupBy({
                by: ['role'],
                where: { schoolId },
                _count: { role: true },
            }),
        ]);
        return {
            total,
            pending,
            sent,
            byRole: byRole.map((r) => ({ role: r.role, count: r._count.role })),
        };
    }
    async markCredentialSent(id, schoolId, sentVia = 'MANUAL') {
        const credential = await this.prismaService.pendingCredential.findFirst({
            where: { id, schoolId },
        });
        if (!credential) {
            throw new localization_1.LocalizedException('credential.credential_not_found_09d2d2a2', undefined, common_1.HttpStatus.NOT_FOUND, 'Credential not found');
        }
        return this.prismaService.pendingCredential.update({
            where: { id },
            data: {
                isSent: true,
                sentAt: new Date(),
                sentVia,
            },
        });
    }
    async sendBulkCredentials(schoolId, userId) {
        const pending = await this.prismaService.pendingCredential.findMany({
            where: { schoolId, isSent: false },
        });
        let sentCount = 0;
        for (const credential of pending) {
            await this.markCredentialSent(credential.id, schoolId, 'BULK_SEND');
            sentCount++;
        }
        return { message: `Sent ${sentCount} credentials`, count: sentCount };
    }
    async deletePendingCredential(id, schoolId) {
        const credential = await this.prismaService.pendingCredential.findFirst({
            where: { id, schoolId },
            include: {
                user: {
                    select: { id: true, isActive: true },
                },
            },
        });
        if (!credential) {
            throw new localization_1.LocalizedException('credential.credential_not_found_09d2d2a2', undefined, common_1.HttpStatus.NOT_FOUND, 'Credential not found');
        }
        if (credential.userId && credential.user) {
            if (!credential.user.isActive) {
                await this.prismaService.user.delete({
                    where: { id: credential.userId },
                });
            }
        }
        return this.prismaService.pendingCredential.delete({ where: { id } });
    }
};
exports.CredentialService = CredentialService;
exports.CredentialService = CredentialService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CredentialService);
//# sourceMappingURL=credential.service.js.map