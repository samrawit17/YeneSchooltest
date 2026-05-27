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
var SyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SyncService = SyncService_1 = class SyncService {
    prisma;
    logger = new common_1.Logger(SyncService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async syncAttendance(dto, user, deviceId) {
        const { operation, entityId, payload, localModified } = dto;
        const { studentId, classId, sectionId, date, status, remarks, recordedById, recordedBy, localId, } = payload;
        const schoolId = user?.schoolId;
        const actorId = user?.id;
        if (!schoolId || !actorId) {
            throw new common_1.BadRequestException('Authenticated school and user are required for sync');
        }
        try {
            switch (operation) {
                case 'create':
                    return await this.handleCreateAttendance({
                        localId,
                        deviceId,
                        studentId,
                        classId,
                        sectionId,
                        date,
                        status: this.normalizeAttendanceStatus(status),
                        remarks,
                        recordedById: recordedById || recordedBy || actorId,
                        schoolId,
                        localModified,
                    });
                case 'update':
                    return await this.handleUpdateAttendance({
                        entityId,
                        localId,
                        deviceId,
                        studentId,
                        classId,
                        sectionId,
                        date,
                        status: this.normalizeAttendanceStatus(status),
                        remarks,
                        recordedById: recordedById || recordedBy || actorId,
                        schoolId,
                        localModified,
                    });
                case 'delete':
                    return await this.handleDeleteAttendance(entityId);
                default:
                    throw new common_1.BadRequestException(`Invalid operation: ${operation}`);
            }
        }
        catch (error) {
            this.logger.error(`Sync failed for ${entityId}:`, error);
            throw error;
        }
    }
    async handleCreateAttendance(data) {
        await this.validateAttendanceScope(data.schoolId, data.studentId, data.classId, data.sectionId);
        const existing = await this.prisma.attendance.findUnique({
            where: {
                studentId_date: {
                    studentId: data.studentId,
                    date: new Date(data.date),
                },
            },
        });
        if (existing) {
            const existingModified = existing.updatedAt.getTime();
            const localModifiedTime = new Date(data.localModified).getTime();
            if (existingModified > localModifiedTime) {
                return {
                    success: false,
                    serverId: existing.id,
                    version: 1,
                    serverVersion: existing,
                    message: 'Conflict detected - server has newer version',
                };
            }
            const updated = await this.prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    status: data.status,
                    remarks: data.remarks,
                    recordedById: data.recordedById,
                    updatedAt: new Date(),
                },
            });
            return {
                success: true,
                serverId: updated.id,
                version: 1,
            };
        }
        const created = await this.prisma.attendance.create({
            data: {
                studentId: data.studentId,
                classId: data.classId,
                sectionId: data.sectionId,
                date: new Date(data.date),
                status: data.status,
                remarks: data.remarks,
                recordedById: data.recordedById,
                schoolId: data.schoolId,
                updatedAt: new Date(),
            },
        });
        return {
            success: true,
            serverId: created.id,
            version: 1,
        };
    }
    async handleUpdateAttendance(data) {
        await this.validateAttendanceScope(data.schoolId, data.studentId, data.classId, data.sectionId);
        const existing = await this.prisma.attendance.findUnique({
            where: { id: data.entityId },
        });
        if (!existing) {
            return this.handleCreateAttendance({
                ...data,
                recordedById: data.recordedById,
            });
        }
        const existingModified = existing.updatedAt.getTime();
        const localModifiedTime = new Date(data.localModified).getTime();
        if (existingModified > localModifiedTime) {
            return {
                success: false,
                serverId: existing.id,
                version: 1,
                serverVersion: existing,
                message: 'Conflict detected - server has newer version',
            };
        }
        const updated = await this.prisma.attendance.update({
            where: { id: data.entityId },
            data: {
                status: data.status,
                remarks: data.remarks,
                updatedAt: new Date(),
            },
        });
        return {
            success: true,
            serverId: updated.id,
            version: 1,
        };
    }
    async handleDeleteAttendance(entityId) {
        try {
            await this.prisma.attendance.delete({
                where: { id: entityId },
            });
            return { success: true };
        }
        catch (error) {
            return { success: true, message: 'Record already deleted or not found' };
        }
    }
    async getStudentsForOffline(user, classIds, sectionIds) {
        if (!user?.schoolId) {
            throw new common_1.BadRequestException('Authenticated school is required');
        }
        const studentClasses = await this.prisma.studentClass.findMany({
            where: {
                schoolId: user.schoolId,
                ...(classIds?.length ? { classId: { in: classIds } } : {}),
                ...(sectionIds?.length ? { sectionId: { in: sectionIds } } : {}),
            },
            include: {
                student: {
                    include: { studentProfile: true },
                },
                class: true,
                section: true,
            },
            orderBy: [{ class: { name: 'asc' } }, { section: { name: 'asc' } }],
        });
        return {
            students: studentClasses.map((enrollment) => ({
                id: enrollment.student.id,
                firstName: enrollment.student.name?.split(' ')[0] || enrollment.student.name || '',
                lastName: enrollment.student.name?.split(' ').slice(1).join(' ') || '',
                studentId: enrollment.student.username || enrollment.student.studentProfile?.studentId || enrollment.student.id,
                classId: enrollment.classId,
                className: enrollment.class?.name,
                sectionId: enrollment.sectionId,
                sectionName: enrollment.section?.name,
                photo: enrollment.student.avatarUrl || undefined,
                email: enrollment.student.email || undefined,
                phone: enrollment.student.phone || undefined,
                enrollmentStatus: 'active',
                updatedAt: enrollment.updatedAt.toISOString(),
            })),
            cachedAt: new Date().toISOString(),
        };
    }
    async validateAttendanceScope(schoolId, studentId, classId, sectionId) {
        if (!studentId || !classId || !sectionId) {
            throw new common_1.BadRequestException('studentId, classId, and sectionId are required');
        }
        const enrollment = await this.prisma.studentClass.findFirst({
            where: {
                schoolId,
                studentId,
                classId,
                sectionId,
            },
            select: { id: true },
        });
        if (!enrollment) {
            throw new common_1.BadRequestException('Student is not enrolled in this class/section for your school');
        }
    }
    normalizeAttendanceStatus(status) {
        const normalized = String(status || '').trim().toUpperCase();
        if (!['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(normalized)) {
            throw new common_1.BadRequestException('Invalid attendance status');
        }
        return normalized;
    }
    async getConflicts() {
        return [];
    }
    async resolveConflict(id, resolution, data) {
        return { success: true };
    }
    async getSyncStatus() {
        return {
            pendingCount: 0,
            lastSyncAt: new Date().toISOString(),
            conflicts: 0,
        };
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = SyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SyncService);
//# sourceMappingURL=sync.service.js.map