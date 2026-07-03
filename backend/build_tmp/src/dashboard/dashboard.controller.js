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
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const teacher_dashboard_service_1 = require("./services/teacher.dashboard.service");
const student_dashboard_service_1 = require("./services/student.dashboard.service");
const parent_dashboard_service_1 = require("./services/parent.dashboard.service");
const admin_dashboard_service_1 = require("./services/admin.dashboard.service");
const registrar_dashboard_service_1 = require("./services/registrar.dashboard.service");
const superadmin_dashboard_service_1 = require("./services/superadmin.dashboard.service");
const cache_service_1 = require("../infrastructure/cache/cache.service");
const cache_constants_1 = require("../infrastructure/cache/cache.constants");
let DashboardController = class DashboardController {
    cacheService;
    teacherDashboardService;
    studentDashboardService;
    parentDashboardService;
    adminDashboardService;
    registrarDashboardService;
    superadminDashboardService;
    constructor(cacheService, teacherDashboardService, studentDashboardService, parentDashboardService, adminDashboardService, registrarDashboardService, superadminDashboardService) {
        this.cacheService = cacheService;
        this.teacherDashboardService = teacherDashboardService;
        this.studentDashboardService = studentDashboardService;
        this.parentDashboardService = parentDashboardService;
        this.adminDashboardService = adminDashboardService;
        this.registrarDashboardService = registrarDashboardService;
        this.superadminDashboardService = superadminDashboardService;
    }
    getUserNamespace(userId, schoolId) {
        return schoolId
            ? `dashboard:school:${schoolId}:user:${userId}`
            : `dashboard:user:${userId}`;
    }
    getSchoolNamespace(schoolId) {
        return `dashboard:school:${schoolId}`;
    }
    async getCachedDashboard(scope, user, cacheKey, factory) {
        const namespace = scope === 'school' && user.schoolId
            ? this.getSchoolNamespace(user.schoolId)
            : this.getUserNamespace(user.id, user.schoolId);
        const ttl = scope === 'school' ? cache_constants_1.CACHE_TTL.DASHBOARD_SCHOOL : cache_constants_1.CACHE_TTL.DASHBOARD_USER;
        return this.cacheService.getOrSetVersioned(namespace, cacheKey, ttl, factory);
    }
    async getDashboard(req) {
        const { id: userId, role, schoolId, permissions } = req.user;
        switch (role) {
            case 'SUPER_ADMIN':
                return this.getCachedDashboard('user', req.user, 'overview:superadmin', () => this.superadminDashboardService.getDashboard(userId));
            case 'ADMIN':
            case 'IT_MANAGER':
                return this.getCachedDashboard('school', req.user, `overview:${role.toLowerCase()}`, () => this.adminDashboardService.getDashboard(userId, schoolId, {
                    role,
                    permissions,
                }));
            case 'REGISTRAR':
                return this.getCachedDashboard('school', req.user, 'overview:registrar', () => this.registrarDashboardService.getDashboard(userId, schoolId));
            case 'FINANCE':
                return this.getCachedDashboard('school', req.user, `overview:${role}`, () => this.adminDashboardService.getDashboard(userId, schoolId, {
                    role,
                    permissions,
                }));
            case 'TEACHER':
                return this.getCachedDashboard('user', req.user, 'overview:teacher', () => this.teacherDashboardService.getDashboard(userId, schoolId));
            case 'STUDENT':
                return this.getCachedDashboard('user', req.user, 'overview:student', () => this.studentDashboardService.getDashboard(userId, schoolId));
            case 'PARENT':
                return this.getCachedDashboard('user', req.user, 'overview:parent', () => this.parentDashboardService.getDashboard(userId, schoolId, req.user.email));
            default:
                throw new Error('Dashboard not available for your role');
        }
    }
    async getTeacherDashboard(req) {
        return this.getCachedDashboard('user', req.user, 'teacher', () => this.teacherDashboardService.getDashboard(req.user.id, req.user.schoolId));
    }
    async getStudentDashboard(req) {
        return this.getCachedDashboard('user', req.user, 'student', () => this.studentDashboardService.getDashboard(req.user.id, req.user.schoolId));
    }
    async getParentDashboard(req) {
        return this.getCachedDashboard('user', req.user, 'parent', () => this.parentDashboardService.getDashboard(req.user.id, req.user.schoolId, req.user.email));
    }
    async getAdminDashboard(req) {
        return this.getCachedDashboard('school', req.user, `admin:${req.user.role}`, () => this.adminDashboardService.getDashboard(req.user.id, req.user.schoolId, {
            role: req.user.role,
            permissions: req.user.permissions || [],
        }));
    }
    async getTeacherLeaderboard(req) {
        return this.getCachedDashboard('school', req.user, `teacher-leaderboard:${req.user.role}`, async () => ({
            stats: {},
            alerts: [],
            quickActions: [],
            charts: {},
            metadata: {
                schoolId: req.user.schoolId,
                teacherLeaderboard: req.user.schoolId && req.user.role === 'ADMIN'
                    ? await this.adminDashboardService.getTeacherLeaderboard(req.user.schoolId)
                    : [],
                generatedAt: new Date(),
            },
        }));
    }
    async getItManagerDashboard(req) {
        return this.getCachedDashboard('school', req.user, 'it-manager', () => this.adminDashboardService.getDashboard(req.user.id, req.user.schoolId, {
            role: req.user.role,
            permissions: req.user.permissions || [],
        }));
    }
    async getRegistrarDashboard(req) {
        return this.getCachedDashboard('school', req.user, 'registrar', () => this.registrarDashboardService.getDashboard(req.user.id, req.user.schoolId));
    }
    async getSuperadminDashboard(req) {
        return this.getCachedDashboard('user', req.user, 'superadmin', () => this.superadminDashboardService.getDashboard(req.user.id));
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('dashboard:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('teacher'),
    (0, permissions_decorator_1.Permissions)('dashboard:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTeacherDashboard", null);
__decorate([
    (0, common_1.Get)('student'),
    (0, permissions_decorator_1.Permissions)('dashboard:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getStudentDashboard", null);
__decorate([
    (0, common_1.Get)('parent'),
    (0, permissions_decorator_1.Permissions)('dashboard:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getParentDashboard", null);
__decorate([
    (0, common_1.Get)('admin'),
    (0, permissions_decorator_1.Permissions)('dashboard:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getAdminDashboard", null);
__decorate([
    (0, common_1.Get)('admin/teacher-leaderboard'),
    (0, permissions_decorator_1.Permissions)('dashboard:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getTeacherLeaderboard", null);
__decorate([
    (0, common_1.Get)('it-manager'),
    (0, permissions_decorator_1.Permissions)('dashboard:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getItManagerDashboard", null);
__decorate([
    (0, common_1.Get)('registrar'),
    (0, permissions_decorator_1.Permissions)('dashboard:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getRegistrarDashboard", null);
__decorate([
    (0, common_1.Get)('superadmin'),
    (0, permissions_decorator_1.Permissions)('dashboard:view'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getSuperadminDashboard", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [cache_service_1.CacheService,
        teacher_dashboard_service_1.TeacherDashboardService,
        student_dashboard_service_1.StudentDashboardService,
        parent_dashboard_service_1.ParentDashboardService,
        admin_dashboard_service_1.AdminDashboardService,
        registrar_dashboard_service_1.RegistrarDashboardService,
        superadmin_dashboard_service_1.SuperadminDashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map