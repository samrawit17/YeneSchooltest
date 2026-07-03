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
        const activeAcademicYearKeys = activeAcademicYear
            ? Array.from(new Set([activeAcademicYear.id, activeAcademicYear.name].filter(Boolean)))
            : [];
        const issues = [];
        const warnings = [];
        if (!activeAcademicYear) {
            warnings.push('No active academic year is configured, so active-year placement checks are limited to the latest student placement.');
        }
        const students = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT
        sp.id AS "studentProfileId",
        sp."userId" AS "studentUserId",
        sp."studentCode" AS "studentCode",
        u.name AS "studentName",
        sp."enrollmentStatus"::text AS "enrollmentStatus",
        sp."className" AS "profileClassName",
        sp.section AS "profileSection",
        (
          SELECT COUNT(*)::int
          FROM "ParentStudent" ps
          WHERE ps."studentId" = sp.id
            AND ps."schoolId" = sp."schoolId"
        ) AS "parentCount",
        (
          SELECT COUNT(*)::int
          FROM "ParentStudent" ps
          WHERE ps."studentId" = sp.id
            AND ps."schoolId" <> sp."schoolId"
        ) AS "parentSchoolMismatchCount",
        sc."classId" AS "classId",
        c.name AS "className",
        c.section AS "classSection",
        sec.name AS "sectionName",
        sc."academicYear" AS "academicYear"
      FROM "StudentProfile" sp
      JOIN "User" u ON u.id = sp."userId"
      LEFT JOIN LATERAL (
        SELECT sc.*
        FROM "StudentClass" sc
        WHERE sc."studentId" = sp."userId"
          AND sc."schoolId" = sp."schoolId"
          ${activeAcademicYearKeys.length > 0
            ? client_1.Prisma.sql `AND sc."academicYear" IN (${client_1.Prisma.join(activeAcademicYearKeys)})`
            : client_1.Prisma.empty}
        ORDER BY
          ${activeAcademicYear
            ? client_1.Prisma.sql `
                CASE
                  WHEN sc."academicYear" = ${activeAcademicYear.name} THEN 0
                  WHEN sc."academicYear" = ${activeAcademicYear.id} THEN 1
                  ELSE 2
                END,
              `
            : client_1.Prisma.empty}
          sc."updatedAt" DESC
        LIMIT 1
      ) sc ON TRUE
      LEFT JOIN "Class" c ON c.id = sc."classId"
      LEFT JOIN "Section" sec ON sec.id = sc."sectionId"
      WHERE sp."schoolId" = ${schoolId}
      ORDER BY sp."studentCode" ASC
    `);
        for (const student of students) {
            const placementSection = student.sectionName || student.classSection || null;
            const base = {
                studentProfileId: student.studentProfileId,
                studentUserId: student.studentUserId,
                studentCode: student.studentCode,
                studentName: student.studentName,
                className: student.profileClassName,
                section: student.profileSection,
                placementClassName: student.className,
                placementSection,
                placementAcademicYear: student.academicYear,
            };
            if (student.parentCount === 0) {
                issues.push({
                    ...base,
                    type: 'MISSING_PARENT_LINK',
                    severity: 'high',
                    detail: 'Student has no linked parent or guardian.',
                    recommendation: 'Link at least one parent or guardian before publishing parent-facing records.',
                });
            }
            if (student.parentSchoolMismatchCount > 0) {
                issues.push({
                    ...base,
                    type: 'PARENT_LINK_SCHOOL_MISMATCH',
                    severity: 'high',
                    detail: `Student has ${student.parentSchoolMismatchCount} parent link${student.parentSchoolMismatchCount === 1 ? '' : 's'} attached to another school.`,
                    recommendation: 'Remove the cross-school parent link and recreate it under this school.',
                });
            }
            if (activeAcademicYear &&
                student.enrollmentStatus === 'APPROVED' &&
                !student.classId &&
                !student.profileClassName) {
                issues.push({
                    ...base,
                    type: 'MISSING_CLASS_PLACEMENT',
                    severity: 'high',
                    detail: `Approved student has no class placement for ${activeAcademicYear.name}.`,
                    recommendation: 'Assign the student to a class and section for the active academic year.',
                });
            }
            else if (activeAcademicYear &&
                student.enrollmentStatus === 'APPROVED' &&
                !student.classId) {
                issues.push({
                    ...base,
                    type: 'MISSING_CANONICAL_STUDENT_CLASS',
                    severity: 'medium',
                    detail: `Profile shows ${student.profileClassName || 'class'} ${student.profileSection || ''}, but no StudentClass row exists for ${activeAcademicYear.name}.`,
                    recommendation: 'Create or repair the canonical StudentClass placement for this active year.',
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
                        recommendation: 'Update the profile class label or the canonical placement so both show the same class.',
                    });
                }
                if (student.profileSection &&
                    placementSection &&
                    student.profileSection.trim() !== placementSection.trim()) {
                    issues.push({
                        ...base,
                        type: 'PROFILE_SECTION_MISMATCH',
                        severity: 'medium',
                        detail: `Profile section is "${student.profileSection}" but placement section is "${placementSection}".`,
                        recommendation: 'Update the profile section label or the canonical placement so both show the same section.',
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
        NULL AS "placementClassName",
        NULL AS "placementSection",
        NULL AS "placementAcademicYear",
        'Create the missing class/section for the active year or update the profile to an existing class.' AS recommendation,
        CONCAT('Profile references "', sp."className", ' ', COALESCE(sp.section, ''), '" but no matching Class exists for the active academic year.') AS detail
      FROM "StudentProfile" sp
      JOIN "User" u ON u.id = sp."userId"
      LEFT JOIN "Class" c
        ON c."schoolId" = sp."schoolId"
        AND c.name = sp."className"
        AND c.section = sp.section
        ${activeAcademicYear
            ? client_1.Prisma.sql `AND c."academicYearId" = ${activeAcademicYear.id}`
            : client_1.Prisma.empty}
      WHERE sp."schoolId" = ${schoolId}
        AND sp."className" IS NOT NULL
        AND sp.section IS NOT NULL
        ${activeAcademicYear ? client_1.Prisma.empty : client_1.Prisma.sql `AND FALSE`}
        AND c.id IS NULL
    `);
        issues.push(...classNameWithoutClass);
        if (activeAcademicYearKeys.length > 1) {
            const duplicateActiveYearPlacements = await this.prisma.$queryRaw(client_1.Prisma.sql `
        SELECT
          'DUPLICATE_ACTIVE_YEAR_PLACEMENT' AS type,
          'medium' AS severity,
          sp.id AS "studentProfileId",
          sp."userId" AS "studentUserId",
          sp."studentCode" AS "studentCode",
          u.name AS "studentName",
          sp."className" AS "className",
          sp.section AS section,
          NULL AS "placementClassName",
          NULL AS "placementSection",
          NULL AS "placementAcademicYear",
          'Keep one active-year StudentClass row using the current year format and remove the duplicate.' AS recommendation,
          CONCAT('Student has ', COUNT(sc.id)::int, ' placement rows for active academic year ', ${activeAcademicYear?.name || ''}, '.') AS detail
        FROM "StudentProfile" sp
        JOIN "User" u ON u.id = sp."userId"
        JOIN "StudentClass" sc
          ON sc."studentId" = sp."userId"
          AND sc."schoolId" = sp."schoolId"
          AND sc."academicYear" IN (${client_1.Prisma.join(activeAcademicYearKeys)})
        WHERE sp."schoolId" = ${schoolId}
        GROUP BY sp.id, sp."userId", sp."studentCode", u.name, sp."className", sp.section
        HAVING COUNT(sc.id) > 1
      `);
            issues.push(...duplicateActiveYearPlacements);
        }
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
                recommendation: 'Assign unique student codes before generating credentials or reports.',
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
            academicYearKeysChecked: activeAcademicYearKeys,
            checkedStudents: students.length,
            warnings,
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