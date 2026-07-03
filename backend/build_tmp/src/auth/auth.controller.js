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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const auth_service_1 = require("./auth.service");
const role_enum_1 = require("./types/role.enum");
const local_auth_guard_1 = require("./guards/local-auth.guard");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const roles_guard_1 = require("./guards/roles.guard");
const permissions_guard_1 = require("./guards/permissions.guard");
const roles_decorator_1 = require("./decorators/roles.decorator");
const permissions_decorator_1 = require("./decorators/permissions.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
const rate_limit_decorator_1 = require("../infrastructure/rate-limit/rate-limit.decorator");
const SELF_REGISTRATION_FILE_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
]);
function selfRegistrationFileFilter(_req, file, callback) {
    if (SELF_REGISTRATION_FILE_TYPES.has(file.mimetype)) {
        callback(null, true);
        return;
    }
    callback(new common_1.BadRequestException('Uploaded files must be PDF, JPG, PNG, or WEBP'), false);
}
let AuthController = class AuthController {
    authService;
    prismaService;
    constructor(authService, prismaService) {
        this.authService = authService;
        this.prismaService = prismaService;
    }
    async login(req, res) {
        return this.authService.login(req.user, res);
    }
    async logout(res) {
        return this.authService.logout(res);
    }
    async registerAdmin(req, body) {
        try {
            if (!body.schoolId) {
                throw new common_1.HttpException('schoolId is required for ADMIN registration', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.authService.registerAdmin(body.email, body.password, body.name, body.schoolId);
            if (!result.success) {
                throw new common_1.HttpException(result.message, common_1.HttpStatus.BAD_REQUEST);
            }
            return result;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Admin registration failed: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async registerItManager(req, body) {
        try {
            if (!body.schoolId) {
                throw new common_1.HttpException('schoolId is required for IT_MANAGER registration', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.authService.registerItManager(body.email, body.password, body.name, body.schoolId);
            if (!result.success) {
                throw new common_1.HttpException(result.message, common_1.HttpStatus.BAD_REQUEST);
            }
            return result;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('IT Manager registration failed: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async registerTeacher(req, body) {
        try {
            if (!req.user.schoolId) {
                throw new common_1.HttpException('Admin is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            return this.authService.registerTeacher(body.email, body.name, req.user.schoolId);
        }
        catch (error) {
            throw new common_1.HttpException('Teacher registration failed: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async registerStudent(req, body) {
        try {
            if (!req.user.schoolId) {
                throw new common_1.HttpException('User is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            return this.authService.registerStudent(body.email, body.password, body.name, req.user.schoolId);
        }
        catch (error) {
            throw new common_1.HttpException('Student registration failed: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async registerParent(req, body) {
        try {
            if (!req.user.schoolId) {
                throw new common_1.HttpException('Admin is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            return this.authService.registerParent(body.email, body.password, body.name, req.user.schoolId);
        }
        catch (error) {
            throw new common_1.HttpException('Parent registration failed: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async registerRegistrar(req, body) {
        try {
            if (!req.user.schoolId) {
                throw new common_1.HttpException('Admin is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            return this.authService.registerRegistrar(body.email, body.password, body.name, req.user.schoolId);
        }
        catch (error) {
            throw new common_1.HttpException('Registrar registration failed: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async registerStudentSelf(body, files) {
        try {
            let photoUrl;
            const documents = [];
            if (files && files.length > 0) {
                for (const file of files) {
                    if (file.fieldname === 'photo') {
                        photoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                    }
                    else if (file.fieldname.startsWith('document')) {
                        documents.push({
                            type: file.mimetype,
                            fileUrl: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
                            title: file.originalname,
                        });
                    }
                }
            }
            const studentData = {
                ...body,
                photo: photoUrl,
                documents: documents.length > 0 ? documents : body.documents,
            };
            return this.authService.registerStudentSelf(studentData);
        }
        catch (error) {
            throw new common_1.HttpException('Student self-registration failed: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getUsers(req, role) {
        try {
            const roles = String(req.query?.roles || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);
            const page = req.query?.page ? parseInt(String(req.query.page), 10) : 1;
            const limit = req.query?.limit
                ? parseInt(String(req.query.limit), 10)
                : 10;
            const search = req.query?.search
                ? String(req.query.search)
                : undefined;
            if (req.user.role === role_enum_1.Role.SUPER_ADMIN) {
                return this.authService.getUsers(role, roles, {
                    page,
                    limit,
                    search,
                });
            }
            if (!req.user.schoolId) {
                throw new common_1.HttpException('User is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            return this.authService.getUsersBySchool(req.user.schoolId, role, roles, {
                page,
                limit,
                search,
            });
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get users: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getTeachers(req, page, limit, search) {
        try {
            const pageNum = page ? parseInt(page, 10) : 1;
            const limitNum = limit ? parseInt(limit, 10) : 10;
            if (req.user.role === role_enum_1.Role.SUPER_ADMIN) {
                return this.authService.getUsers(role_enum_1.Role.TEACHER, undefined, {
                    page: pageNum,
                    limit: limitNum,
                    search,
                });
            }
            if (!req.user.schoolId) {
                throw new common_1.HttpException('User is not associated with any school', common_1.HttpStatus.BAD_REQUEST);
            }
            return this.authService.getUsersBySchool(req.user.schoolId, role_enum_1.Role.TEACHER, undefined, {
                page: pageNum,
                limit: limitNum,
                search,
            });
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get teachers: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getCurrentUser(req) {
        try {
            const storedUser = await this.authService.getUserById(req.user.id);
            if (!storedUser) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            const user = { ...req.user, ...storedUser };
            if (user.role === role_enum_1.Role.STUDENT) {
                const studentProfile = await this.prismaService.studentProfile.findUnique({
                    where: { userId: user.id },
                    include: {
                        user: true,
                    },
                });
                const enrollment = await this.prismaService.enrollment.findFirst({
                    where: { studentId: user.id },
                });
                return {
                    ...user,
                    studentProfile,
                    enrollment,
                };
            }
            return user;
        }
        catch (error) {
            throw new common_1.HttpException('Failed to get user profile: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getUser(req, id) {
        try {
            if (id === 'me') {
                const storedUser = await this.authService.getUserById(req.user.id);
                if (!storedUser) {
                    throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
                }
                const user = { ...req.user, ...storedUser };
                if (user.role === role_enum_1.Role.STUDENT) {
                    const studentProfile = await this.prismaService.studentProfile.findUnique({
                        where: { userId: user.id },
                        include: {
                            user: true,
                        },
                    });
                    const enrollment = await this.prismaService.enrollment.findFirst({
                        where: { studentId: user.id },
                    });
                    return {
                        ...user,
                        studentProfile,
                        enrollment,
                    };
                }
                return user;
            }
            const user = await this.authService.getUserById(id);
            if (!user) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (!req.user.schoolId || user.schoolId !== req.user.schoolId) {
                throw new common_1.HttpException('Forbidden resource', common_1.HttpStatus.FORBIDDEN);
            }
            return user;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to get user: ' + error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateCurrentUser(req, body) {
        try {
            const user = await this.authService.getUserById(req.user.id);
            if (!user) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            const { name, phone, avatarUrl, theme } = body;
            const updateData = {};
            if (name !== undefined)
                updateData.name = name;
            if (phone !== undefined)
                updateData.phone = phone;
            if (avatarUrl !== undefined)
                updateData.avatarUrl = avatarUrl;
            if (theme !== undefined) {
                if (['LIGHT', 'DARK', 'SYSTEM'].includes(theme)) {
                    updateData.theme = theme;
                }
                else {
                    throw new common_1.HttpException('Invalid theme value. Must be: LIGHT, DARK, or SYSTEM', common_1.HttpStatus.BAD_REQUEST);
                }
            }
            return this.authService.updateUser(req.user.id, updateData);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to update user profile: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async updateUser(req, id, body) {
        try {
            const user = await this.authService.getUserById(id);
            if (!user) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (req.user.role !== role_enum_1.Role.SUPER_ADMIN) {
                if (!req.user.schoolId || user.schoolId !== req.user.schoolId) {
                    throw new common_1.HttpException('Forbidden resource', common_1.HttpStatus.FORBIDDEN);
                }
            }
            return this.authService.updateUser(id, body);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to update user: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async uploadUserAvatar(req, id, file) {
        try {
            return await this.authService.uploadUserAvatar(id, req.user, file);
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            if (error?.code === 'LIMIT_FILE_SIZE') {
                throw new common_1.HttpException('Avatar image must be 2MB or smaller', common_1.HttpStatus.BAD_REQUEST);
            }
            throw new common_1.HttpException('Failed to upload user photo: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async updateTheme(req, body) {
        try {
            const user = await this.authService.getUserById(req.user.id);
            if (!user) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            const validThemes = ['LIGHT', 'DARK', 'SYSTEM'];
            if (!validThemes.includes(body.theme)) {
                throw new common_1.HttpException('Invalid theme value. Must be: LIGHT, DARK, or SYSTEM', common_1.HttpStatus.BAD_REQUEST);
            }
            return this.authService.updateUser(req.user.id, { theme: body.theme });
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException('Failed to update theme: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async deleteUser(req, id) {
        try {
            const user = await this.authService.getUserById(id);
            if (!user) {
                throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
            }
            if (req.user.role !== role_enum_1.Role.SUPER_ADMIN) {
                if (!req.user.schoolId || user.schoolId !== req.user.schoolId) {
                    throw new common_1.HttpException('Forbidden resource', common_1.HttpStatus.FORBIDDEN);
                }
            }
            return this.authService.deleteUser(id);
        }
        catch (error) {
            throw new common_1.HttpException('Failed to delete user: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async changePassword(req, body) {
        try {
            const { currentPassword, newPassword, confirmPassword } = body;
            if (!currentPassword || !newPassword || !confirmPassword) {
                throw new common_1.HttpException('Current password, new password, and confirm password are required', common_1.HttpStatus.BAD_REQUEST);
            }
            if (newPassword !== confirmPassword) {
                throw new common_1.HttpException('New password and confirm password do not match', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.authService.changePassword(req.user.id, currentPassword, newPassword);
            return {
                success: true,
                message: 'Password changed successfully',
                ...result,
            };
        }
        catch (error) {
            throw new common_1.HttpException('Failed to change password: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async requestPasswordReset(body) {
        try {
            const { username } = body;
            if (!username) {
                throw new common_1.HttpException('Username is required', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.authService.requestPasswordReset(username);
            return {
                success: true,
                message: 'If the username exists in our system, an admin will be notified',
                ...result,
            };
        }
        catch (error) {
            return {
                success: true,
                message: 'If the username exists in our system, an admin will be notified',
            };
        }
    }
    async resetPassword(body) {
        try {
            const { token, newPassword, confirmPassword } = body;
            if (!token || !newPassword || !confirmPassword) {
                throw new common_1.HttpException('Token, new password, and confirm password are required', common_1.HttpStatus.BAD_REQUEST);
            }
            if (newPassword !== confirmPassword) {
                throw new common_1.HttpException('New password and confirm password do not match', common_1.HttpStatus.BAD_REQUEST);
            }
            const result = await this.authService.resetPasswordWithToken(token, newPassword);
            return {
                success: true,
                message: 'Password reset successfully',
                ...result,
            };
        }
        catch (error) {
            throw new common_1.HttpException('Failed to reset password: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async adminResetUserPassword(req, userId, body) {
        try {
            const result = await this.authService.adminResetUserPassword(userId, req.user.id, req.user.schoolId, req.user.role, body?.temporaryPassword);
            return {
                success: true,
                ...result,
            };
        }
        catch (error) {
            throw new common_1.HttpException('Failed to reset user password: ' + error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.UseGuards)(local_auth_guard_1.LocalAuthGuard),
    (0, common_1.Post)('login'),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 5, windowSec: 60 }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('register/admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('user:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerAdmin", null);
__decorate([
    (0, common_1.Post)('register/it-manager'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN),
    (0, permissions_decorator_1.Permissions)('user:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerItManager", null);
__decorate([
    (0, common_1.Post)('register/teacher'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('user:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerTeacher", null);
__decorate([
    (0, common_1.Post)('register/student'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('user:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerStudent", null);
__decorate([
    (0, common_1.Post)('register/parent'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('user:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerParent", null);
__decorate([
    (0, common_1.Post)('register/registrar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('user:create'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerRegistrar", null);
__decorate([
    (0, common_1.Post)('register/student-self'),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 5, windowSec: 600 }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10, {
        limits: {
            files: 10,
            fileSize: 5 * 1024 * 1024,
        },
        fileFilter: selfRegistrationFileFilter,
    })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerStudentSelf", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.AllowSuperAdminMixedRole)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('user:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)('users/teachers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.TEACHER),
    (0, permissions_decorator_1.Permissions)('user:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getTeachers", null);
__decorate([
    (0, common_1.Get)('users/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getCurrentUser", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('view_users'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getUser", null);
__decorate([
    (0, common_1.Put)('users/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateCurrentUser", null);
__decorate([
    (0, common_1.Put)('users/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.AllowSuperAdminMixedRole)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('update_users'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Post)('users/:id/avatar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 2 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "uploadUserAvatar", null);
__decorate([
    (0, common_1.Patch)('users/me/theme'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updateTheme", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    (0, roles_decorator_1.AllowSuperAdminMixedRole)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.SUPER_ADMIN, role_enum_1.Role.ADMIN),
    (0, permissions_decorator_1.Permissions)('delete_users'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('request-password-reset'),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 3, windowSec: 60 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestPasswordReset", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, rate_limit_decorator_1.RateLimit)({ limit: 3, windowSec: 60 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('admin/reset-user-password/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "adminResetUserPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        prisma_service_1.PrismaService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map