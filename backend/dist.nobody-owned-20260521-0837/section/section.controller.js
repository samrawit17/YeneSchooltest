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
exports.SectionController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
const section_service_1 = require("./section.service");
const role_enum_1 = require("../auth/types/role.enum");
const prisma_service_1 = require("../prisma/prisma.service");
let SectionController = class SectionController {
    sectionService;
    prismaService;
    constructor(sectionService, prismaService) {
        this.sectionService = sectionService;
        this.prismaService = prismaService;
    }
    async findAll(classId, classIds, search, req) {
        const schoolId = req?.user?.schoolId;
        if (search && schoolId) {
            return this.sectionService.search(schoolId, search);
        }
        const ids = classIds ? classIds.split(',') : undefined;
        return this.sectionService.findAll(schoolId, classId, ids);
    }
    async findOne(req, id) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.sectionService.findOne(id, schoolId);
    }
    async update(req, id, body) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.sectionService.update(id, schoolId, {
            name: body.name,
            capacity: body.capacity,
            roomNumber: body.roomNumber,
            homeroomTeacherId: body.homeroomTeacherId,
        });
    }
    async setHomeroomTeacher(id, body, req) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.sectionService.update(id, schoolId, {
            homeroomTeacherId: body.homeroomTeacherId,
        });
    }
    async delete(req, id) {
        const schoolId = req.user.schoolId;
        if (!schoolId)
            return { success: false, message: 'School ID is required' };
        return this.sectionService.delete(id, schoolId);
    }
    async syncCapacity(req) {
        const schoolId = req.user.schoolId;
        if (!schoolId) {
            return { status: 'error', message: 'School ID not found' };
        }
        const capacitySetting = await this.prismaService.schoolSetting.findUnique({
            where: { schoolId_key: { schoolId, key: 'DEFAULT_SECTION_CAPACITY' } },
        });
        let newCapacity = 30;
        if (capacitySetting?.value) {
            const parsed = typeof capacitySetting.value === 'number'
                ? capacitySetting.value
                : parseInt(capacitySetting.value, 10);
            if (!isNaN(parsed) && parsed > 0) {
                newCapacity = parsed;
            }
        }
        const sections = await this.prismaService.section.findMany({
            where: { class: { schoolId } },
            include: {
                class: true,
                _count: {
                    select: { studentClasses: true },
                },
            },
        });
        const overCapacitySections = sections.filter((section) => section._count.studentClasses > newCapacity);
        if (overCapacitySections.length > 0) {
            const sectionNames = overCapacitySections
                .slice(0, 5)
                .map((section) => `${section.class.name}-${section.name} (${section._count.studentClasses})`)
                .join(', ');
            throw new common_1.BadRequestException(`Cannot sync capacity to ${newCapacity}. Some sections already exceed that enrollment: ${sectionNames}`);
        }
        await this.prismaService.$transaction(sections.map((section) => this.prismaService.section.update({
            where: { id: section.id },
            data: { capacity: newCapacity },
        })));
        return {
            status: 'success',
            message: `Updated ${sections.length} sections to capacity ${newCapacity}`,
            updatedCount: sections.length,
            newCapacity,
        };
    }
};
exports.SectionController = SectionController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_decorator_1.Permissions)('section:read'),
    __param(0, (0, common_1.Query)('classId')),
    __param(1, (0, common_1.Query)('classIds')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SectionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_decorator_1.Permissions)('section:read'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SectionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('section:update'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], SectionController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/homeroom-teacher'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER, role_enum_1.Role.REGISTRAR),
    (0, permissions_decorator_1.Permissions)('section:update'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SectionController.prototype, "setHomeroomTeacher", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('section:delete'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SectionController.prototype, "delete", null);
__decorate([
    (0, common_1.Put)('sync-capacity'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.ADMIN, role_enum_1.Role.IT_MANAGER),
    (0, permissions_decorator_1.Permissions)('section:update'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SectionController.prototype, "syncCapacity", null);
exports.SectionController = SectionController = __decorate([
    (0, common_1.Controller)('sections'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [section_service_1.SectionService,
        prisma_service_1.PrismaService])
], SectionController);
//# sourceMappingURL=section.controller.js.map