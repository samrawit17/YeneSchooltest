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
const prisma_service_1 = require("../prisma/prisma.service");
let DisciplineService = class DisciplineService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createIncident(data) {
        return this.prisma.disciplineIncident.create({
            data: {
                ...data,
                severity: data.severity || 'MEDIUM',
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
    }
    async getIncidents(schoolId, filters) {
        const where = { schoolId };
        if (filters?.studentId) {
            where.studentId = filters.studentId;
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
        if (!existing)
            throw new common_1.NotFoundException('Discipline incident not found');
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
        if (!existing)
            throw new common_1.NotFoundException('Discipline incident not found');
        return this.prisma.disciplineIncident.delete({
            where: { id },
        });
    }
    async getStudentIncidents(studentId, schoolId) {
        return this.prisma.disciplineIncident.findMany({
            where: { studentId, schoolId },
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DisciplineService);
//# sourceMappingURL=discipline.service.js.map