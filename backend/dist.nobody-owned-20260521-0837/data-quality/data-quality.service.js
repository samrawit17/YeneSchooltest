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
exports.DataQualityService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let DataQualityService = class DataQualityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStudentConsistencyReport(schoolId) {
        const activeAcademicYear = await this.prisma.academicYear.findFirst({
            where: { schoolId, isActive: true },
            select: { id: true, name: true },
            orderBy: { startDate: 'desc' },
        });
        const academicYearId = activeAcademicYear?.id || null;
        const issues = [];
        const students = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        sp.id AS "studentProfileId",
        sp."userId" AS "studentUserId",
        sp."studentCode" AS "studentCode",
        u.name AS "studentName",
        sp."enrollmentStatus"::text AS "enrollmentStatus",
        sp."className" AS "profileClassName",
        sp.section AS "profileSection",
        COUNT(ps.id)::int AS "parentCount",
        sc."classId" AS "classId",
        c.name AS "className",
        c.section AS "classSection",
        sec.name AS "sectionName",
        sc."academicYear" AS "academicYear"
      FROM "StudentProfile" sp
      JOIN "User" u ON u.id = sp."userId"
      LEFT JOIN "ParentStudent" ps ON ps."studentId" = sp.id
      LEFT JOIN "StudentClass" sc
        ON sc."studentId" = sp."userId"
        ${academicYearId ? client_1.Prisma.sql `AND sc."academicYear" = ${academicYearId}` : client_1.Prisma.empty}
      LEFT JOIN "Class" c ON c.id = sc."classId"
      LEFT JOIN "Section" sec ON sec.id = sc."sectionId"
      WHERE sp."schoolId" = ${schoolId}
      GROUP BY
        sp.id,
        sp."userId",
        sp."studentCode",
        u.name,
        sp."enrollmentStatus",
        sp."className",
        sp.section,
        sc."classId",
        c.name,
        c.section,
        sec.name,
        sc."academicYear"
      ORDER BY sp."studentCode" ASC
    `);
        for (const student of students) {
            const base = {
                studentProfileId: student.studentProfileId,
                studentUserId: student.studentUserId,
                studentCode: student.studentCode,
                studentName: student.studentName,
                className: student.profileClassName,
                section: student.profileSection,
            };
            if (student.parentCount === 0) {
                issues.push({
                    ...base,
                    type: 'MISSING_PARENT_LINK',
                    severity: 'high',
                    detail: 'Student has no linked parent or guardian.',
                });
            }
            if (student.enrollmentStatus === 'APPROVED' &&
                !student.classId &&
                !student.profileClassName) {
                issues.push({
                    ...base,
                    type: 'MISSING_CLASS_PLACEMENT',
                    severity: 'high',
                    detail: activeAcademicYear
                        ? `Approved student has no class placement for ${activeAcademicYear.name}.`
                        : 'Approved student has no class placement and no active academic year was found.',
                });
            }
            else if (student.enrollmentStatus === 'APPROVED' && !student.classId) {
                issues.push({
                    ...base,
                    type: 'MISSING_CANONICAL_STUDENT_CLASS',
                    severity: 'medium',
                    detail: activeAcademicYear
                        ? `Profile shows ${student.profileClassName || 'class'} ${student.profileSection || ''}, but no StudentClass row exists for ${activeAcademicYear.name}.`
                        : 'Profile has a class value, but no StudentClass row exists and no active academic year was found.',
                });
            }
            if (student.classId) {
                if (student.profileClassName &&
                    student.className &&
                    student.profileClassName.trim() !== student.className.trim()) {
                    issues.push({
                        ...base,
                        type: 'PROFILE_CLASS_MISMATCH',
                        severity: 'medium',
                        detail: `Profile class is "${student.profileClassName}" but placement class is "${student.className}".`,
                    });
                }
                const placementSection = student.sectionName || student.classSection || null;
                if (student.profileSection &&
                    placementSection &&
                    student.profileSection.trim() !== placementSection.trim()) {
                    issues.push({
                        ...base,
                        type: 'PROFILE_SECTION_MISMATCH',
                        severity: 'medium',
                        detail: `Profile section is "${student.profileSection}" but placement section is "${placementSection}".`,
                    });
                }
            }
        }
        const classNameWithoutClass = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        'PROFILE_CLASS_NOT_FOUND' AS type,
        'medium' AS severity,
        sp.id AS "studentProfileId",
        sp."userId" AS "studentUserId",
        sp."studentCode" AS "studentCode",
        u.name AS "studentName",
        sp."className" AS "className",
        sp.section AS section,
        CONCAT('Profile references "', sp."className", ' ', COALESCE(sp.section, ''), '" but no matching Class exists for the active academic year.') AS detail
      FROM "StudentProfile" sp
      JOIN "User" u ON u.id = sp."userId"
      LEFT JOIN "Class" c
        ON c."schoolId" = sp."schoolId"
        AND c.name = sp."className"
        AND c.section = sp.section
        ${academicYearId ? client_1.Prisma.sql `AND c."academicYearId" = ${academicYearId}` : client_1.Prisma.empty}
      WHERE sp."schoolId" = ${schoolId}
        AND sp."className" IS NOT NULL
        AND sp.section IS NOT NULL
        AND c.id IS NULL
    `);
        issues.push(...classNameWithoutClass);
        const duplicateCodes = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        LOWER(TRIM(sp."studentCode")) AS "studentCode",
        COUNT(*)::int AS count,
        STRING_AGG(u.name, ', ' ORDER BY u.name) AS "studentNames"
      FROM "StudentProfile" sp
      JOIN "User" u ON u.id = sp."userId"
      WHERE sp."schoolId" = ${schoolId}
      GROUP BY LOWER(TRIM(sp."studentCode"))
      HAVING COUNT(*) > 1
    `);
        for (const duplicate of duplicateCodes) {
            issues.push({
                type: 'DUPLICATE_STUDENT_CODE',
                severity: 'high',
                studentCode: duplicate.studentCode,
                detail: `Student code appears ${duplicate.count} times: ${duplicate.studentNames}.`,
            });
        }
        const summary = issues.reduce((acc, issue) => {
            acc.total += 1;
            acc.bySeverity[issue.severity] += 1;
            acc.byType[issue.type] = (acc.byType[issue.type] || 0) + 1;
            return acc;
        }, {
            total: 0,
            bySeverity: { high: 0, medium: 0, low: 0 },
            byType: {},
        });
        return {
            academicYear: activeAcademicYear,
            checkedStudents: students.length,
            summary,
            issues,
        };
    }
};
exports.DataQualityService = DataQualityService;
exports.DataQualityService = DataQualityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DataQualityService);
//# sourceMappingURL=data-quality.service.js.map