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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisciplineService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
let DisciplineService = class DisciplineService {
    prisma;
    notificationService;
    constructor(prisma, notificationService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
    }
    async verifyParentChild(parentId, studentId, schoolId) {
        const parentProfile = await this.prisma.parentProfile.findFirst({
            where: { userId: parentId, schoolId },
            select: { id: true },
        });
        if (!parentProfile)
            return false;
        const studentProfile = await this.prisma.studentProfile.findFirst({
            where: { schoolId, OR: [{ id: studentId }, { userId: studentId }] },
            select: { id: true },
        });
        if (!studentProfile)
            return false;
        const link = await this.prisma.parentStudent.findFirst({
            where: {
                parentId: parentProfile.id,
                studentId: studentProfile.id,
                schoolId,
            },
            select: { id: true },
        });
        return Boolean(link);
    }
    async createIncident(data) {
        const studentProfile = await this.prisma.studentProfile.findFirst({
            where: {
                schoolId: data.schoolId,
                OR: [
                    { id: data.studentId },
                    { userId: data.studentId },
                    { studentId: data.studentId },
                    { studentCode: data.studentId },
                ],
            },
            select: { id: true, userId: true },
        });
        if (!studentProfile) {
            throw new localization_1.LocalizedException('discipline.student_profile_not_found_for_identifier_f69fcef3', undefined, common_1.HttpStatus.NOT_FOUND, 'Student profile not found for identifier: ${data.studentId}');
        }
        const parentLinks = await this.prisma.parentStudent.findMany({
            where: { studentId: studentProfile.id, schoolId: data.schoolId },
            include: { parent: { select: { userId: true } } },
        });
        const incident = await this.prisma.disciplineIncident.create({
            data: {
                schoolId: data.schoolId,
                studentId: studentProfile.id,
                reportedBy: data.reportedBy,
                incidentDate: data.incidentDate,
                title: data.title,
                description: data.description,
                severity: data.severity || 'MEDIUM',
                actionTaken: data.actionTaken,
                status: 'OPEN',
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: { name: true, email: true },
                        },
                    },
                },
                reporter: {
                    select: { name: true, email: true },
                },
            },
        });
        const parentUserIds = parentLinks
            .map((link) => link.parent.userId)
            .filter(Boolean);
        if (parentUserIds.length > 0) {
            const studentName = incident.student?.user?.name || 'Student';
            const severityLabel = incident.severity.toLowerCase();
            await this.notificationService.createBulkNotifications({
                schoolId: data.schoolId,
                userIds: parentUserIds,
                title: 'Discipline Record',
                message: `A ${severityLabel} severity incident "${incident.title}" has been recorded for ${studentName}.`,
                type: 'DISCIPLINE_INCIDENT_CREATED',
                actionUrl: '/parent/discipline',
                metadata: {
                    incidentId: incident.id,
                    studentName,
                    severity: incident.severity,
                    title: incident.title,
                },
            });
        }
        return incident;
    }
    async getIncidents(schoolId, filters) {
        const where = { schoolId };
        if (filters?.studentId) {
            const studentProfile = await this.prisma.studentProfile.findFirst({
                where: {
                    schoolId,
                    OR: [
                        { id: filters.studentId },
                        { userId: filters.studentId },
                        { studentId: filters.studentId },
                        { studentCode: filters.studentId },
                    ],
                },
                select: { id: true },
            });
            where.studentId = studentProfile ? studentProfile.id : filters.studentId;
        }
        if (filters?.severity) {
            where.severity = filters.severity;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        return this.prisma.disciplineIncident.findMany({
            where,
            include: {
                student: {
                    include: {
                        user: {
                            select: { name: true, email: true, avatarUrl: true },
                        },
                    },
                },
                reporter: {
                    select: { name: true, email: true },
                },
            },
            orderBy: { incidentDate: 'desc' },
        });
    }
    async getIncidentById(id, schoolId) {
        return this.prisma.disciplineIncident.findFirst({
            where: { id, schoolId },
            include: {
                student: {
                    include: {
                        user: {
                            select: { name: true, email: true, avatarUrl: true },
                        },
                    },
                },
                reporter: {
                    select: { name: true, email: true },
                },
            },
        });
    }
    async updateIncident(id, schoolId, data) {
        const existing = await this.prisma.disciplineIncident.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });
        throw new localization_1.LocalizedException('discipline.discipline_incident_not_found_07d440c4', undefined, common_1.HttpStatus.NOT_FOUND, 'Discipline incident not found');
        return this.prisma.disciplineIncident.update({
            where: { id },
            data,
            include: {
                student: {
                    include: {
                        user: {
                            select: { name: true },
                        },
                    },
                },
            },
        });
    }
    async deleteIncident(id, schoolId) {
        const existing = await this.prisma.disciplineIncident.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });
        throw new localization_1.LocalizedException('discipline.discipline_incident_not_found_07d440c4', undefined, common_1.HttpStatus.NOT_FOUND, 'Discipline incident not found');
        return this.prisma.disciplineIncident.delete({
            where: { id },
        });
    }
    async getStudentIncidents(studentId, schoolId, academicYearId) {
        const studentProfile = await this.prisma.studentProfile.findFirst({
            where: {
                schoolId,
                OR: [
                    { id: studentId },
                    { userId: studentId },
                    { studentId: studentId },
                    { studentCode: studentId },
                ],
            },
            select: { id: true },
        });
        if (!studentProfile)
            return [];
        const where = { studentId: studentProfile.id, schoolId };
        if (academicYearId) {
            const year = await this.prisma.academicYear.findUnique({
                where: { id: academicYearId },
                select: { startDate: true, endDate: true },
            });
            if (year) {
                where.createdAt = {
                    gte: year.startDate,
                    lte: year.endDate,
                };
            }
        }
        return this.prisma.disciplineIncident.findMany({
            where,
            orderBy: { incidentDate: 'desc' },
            include: {
                reporter: {
                    select: { name: true },
                },
            },
        });
    }
};
exports.DisciplineService = DisciplineService;
exports.DisciplineService = DisciplineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], DisciplineService);
//# sourceMappingURL=discipline.service.js.map