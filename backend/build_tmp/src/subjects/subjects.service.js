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
exports.SubjectsService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
let SubjectsService = class SubjectsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const existing = await this.prisma.subject.findFirst({
            where: {
                schoolId: data.schoolId,
                name: data.name,
            },
        });
        if (existing) {
            throw new localization_1.LocalizedException('subjects.subject_with_this_name_already_exists_in_the_school_2c33407c', undefined, common_1.HttpStatus.CONFLICT, 'Subject with this name already exists in the school');
        }
        if (data.academicYearId) {
            const academicYear = await this.prisma.academicYear.findFirst({
                where: { id: data.academicYearId, schoolId: data.schoolId },
                select: { endDate: true, name: true },
            });
            if (academicYear && new Date(academicYear.endDate) < new Date()) {
                throw new localization_1.LocalizedException('subjects.cannot_create_subjects_for_academic_year_because_it_has_ende_ac3a33f1', undefined, undefined, 'Cannot create subjects for academic year "${academicYear.name}" because it has ended.');
            }
        }
        return this.prisma.subject.create({
            data: {
                schoolId: data.schoolId,
                name: data.name,
                code: data.code,
                isActive: data.isActive ?? true,
                academicYearId: data.academicYearId,
            },
        });
    }
    async findAll(schoolId) {
        return this.prisma.subject.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' },
            include: {
                academicYear: {
                    select: { id: true, name: true },
                },
            },
        });
    }
    async findOne(id) {
        const subject = await this.prisma.subject.findUnique({
            where: { id },
            include: {
                school: true,
                academicYear: {
                    select: { id: true, name: true },
                },
            },
        });
        if (!subject) {
            throw new localization_1.LocalizedException('subjects.subject_not_found_562e5a84', undefined, common_1.HttpStatus.NOT_FOUND, 'Subject not found');
        }
        return subject;
    }
    async update(id, data) {
        await this.findOne(id);
        return this.prisma.subject.update({
            where: { id },
            data: {
                name: data.name,
                code: data.code,
                isActive: data.isActive,
            },
        });
    }
    async delete(id) {
        await this.findOne(id);
        return this.prisma.subject.delete({
            where: { id },
        });
    }
};
exports.SubjectsService = SubjectsService;
exports.SubjectsService = SubjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubjectsService);
//# sourceMappingURL=subjects.service.js.map