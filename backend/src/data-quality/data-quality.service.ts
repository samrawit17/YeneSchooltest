import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolSettingsService } from '../school-settings/school-settings.service';

type IssueSeverity = 'high' | 'medium' | 'low';

type DataQualityIssue = {
  type: string;
  severity: IssueSeverity;
  studentProfileId?: string | null;
  studentUserId?: string | null;
  studentCode?: string | null;
  studentName?: string | null;
  className?: string | null;
  section?: string | null;
  placementClassName?: string | null;
  placementSection?: string | null;
  placementAcademicYear?: string | null;
  recommendation?: string;
  detail: string;
};

@Injectable()
export class DataQualityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolSettings: SchoolSettingsService,
  ) {}

  private async getDataQualityConfig(schoolId: string) {
    const keys = [
      'DATA_QUALITY_REQUIRE_STUDENT_CODE',
      'DATA_QUALITY_REQUIRE_FAYDA',
      'DATA_QUALITY_REQUIRE_MOTHER_NAME',
      'DATA_QUALITY_REQUIRE_PARENT',
      'DATA_QUALITY_REQUIRE_STUDENT_PHONE',
      'DATA_QUALITY_REQUIRE_STAFF_EMAIL',
      'DATA_QUALITY_REQUIRE_STAFF_PHONE',
      'DATA_QUALITY_CHECK_DUPLICATE_CODE',
      'DATA_QUALITY_CHECK_CLASS_MISMATCH',
      'DATA_QUALITY_CHECK_SECTION_MISMATCH',
      'DATA_QUALITY_CHECK_CLASS_HOMEROOM',
      'DATA_QUALITY_CHECK_TIMETABLE_CONFLICT',
    ];
    const entries = await Promise.all(
      keys.map(async (key) => {
        try {
          const value = await this.schoolSettings.getSetting(schoolId, key);
          return [key, value === true || value === 'true'] as const;
        } catch {
          return [key, false] as const;
        }
      }),
    );
    return Object.fromEntries(entries) as Record<string, boolean>;
  }

  async getStudentConsistencyReport(schoolId: string) {
    const activeAcademicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, name: true },
      orderBy: { startDate: 'desc' },
    });

    const activeAcademicYearKeys = activeAcademicYear
      ? Array.from(
          new Set(
            [activeAcademicYear.id, activeAcademicYear.name].filter(Boolean),
          ),
        )
      : [];
    const issues: DataQualityIssue[] = [];
    const warnings: string[] = [];

    if (!activeAcademicYear) {
      warnings.push(
        'No active academic year is configured, so active-year placement checks are limited to the latest student placement.',
      );
    }

    const config = await this.getDataQualityConfig(schoolId);

    const students = await this.prisma.$queryRaw<
      Array<{
        studentProfileId: string;
        studentUserId: string;
        studentCode: string;
        studentName: string;
        enrollmentStatus: string;
        profileClassName: string | null;
        profileSection: string | null;
        faydaNumber: string | null;
        motherName: string | null;
        phone: string | null;
        parentCount: number;
        parentSchoolMismatchCount: number;
        classId: string | null;
        className: string | null;
        classSection: string | null;
        sectionName: string | null;
        academicYear: string | null;
      }>
    >(Prisma.sql`
      SELECT
        sp.id AS "studentProfileId",
        sp."userId" AS "studentUserId",
        sp."studentCode" AS "studentCode",
        u.name AS "studentName",
        sp."enrollmentStatus"::text AS "enrollmentStatus",
        sp."className" AS "profileClassName",
        sp.section AS "profileSection",
        sp."faydaNumber" AS "faydaNumber",
        sp."motherName" AS "motherName",
        sp.phone AS "phone",
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
          ${
            activeAcademicYearKeys.length > 0
              ? Prisma.sql`AND sc."academicYear" IN (${Prisma.join(activeAcademicYearKeys.map(k => Prisma.sql`${k}::text`))})`
              : Prisma.empty
          }
        ORDER BY
          ${
            activeAcademicYear
              ? Prisma.sql`
                CASE
                  WHEN sc."academicYear" = ${activeAcademicYear.name} THEN 0
                  WHEN sc."academicYear" = ${activeAcademicYear.id} THEN 1
                  ELSE 2
                END,
              `
              : Prisma.empty
          }
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

      if (config.DATA_QUALITY_REQUIRE_STUDENT_CODE && !student.studentCode) {
        issues.push({
          ...base,
          type: 'MISSING_STUDENT_CODE',
          severity: 'high',
          detail: 'Student has no student code assigned.',
          recommendation: 'Assign a unique student code.',
        });
      }

      if (config.DATA_QUALITY_REQUIRE_FAYDA && !student.faydaNumber) {
        issues.push({
          ...base,
          type: 'MISSING_FAYDA_NUMBER',
          severity: 'high',
          detail: 'Student has no Fayda number.',
          recommendation: "Collect and record the student's Fayda number.",
        });
      }

      if (config.DATA_QUALITY_REQUIRE_MOTHER_NAME && !student.motherName) {
        issues.push({
          ...base,
          type: 'MISSING_MOTHER_NAME',
          severity: 'medium',
          detail: 'Student has no mother name on file.',
          recommendation: "Record the mother's name.",
        });
      }

      if (config.DATA_QUALITY_REQUIRE_STUDENT_PHONE && !student.phone) {
        issues.push({
          ...base,
          type: 'MISSING_STUDENT_PHONE',
          severity: 'low',
          detail: 'Student has no phone number.',
          recommendation: 'Record a contact phone number for the student.',
        });
      }

      if (config.DATA_QUALITY_REQUIRE_PARENT && student.parentCount === 0) {
        issues.push({
          ...base,
          type: 'MISSING_PARENT_LINK',
          severity: 'high',
          detail: 'Student has no linked parent or guardian.',
          recommendation:
            'Link at least one parent or guardian before publishing parent-facing records.',
        });
      }

      if (student.parentSchoolMismatchCount > 0) {
        issues.push({
          ...base,
          type: 'PARENT_LINK_SCHOOL_MISMATCH',
          severity: 'high',
          detail: `Student has ${student.parentSchoolMismatchCount} parent link${student.parentSchoolMismatchCount === 1 ? '' : 's'} attached to another school.`,
          recommendation:
            'Remove the cross-school parent link and recreate it under this school.',
        });
      }

      if (
        activeAcademicYear &&
        student.enrollmentStatus === 'APPROVED' &&
        !student.classId &&
        !student.profileClassName
      ) {
        issues.push({
          ...base,
          type: 'MISSING_CLASS_PLACEMENT',
          severity: 'high',
          detail: `Approved student has no class placement for ${activeAcademicYear.name}.`,
          recommendation:
            'Assign the student to a class and section for the active academic year.',
        });
      } else if (
        activeAcademicYear &&
        student.enrollmentStatus === 'APPROVED' &&
        !student.classId
      ) {
        issues.push({
          ...base,
          type: 'MISSING_CANONICAL_STUDENT_CLASS',
          severity: 'medium',
          detail: `Profile shows ${student.profileClassName || 'class'} ${student.profileSection || ''}, but no StudentClass row exists for ${activeAcademicYear.name}.`,
          recommendation:
            'Create or repair the canonical StudentClass placement for this active year.',
        });
      }

      if (student.classId && config.DATA_QUALITY_CHECK_CLASS_MISMATCH) {
        if (
          student.profileClassName &&
          student.className &&
          student.profileClassName.trim() !== student.className.trim()
        ) {
          issues.push({
            ...base,
            type: 'PROFILE_CLASS_MISMATCH',
            severity: 'medium',
            detail: `Profile class is "${student.profileClassName}" but placement class is "${student.className}".`,
            recommendation:
              'Update the profile class label or the canonical placement so both show the same class.',
          });
        }
      }

      if (student.classId && config.DATA_QUALITY_CHECK_SECTION_MISMATCH) {
        if (
          student.profileSection &&
          placementSection &&
          student.profileSection.trim() !== placementSection.trim()
        ) {
          issues.push({
            ...base,
            type: 'PROFILE_SECTION_MISMATCH',
            severity: 'medium',
            detail: `Profile section is "${student.profileSection}" but placement section is "${placementSection}".`,
            recommendation:
              'Update the profile section label or the canonical placement so both show the same section.',
          });
        }
      }
    }

    const classNameWithoutClass = await this.prisma.$queryRaw<
      DataQualityIssue[]
    >(Prisma.sql`
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
        ${
          activeAcademicYear
            ? Prisma.sql`AND c."academicYearId" = ${activeAcademicYear.id}`
            : Prisma.empty
        }
      WHERE sp."schoolId" = ${schoolId}
        AND sp."className" IS NOT NULL
        AND sp.section IS NOT NULL
        ${activeAcademicYear ? Prisma.empty : Prisma.sql`AND FALSE`}
        AND c.id IS NULL
    `);

    issues.push(...classNameWithoutClass);

    if (activeAcademicYearKeys.length > 1) {
      const studentClassRows = await this.prisma.studentClass.findMany({
        where: {
          schoolId,
          academicYear: { in: activeAcademicYearKeys },
        },
        select: { studentId: true },
      });

      const duplicateStudentIds = [...new Set(
        studentClassRows
          .map((r) => r.studentId)
          .filter((id) => studentClassRows.filter((r2) => r2.studentId === id).length > 1)
      )];

      if (duplicateStudentIds.length > 0) {
        const students = await this.prisma.studentProfile.findMany({
          where: { userId: { in: duplicateStudentIds }, schoolId },
          select: { id: true, userId: true, studentCode: true, className: true, section: true },
        });

        for (const s of students) {
          issues.push({
            type: 'DUPLICATE_ACTIVE_YEAR_PLACEMENT',
            severity: 'medium',
            studentProfileId: s.id,
            studentUserId: s.userId,
            studentCode: s.studentCode,
            className: s.className,
            section: s.section,
            placementAcademicYear: activeAcademicYear?.name || '',
            detail: `Student has duplicate placement rows for active academic year ${activeAcademicYear?.name || ''}.`,
            recommendation: 'Keep one active-year StudentClass row using the current year format and remove the duplicate.',
          });
        }
      }
    }

    if (config.DATA_QUALITY_CHECK_DUPLICATE_CODE) {
    const duplicateCodes = await this.prisma.$queryRaw<
      Array<{
        studentCode: string;
        count: number;
        studentNames: string;
      }>
    >(Prisma.sql`
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
        recommendation:
          'Assign unique student codes before generating credentials or reports.',
      });
    }
    } // end DATA_QUALITY_CHECK_DUPLICATE_CODE block

    const summary = issues.reduce(
      (acc, issue) => {
        acc.total += 1;
        acc.bySeverity[issue.severity] += 1;
        acc.byType[issue.type] = (acc.byType[issue.type] || 0) + 1;
        return acc;
      },
      {
        total: 0,
        bySeverity: { high: 0, medium: 0, low: 0 },
        byType: {} as Record<string, number>,
      },
    );

    return {
      academicYear: activeAcademicYear,
      academicYearKeysChecked: activeAcademicYearKeys,
      checkedStudents: students.length,
      warnings,
      summary,
      issues,
    };
  }

  async getStaffConsistencyReport(schoolId: string) {
    const config = await this.getDataQualityConfig(schoolId);

    const issues: DataQualityIssue[] = [];
    const summary = { total: 0, bySeverity: { high: 0, medium: 0, low: 0 }, byType: {} as Record<string, number> };

    if (config.DATA_QUALITY_REQUIRE_STAFF_EMAIL || config.DATA_QUALITY_REQUIRE_STAFF_PHONE) {
      const staff = await this.prisma.user.findMany({
        where: { schoolId, role: { in: ['TEACHER', 'ADMIN', 'FINANCE', 'REGISTRAR', 'IT_MANAGER'] }, deletedAt: null },
        select: { id: true, name: true, email: true, phone: true, role: true },
      });

      for (const user of staff) {
        if (config.DATA_QUALITY_REQUIRE_STAFF_EMAIL && !user.email) {
          issues.push({
            type: 'MISSING_STAFF_EMAIL',
            severity: 'medium',
            studentName: user.name,
            detail: `Staff member ${user.name} (${user.role}) has no email address.`,
            recommendation: 'Record an email address for this staff member.',
          });
        }
        if (config.DATA_QUALITY_REQUIRE_STAFF_PHONE && !user.phone) {
          issues.push({
            type: 'MISSING_STAFF_PHONE',
            severity: 'low',
            studentName: user.name,
            detail: `Staff member ${user.name} (${user.role}) has no phone number.`,
            recommendation: 'Record a phone number for this staff member.',
          });
        }
      }
    }

    issues.forEach((issue) => {
      summary.total += 1;
      summary.bySeverity[issue.severity] += 1;
      summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;
    });

    return { checkedStaff: issues.length, summary, issues };
  }

  async getClassStructureReport(schoolId: string) {
    const config = await this.getDataQualityConfig(schoolId);
    const issues: DataQualityIssue[] = [];

    if (config.DATA_QUALITY_CHECK_CLASS_HOMEROOM) {
      const classesWithoutHomeroom = await this.prisma.class.findMany({
        where: { schoolId, homeroomTeacherId: null },
        select: { id: true, name: true, section: true },
      });

      for (const cls of classesWithoutHomeroom) {
        issues.push({
          type: 'CLASS_WITHOUT_HOMEROOM',
          severity: 'medium',
          detail: `Class ${cls.name} ${cls.section} has no homeroom teacher assigned.`,
          recommendation: 'Assign a homeroom teacher to this class.',
          className: cls.name,
          section: cls.section,
        });
      }
    }

    const summary = issues.reduce(
      (acc, issue) => {
        acc.total += 1;
        acc.bySeverity[issue.severity] += 1;
        acc.byType[issue.type] = (acc.byType[issue.type] || 0) + 1;
        return acc;
      },
      { total: 0, bySeverity: { high: 0, medium: 0, low: 0 }, byType: {} as Record<string, number> },
    );

    return { summary, issues };
  }

  async getTimetableConflictReport(schoolId: string) {
    const config = await this.getDataQualityConfig(schoolId);
    const issues: DataQualityIssue[] = [];

    if (config.DATA_QUALITY_CHECK_TIMETABLE_CONFLICT) {
      const teacherSlots = await this.prisma.timetableSlot.findMany({
        where: { schoolId, teacherId: { not: null } },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          teacherId: true,
          classId: true,
          sectionId: true,
          room: true,
        },
        orderBy: [{ teacherId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      const grouped: Record<string, typeof teacherSlots> = {};
      for (const slot of teacherSlots) {
        const key = `${slot.teacherId}-${slot.dayOfWeek}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(slot);
      }

      for (const [, slots] of Object.entries(grouped)) {
        for (let i = 0; i < slots.length; i++) {
          for (let j = i + 1; j < slots.length; j++) {
            const a = slots[i];
            const b = slots[j];
            if (a.endTime > b.startTime && b.endTime > a.startTime) {
              issues.push({
                type: 'TIMETABLE_TEACHER_CONFLICT',
                severity: 'high',
                detail: `Teacher ${a.teacherId} has overlapping slots on day ${a.dayOfWeek}: ${a.startTime}-${a.endTime} and ${b.startTime}-${b.endTime}.`,
                recommendation: 'Adjust the timetable to remove the overlap.',
              });
            }
          }
        }
      }
    }

    const summary = issues.reduce(
      (acc, issue) => {
        acc.total += 1;
        acc.bySeverity[issue.severity] += 1;
        acc.byType[issue.type] = (acc.byType[issue.type] || 0) + 1;
        return acc;
      },
      { total: 0, bySeverity: { high: 0, medium: 0, low: 0 }, byType: {} as Record<string, number> },
    );

    return { summary, issues };
  }
}
