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
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
let SectionService = class SectionService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(schoolId, data) {
        const classExists = await this.prisma.class.findFirst({
            where: { id: data.classId, schoolId },
            select: { id: true, academicYearId: true },
        });
        if (!classExists) {
            throw new localization_1.LocalizedException('section.class_not_found_for_this_school_f597ea4b', undefined, undefined, 'Class not found for this school');
        }
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { id: classExists.academicYearId, schoolId },
            select: { endDate: true, name: true },
        });
        if (academicYear && new Date(academicYear.endDate) < new Date()) {
            throw new localization_1.LocalizedException('section.cannot_create_sections_for_academic_year_because_it_has_ende_140d44ad', undefined, undefined, 'Cannot create sections for academic year "${academicYear.name}" because it has ended.');
        }
        const existingSection = await this.prisma.section.findFirst({
            where: { classId: data.classId, name: data.name },
        });
        if (existingSection) {
            throw new localization_1.LocalizedException('section.section_already_exists_for_this_class_45c4e78f', undefined, common_1.HttpStatus.CONFLICT, 'Section ${data.name} already exists for this class');
        }
        if (data.capacity < 1) {
            throw new localization_1.LocalizedException('section.capacity_must_be_at_least_1_cc111a99', undefined, undefined, 'Capacity must be at least 1');
        }
        const createData = {
            classId: data.classId,
            name: data.name,
            capacity: data.capacity,
        };
        if (data.stream !== undefined) {
            const normalizedStream = String(data.stream || '').trim().toUpperCase();
            createData.stream = normalizedStream || null;
            if (createData.stream && !['SOCIAL', 'NATURAL'].includes(createData.stream)) {
                throw new localization_1.LocalizedException('section.section_stream_must_be_social_or_natural_d5e85c4a', undefined, undefined, 'Section stream must be SOCIAL or NATURAL');
            }
        }
        if (data.roomNumber !== undefined) {
            createData.roomNumber = data.roomNumber;
        }
        if (data.homeroomTeacherId !== undefined) {
            createData.homeroomTeacherId =
                data.homeroomTeacherId === '' ? null : data.homeroomTeacherId;
        }
        return this.prisma.section.create({
            data: createData,
            include: {
                class: {
                    include: {
                        school: true,
                    },
                },
            },
        });
    }
    async findAll(schoolId, classId, classIds, academicYearId) {
        const classWhere = {
            ...(schoolId ? { schoolId } : {}),
            ...(academicYearId ? { academicYearId } : {}),
        };
        return this.prisma.section.findMany({
            where: {
                ...(Object.keys(classWhere).length > 0 ? { class: classWhere } : {}),
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
    async search(schoolId, query, academicYearId) {
        const searchTerm = query.toLowerCase();
        return this.prisma.section.findMany({
            where: {
                class: {
                    schoolId,
                    ...(academicYearId ? { academicYearId } : {}),
                },
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
            throw new localization_1.LocalizedException('section.section_not_found_f649d604', undefined, common_1.HttpStatus.NOT_FOUND, 'Section not found');
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
                throw new localization_1.LocalizedException('section.section_already_exists_for_this_class_45c4e78f', undefined, common_1.HttpStatus.CONFLICT, 'Section ${data.name} already exists for this class');
            }
        }
        if (data.capacity !== undefined) {
            const currentEnrollment = await this.prisma.studentClass.count({
                where: { sectionId: id, schoolId },
            });
            if (data.capacity < currentEnrollment) {
                throw new localization_1.LocalizedException('section.section_capacity_cannot_be_set_below_current_enrollment_5d3d0a0a', undefined, undefined, 'Section capacity cannot be set below current enrollment (${currentEnrollment})');
            }
        }
        const updateData = { ...data };
        if (data.stream !== undefined) {
            const normalizedStream = String(data.stream || '').trim().toUpperCase();
            updateData.stream = normalizedStream || null;
            if (updateData.stream && !['SOCIAL', 'NATURAL'].includes(updateData.stream)) {
                throw new localization_1.LocalizedException('section.section_stream_must_be_social_or_natural_d5e85c4a', undefined, undefined, 'Section stream must be SOCIAL or NATURAL');
            }
        }
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
        const section = await this.findOne(id, schoolId);
        const academicYear = await this.prisma.academicYear.findFirst({
            where: { id: section.class.academicYearId, schoolId },
            select: { endDate: true, name: true },
        });
        if (academicYear && new Date(academicYear.endDate) < new Date()) {
            throw new localization_1.LocalizedException('section.cannot_delete_sections_for_academic_year_because_it_has_ende_cdbaf71a', undefined, undefined, 'Cannot delete sections for academic year "${academicYear.name}" because it has ended.');
        }
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