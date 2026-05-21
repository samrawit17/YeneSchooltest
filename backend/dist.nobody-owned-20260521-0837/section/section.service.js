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
exports.SectionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SectionService = class SectionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(schoolId, classId, classIds) {
        return this.prisma.section.findMany({
            where: {
                ...(schoolId ? { class: { schoolId } } : {}),
                ...(classIds && classIds.length > 0 ? { classId: { in: classIds } } : (classId && { classId })),
            },
            include: {
                class: {
                    include: {
                        school: true,
                    },
                },
                homeroomTeacher: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        studentClasses: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async search(schoolId, query) {
        const searchTerm = query.toLowerCase();
        return this.prisma.section.findMany({
            where: {
                class: { schoolId },
                OR: [
                    { name: { contains: searchTerm } },
                    { roomNumber: { contains: searchTerm } },
                    { class: { name: { contains: searchTerm } } },
                ],
            },
            include: {
                class: {
                    include: {
                        school: true,
                    },
                },
                homeroomTeacher: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        studentClasses: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
            take: 50,
        });
    }
    async findOne(id, schoolId) {
        const section = await this.prisma.section.findFirst({
            where: { id, class: { schoolId } },
            include: {
                class: {
                    include: {
                        school: true,
                    },
                },
            },
        });
        if (!section) {
            throw new common_1.NotFoundException('Section not found');
        }
        return section;
    }
    async update(id, schoolId, data) {
        if (data.name) {
            const section = await this.findOne(id, schoolId);
            const existingSection = await this.prisma.section.findFirst({
                where: {
                    id: { not: id },
                    classId: section.classId,
                    name: data.name,
                },
            });
            if (existingSection) {
                throw new common_1.ConflictException(`Section ${data.name} already exists for this class`);
            }
        }
        if (data.capacity !== undefined) {
            const currentEnrollment = await this.prisma.studentClass.count({
                where: { sectionId: id, schoolId },
            });
            if (data.capacity < currentEnrollment) {
                throw new common_1.BadRequestException(`Section capacity cannot be set below current enrollment (${currentEnrollment})`);
            }
        }
        const updateData = { ...data };
        if (data.homeroomTeacherId !== undefined) {
            updateData.homeroomTeacherId =
                data.homeroomTeacherId === '' ? null : data.homeroomTeacherId;
        }
        return this.prisma.section.update({
            where: { id },
            data: updateData,
        });
    }
    async delete(id, schoolId) {
        await this.findOne(id, schoolId);
        return this.prisma.section.delete({
            where: { id },
        });
    }
    async findAvailableSection(classId) {
        const sections = await this.prisma.section.findMany({
            where: { classId },
            orderBy: { name: 'asc' },
        });
        return sections.find((section) => true) || null;
    }
    async getNextSectionName(classId) {
        const sections = await this.prisma.section.findMany({
            where: { classId },
            orderBy: { name: 'asc' },
        });
        const usedNames = new Set(sections.map((s) => s.name));
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (const char of alphabet) {
            if (!usedNames.has(char)) {
                return char;
            }
        }
        let counter = 0;
        while (true) {
            const name = 'A' +
                alphabet[counter % 26] +
                (counter >= 26 ? Math.floor(counter / 26) : '');
            if (!usedNames.has(name)) {
                return name;
            }
            counter++;
        }
    }
};
exports.SectionService = SectionService;
exports.SectionService = SectionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SectionService);
//# sourceMappingURL=section.service.js.map