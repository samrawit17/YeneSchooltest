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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.JWT_COOKIE_NAME = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const role_enum_1 = require("./types/role.enum");
const client_1 = require("@prisma/client");
const credential_service_1 = require("../credential/credential.service");
const notification_service_1 = require("../notification/notification.service");
const default_permissions_constant_1 = require("./constants/default-permissions.constant");
exports.JWT_COOKIE_NAME = 'Authentication';
const SCHOOL_SETTING_ALLOW_SELF_ENROLLMENT = 'ALLOW_SELF_ENROLLMENT';
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_EXTENSIONS_BY_MIME = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};
let AuthService = class AuthService {
    prismaService;
    jwtService;
    credentialService;
    notificationService;
    constructor(prismaService, jwtService, credentialService, notificationService) {
        this.prismaService = prismaService;
        this.jwtService = jwtService;
        this.credentialService = credentialService;
        this.notificationService = notificationService;
    }
    normalizeUsername(username) {
        return username.trim();
    }
    async validateUser(loginIdentifier, password) {
        const user = await this.prismaService.user.findFirst({
            where: {
                OR: [
                    { email: loginIdentifier },
                    { username: loginIdentifier },
                    { phone: loginIdentifier },
                ],
            },
            select: {
                id: true,
                email: true,
                username: true,
                password: true,
                name: true,
                role: true,
                schoolId: true,
                theme: true,
                phone: true,
                avatarUrl: true,
                isActive: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
                userPermissions: {
                    include: { permission: true },
                },
                school: {
                    select: {
                        schoolSettings: {
                            where: {
                                key: 'calendar_type',
                            },
                            select: { value: true },
                        },
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Your account has been deactivated. Please contact school administration for more information.');
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const portalAccessKeyMap = {
            TEACHER: 'TEACHER_PORTAL_ACCESS',
            STUDENT: 'STUDENT_PORTAL_ACCESS',
            PARENT: 'PARENT_PORTAL_ACCESS',
            FINANCE: 'FINANCE_PORTAL_ACCESS',
            REGISTRAR: 'REGISTRAR_PORTAL_ACCESS',
        };
        const portalKey = portalAccessKeyMap[user.role];
        if (portalKey && user.schoolId) {
            const portalSetting = await this.prismaService.schoolSetting.findUnique({
                where: {
                    schoolId_key: { schoolId: user.schoolId, key: portalKey },
                },
                select: { value: true },
            });
            if (portalSetting && portalSetting.value === 'false') {
                throw new common_1.UnauthorizedException('This portal is currently disabled. Please contact your school administration.');
            }
        }
        await this.prismaService.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const calendarType = user.school?.schoolSettings?.[0]?.value || 'ETHIOPIAN';
        const rolePermissions = await this.prismaService.rolePermission.findMany({
            where: { role: user.role },
            include: { permission: true },
        });
        const defaultRolePerms = default_permissions_constant_1.DEFAULT_ROLE_PERMISSIONS[user.role] || [];
        const allPermissions = new Set([
            ...defaultRolePerms,
            ...user.userPermissions.map((up) => up.permission.name),
            ...rolePermissions.map((rp) => rp.permission.name),
        ]);
        if (user.role === role_enum_1.Role.IT_MANAGER) {
            for (const forbiddenPermission of default_permissions_constant_1.IT_MANAGER_FORBIDDEN_PERMISSIONS) {
                allPermissions.delete(forbiddenPermission);
            }
        }
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
            schoolId: user.schoolId,
            calendarType,
            theme: user.theme || 'SYSTEM',
            phone: user.phone || null,
            avatarUrl: user.avatarUrl || null,
            mustChangePassword: user.mustChangePassword,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            permissions: Array.from(allPermissions),
        };
    }
    async getUsersWithRoleTextFilter(params) {
        const { schoolId, role, roles, filters } = params;
        const effectiveRoles = roles?.length ? roles : role ? [role] : [];
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const skip = (page - 1) * limit;
        const search = filters?.search?.trim();
        const searchPattern = search ? `%${search}%` : null;
        const roleListSql = client_1.Prisma.join(effectiveRoles.map((value) => client_1.Prisma.sql `${value}`));
        const schoolSql = schoolId
            ? client_1.Prisma.sql `AND "schoolId" = ${schoolId}`
            : client_1.Prisma.empty;
        const searchSql = searchPattern
            ? client_1.Prisma.sql `AND ("name" ILIKE ${searchPattern} OR "email" ILIKE ${searchPattern} OR "username" ILIKE ${searchPattern})`
            : client_1.Prisma.empty;
        const countRows = await this.prismaService.$queryRaw(client_1.Prisma.sql `
        SELECT COUNT(*)::int AS count
        FROM "User"
        WHERE "role"::text IN (${roleListSql})
        ${schoolSql}
        ${searchSql}
      `);
        const users = await this.prismaService.$queryRaw(client_1.Prisma.sql `
        SELECT
          "id",
          "email",
          "username",
          "name",
          "role",
          "schoolId",
          "isActive",
          "phone",
          "avatarUrl",
          "createdAt",
          "updatedAt"
        FROM "User"
        WHERE "role"::text IN (${roleListSql})
        ${schoolSql}
        ${searchSql}
        ORDER BY "createdAt" DESC
        OFFSET ${skip}
        LIMIT ${limit}
      `);
        const total = countRows[0]?.count || 0;
        return {
            data: users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async login(user, res) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        const token = this.jwtService.sign(payload);
        if (res) {
            res.cookie(exports.JWT_COOKIE_NAME, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000,
            });
        }
        return {
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                role: user.role,
                schoolId: user.schoolId,
                calendarType: user.calendarType || 'ETHIOPIAN',
                theme: user.theme || 'SYSTEM',
                phone: user.phone || null,
                avatarUrl: user.avatarUrl || null,
                mustChangePassword: user.mustChangePassword,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                permissions: user.permissions,
            },
        };
    }
    async logout(res) {
        if (res) {
            res.clearCookie(exports.JWT_COOKIE_NAME);
        }
        return { message: 'Logged out successfully' };
    }
    async registerAdmin(email, password, name, schoolId) {
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!schoolId) {
            throw new Error('ADMIN role requires a schoolId');
        }
        const existingUser = await this.prismaService.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return { success: false, message: 'An account with this email already exists' };
        }
        await this.prismaService.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role_enum_1.Role.ADMIN,
                schoolId,
            },
        });
        return { success: true, message: 'Admin created successfully' };
    }
    async registerItManager(email, password, name, schoolId) {
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!schoolId) {
            throw new Error('IT_MANAGER role requires a schoolId');
        }
        const existingUser = await this.prismaService.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return { success: false, message: 'An account with this email already exists' };
        }
        await this.prismaService.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role_enum_1.Role.IT_MANAGER,
                schoolId,
            },
        });
        return { success: true, message: 'IT Manager created successfully' };
    }
    async registerTeacher(email, name, schoolId) {
        const staffId = await this.credentialService.generateStaffId(schoolId, role_enum_1.Role.TEACHER);
        const temporaryPassword = this.credentialService.generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        const user = await this.prismaService.user.create({
            data: {
                email,
                username: staffId,
                password: hashedPassword,
                name,
                role: role_enum_1.Role.TEACHER,
                schoolId,
                mustChangePassword: true,
            },
        });
        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                role: user.role,
            },
            credentials: {
                username: staffId,
                temporaryPassword,
            },
        };
    }
    async registerStudent(email, password, name, schoolId) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const studentCode = await this.credentialService.generateStudentAdmissionNumber(schoolId, new Date().getFullYear().toString());
        return this.prismaService.user.create({
            data: {
                email,
                username: studentCode,
                password: hashedPassword,
                name,
                role: role_enum_1.Role.STUDENT,
                schoolId,
                mustChangePassword: true,
            },
        });
    }
    async registerParent(email, password, name, schoolId) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const parentUsername = await this.credentialService.generateStaffId(schoolId, role_enum_1.Role.PARENT);
        return this.prismaService.user.create({
            data: {
                email,
                username: parentUsername,
                password: hashedPassword,
                name,
                role: role_enum_1.Role.PARENT,
                schoolId,
                mustChangePassword: true,
            },
        });
    }
    async registerRegistrar(email, password, name, schoolId) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return this.prismaService.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role_enum_1.Role.REGISTRAR,
                schoolId,
            },
        });
    }
    async registerStudentSelf(studentData) {
        const selfEnrollmentEnabled = await this.prismaService.schoolSetting.findUnique({
            where: {
                schoolId_key: {
                    schoolId: studentData.schoolId,
                    key: SCHOOL_SETTING_ALLOW_SELF_ENROLLMENT,
                },
            },
        });
        if (!selfEnrollmentEnabled || selfEnrollmentEnabled.value !== 'true') {
            throw new common_1.BadRequestException('Self-enrollment is not enabled for this school. Please contact your school administrator.');
        }
        const { email, password, name, schoolId, academicYear, gradeId, gender, address, phone, emergencyContact, guardianName, guardianPhone, guardianEmail, photo, documents, } = studentData;
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
        });
        if (!school) {
            throw new Error('School not found');
        }
        const existingUser = await this.prismaService.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new Error('Email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const studentCode = await this.generateStudentCode(schoolId);
        const user = await this.prismaService.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role_enum_1.Role.STUDENT,
                schoolId,
                avatarUrl: photo || undefined,
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
                gender,
                address,
                phone,
                emergencyContact: emergencyContact
                    ? JSON.stringify(emergencyContact)
                    : undefined,
                documents: documents ? JSON.stringify(documents) : undefined,
                className: 'Pending Assignment',
                section: 'Pending Assignment',
                rollNumber: 'Pending Assignment',
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
            message: 'Student registration successful. Please contact your school administration for class assignment.',
        };
    }
    async generateStudentCode(schoolId) {
        const school = await this.prismaService.school.findUnique({
            where: { id: schoolId },
            select: { name: true },
        });
        if (!school) {
            throw new Error('School not found');
        }
        const schoolPrefix = school.name.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
        return `${schoolPrefix}${timestamp}${random}`;
    }
    async getUsers(role, roles, filters) {
        if (role || roles?.length) {
            return this.getUsersWithRoleTextFilter({ role, roles, filters });
        }
        const where = {};
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { username: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const skip = (page - 1) * limit;
        const total = await this.prismaService.user.count({ where });
        const users = await this.prismaService.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                schoolId: true,
                isActive: true,
                phone: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
        return {
            data: users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getUsersBySchool(schoolId, role, roles, filters) {
        if (role || roles?.length) {
            return this.getUsersWithRoleTextFilter({
                schoolId,
                role,
                roles,
                filters,
            });
        }
        const where = { schoolId };
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { username: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const skip = (page - 1) * limit;
        const total = await this.prismaService.user.count({ where });
        const users = await this.prismaService.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                role: true,
                schoolId: true,
                isActive: true,
                phone: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
        return {
            data: users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getUserById(id) {
        const user = await this.prismaService.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                schoolId: true,
                isActive: true,
                phone: true,
                avatarUrl: true,
                theme: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true,
                teacherProfile: {
                    select: {
                        id: true,
                        employeeId: true,
                        designation: true,
                        qualification: true,
                        specialization: true,
                        hireDate: true,
                        experienceYears: true,
                        department: {
                            select: { name: true },
                        },
                    },
                },
            },
        });
        return user;
    }
    async updateUser(id, data) {
        const updateData = {};
        if (data.email) {
            updateData.email = data.email;
        }
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }
        if (data.name) {
            updateData.name = data.name;
        }
        if (data.theme) {
            updateData.theme = data.theme;
        }
        if (data.phone !== undefined) {
            updateData.phone = data.phone;
        }
        if (data.avatarUrl !== undefined) {
            updateData.avatarUrl = data.avatarUrl;
        }
        return this.prismaService.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                schoolId: true,
                isActive: true,
                phone: true,
                avatarUrl: true,
                theme: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }
    async uploadUserAvatar(targetUserId, requester, file) {
        if (!file) {
            throw new common_1.BadRequestException('Avatar file is required');
        }
        if (file.size > AVATAR_MAX_BYTES) {
            throw new common_1.BadRequestException('Avatar image must be 2MB or smaller');
        }
        const extension = AVATAR_EXTENSIONS_BY_MIME[file.mimetype];
        if (!extension) {
            throw new common_1.BadRequestException('Avatar image must be a JPG, PNG, or WEBP file');
        }
        const targetUser = await this.prismaService.user.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                role: true,
                schoolId: true,
                avatarUrl: true,
            },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('User not found');
        }
        const requesterRole = String(requester.role).toUpperCase();
        const targetRole = String(targetUser.role).toUpperCase();
        const isSelf = requester.id === targetUser.id;
        const canManageSchoolAvatars = ['ADMIN', 'REGISTRAR', 'IT_MANAGER'].includes(requesterRole) &&
            ['STUDENT', 'PARENT', 'TEACHER'].includes(targetRole) &&
            !!requester.schoolId &&
            requester.schoolId === targetUser.schoolId;
        const canManageAnyAvatar = requesterRole === role_enum_1.Role.SUPER_ADMIN;
        if (!isSelf && !canManageSchoolAvatars && !canManageAnyAvatar) {
            throw new common_1.ForbiddenException('You cannot update this user photo');
        }
        const schoolSegment = targetUser.schoolId || 'platform';
        const relativeDir = path.join('uploads', 'schools', schoolSegment, 'avatars');
        const publicDir = path.join(process.cwd(), 'public', relativeDir);
        const fileName = `${targetUser.id}-${Date.now()}${extension}`;
        const filePath = path.join(publicDir, fileName);
        await fs.mkdir(publicDir, { recursive: true });
        await fs.writeFile(filePath, file.buffer);
        const avatarUrl = `/${relativeDir.split(path.sep).join('/')}/${fileName}`;
        return this.prismaService.user.update({
            where: { id: targetUser.id },
            data: { avatarUrl },
            select: {
                id: true,
                name: true,
                role: true,
                schoolId: true,
                avatarUrl: true,
                updatedAt: true,
            },
        });
    }
    async deleteUser(id) {
        return this.prismaService.user.delete({
            where: { id },
        });
    }
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const passwordValidation = this.credentialService.validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            throw new common_1.BadRequestException(`Password does not meet requirements: ${passwordValidation.errors.join(', ')}`);
        }
        const hashedPassword = await this.credentialService.hashPassword(newPassword);
        await this.prismaService.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false,
            },
        });
        return {
            mustChangePassword: false,
        };
    }
    async requestPasswordReset(username) {
        const normalizedUsername = this.normalizeUsername(username);
        if (!normalizedUsername) {
            return { notified: false };
        }
        const user = await this.prismaService.user.findFirst({
            where: {
                username: {
                    equals: normalizedUsername,
                    mode: 'insensitive',
                },
            },
        });
        if (!user?.schoolId) {
            return { notified: false };
        }
        const admins = await this.prismaService.user.findMany({
            where: {
                schoolId: user.schoolId,
                role: { in: [role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER] },
                isActive: true,
            },
            select: { id: true, schoolId: true },
        });
        if (admins.length > 0) {
            const schoolId = user.schoolId;
            await this.notificationService.createBulkNotifications({
                schoolId,
                userIds: admins.map((a) => a.id),
                title: 'Password Reset Requested',
                message: `${user.name} (${user.username}) has requested a password reset.`,
                type: notification_service_1.NotificationType.PASSWORD_RESET,
                actionUrl: '/admin/credentials',
                metadata: {
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email,
                    userUsername: user.username,
                },
            });
        }
        return { notified: admins.length > 0 };
    }
    async resetPasswordWithToken(token, newPassword) {
        const passwordValidation = this.credentialService.validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            throw new common_1.BadRequestException(`Password does not meet requirements: ${passwordValidation.errors.join(', ')}`);
        }
        const userId = await this.credentialService.validatePasswordResetToken(token);
        if (!userId) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const hashedPassword = await this.credentialService.hashPassword(newPassword);
        await this.prismaService.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false,
            },
        });
        await this.credentialService.markTokenAsUsed(token);
        return {
            userId,
        };
    }
    async adminResetUserPassword(targetUserId, adminUserId, adminSchoolId, adminRole, requestedTemporaryPassword) {
        if (![role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER].includes(adminRole)) {
            throw new common_1.ForbiddenException('Not allowed to reset user passwords');
        }
        if (!adminSchoolId) {
            throw new common_1.ForbiddenException('Admin is not associated with any school');
        }
        const targetUser = await this.prismaService.user.findUnique({
            where: { id: targetUserId },
        });
        if (!targetUser) {
            throw new common_1.NotFoundException('User not found');
        }
        if (targetUser.role === role_enum_1.Role.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Cannot reset a super admin password here');
        }
        if (targetUser.schoolId !== adminSchoolId) {
            throw new common_1.ForbiddenException('Cannot reset a password outside your school');
        }
        const customTemporaryPassword = requestedTemporaryPassword?.trim();
        if (customTemporaryPassword && customTemporaryPassword.length < 8) {
            throw new common_1.BadRequestException('Temporary password must be at least 8 characters');
        }
        const temporaryPassword = customTemporaryPassword ||
            this.credentialService.generateTemporaryPassword(12);
        const hashedPassword = await this.credentialService.hashPassword(temporaryPassword);
        await this.prismaService.user.update({
            where: { id: targetUserId },
            data: {
                password: hashedPassword,
                mustChangePassword: true,
            },
        });
        return {
            userId: targetUserId,
            email: targetUser.email,
            username: targetUser.username,
            temporaryPassword,
            message: 'This temporary password should be shared securely with the user',
        };
    }
};
exports.AuthService = AuthService;
__decorate([
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthService.prototype, "login", null);
__decorate([
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthService.prototype, "logout", null);
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        credential_service_1.CredentialService,
        notification_service_1.NotificationService])
], AuthService);
//# sourceMappingURL=auth.service.js.map