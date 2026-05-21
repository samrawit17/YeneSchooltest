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
exports.PeriodTimeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PeriodTimeService = class PeriodTimeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(schoolId) {
        return this.prisma.periodTime.findMany({
            where: { schoolId },
            orderBy: { periodNumber: 'asc' },
        });
    }
    async create(data, schoolId) {
        return this.prisma.periodTime.create({
            data: {
                schoolId,
                periodNumber: data.periodNumber,
                startTime: data.startTime,
                endTime: data.endTime,
            },
        });
    }
    async update(id, schoolId, data) {
        const existing = await this.prisma.periodTime.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('Period time not found');
        return this.prisma.periodTime.update({
            where: { id },
            data: {
                periodNumber: data.periodNumber,
                startTime: data.startTime,
                endTime: data.endTime,
            },
        });
    }
    async delete(id, schoolId) {
        const existing = await this.prisma.periodTime.findFirst({
            where: { id, schoolId },
            select: { id: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('Period time not found');
        return this.prisma.periodTime.delete({ where: { id } });
    }
};
exports.PeriodTimeService = PeriodTimeService;
exports.PeriodTimeService = PeriodTimeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PeriodTimeService);
//# sourceMappingURL=period-time.service.js.map