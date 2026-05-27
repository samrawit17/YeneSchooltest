import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentStatus, Role } from '@prisma/client';

export interface AutoAssignmentResult {
  success: boolean;
  message: string;
  studentName?: string;
  classId?: string;
  sectionId?: string;
  rollNumber?: string;
}

interface StudentData {
  email: string;
  password: string;
  name: string;
  schoolId: string;
  academicYear: string;
  gradeId: string;
  gender?: string;
  address?: string;
  phone?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  photo?: string;
  documents?: {
    type: string;
    fileUrl: string;
    title?: string;
  }[];
}

interface ClassSectionInfo {
  classId: string;
  sectionId: string;
  className: string;
  sectionName: string;
  stream: string | null;
}

@Injectable()
export class AutoAssignmentService {
  private readonly logger = new Logger(AutoAssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeStudentStream(stream?: string | null) {
    const normalized = String(stream || '').trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (!['SOCIAL', 'NATURAL'].includes(normalized)) {
      throw new Error('Student stream must be SOCIAL or NATURAL for Grade 11 and 12');
    }
    return normalized;
  }

  private async getDefaultSectionCapacity(tx: any, schoolId: string) {
    const capacitySetting = await tx.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'DEFAULT_SECTION_CAPACITY' } },
    });
    const parsed =
      typeof capacitySetting?.value === 'number'
        ? capacitySetting.value
        : parseInt(String(capacitySetting?.value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
  }

  /**
   * Auto-assign a single student based on enrollment
   */
  async autoAssignStudent(
    enrollmentId: string,
    schoolId: string,
  ): Promise<AutoAssignmentResult> {
    try {
      const result = await this.completeAutoAssignment(
        null,
        schoolId,
        enrollmentId,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Auto-assignment failed for enrollment ${enrollmentId}: ${error.message}`,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Bulk auto-assignment for multiple enrollments
   */
  async bulkAutoAssign(
    enrollmentIds: string[],
    schoolId: string,
  ): Promise<AutoAssignmentResult[]> {
    const results: AutoAssignmentResult[] = [];

    for (const enrollmentId of enrollmentIds) {
      const result = await this.autoAssignStudent(enrollmentId, schoolId);
      results.push(result);
    }

    return results;
  }

  /**
   * Re-run auto-assignment for a student (for reassignment scenarios)
   */
  async reAssignStudent(
    enrollmentId: string,
    schoolId: string,
  ): Promise<AutoAssignmentResult> {
    // First, delete any existing assignment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (enrollment) {
      await this.prisma.studentClass.deleteMany({
        where: {
          studentId: enrollment.studentId,
          academicYear: enrollment.academicYear,
        },
      });
    }

    // Then re-run auto-assignment
    return this.autoAssignStudent(enrollmentId, schoolId);
  }

  /**
   * Get current assignment info for a student
   */
  async getStudentAssignment(studentId: string, schoolId: string) {
    const assignment = await this.prisma.studentClass.findFirst({
      where: {
        studentId,
        schoolId,
      },
      include: {
        class: true,
        section: true,
      },
    });

    if (!assignment) {
      return {
        hasAssignment: false,
        message: 'Student is not assigned to any class',
      };
    }

    return {
      hasAssignment: true,
      assignment: {
        classId: assignment.classId,
        className: assignment.class?.name,
        sectionId: assignment.sectionId,
        sectionName: assignment.section?.name,
        academicYear: assignment.academicYear,
      },
    };
  }

  /**
   * Find academic year by name
   */
  async findAcademicYearByName(schoolId: string, academicYearName: string) {
    return this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        name: academicYearName,
      },
    });
  }

  /**
   * Get class capacity information
   */
  async getClassCapacityInfo(
    schoolId: string,
    academicYearId: string,
    grade: number,
  ) {
    const classes = await this.prisma.class.findMany({
      where: {
        schoolId,
        academicYearId,
        grade,
      },
      include: {
        sections: {
          include: {
            _count: {
              select: { studentClasses: true },
            },
          },
        },
      },
    });

    return classes.map((cls) => ({
      classId: cls.id,
      className: cls.name,
      totalSections: cls.sections.length,
      sections: cls.sections.map((section) => ({
        sectionId: section.id,
        sectionName: section.name,
        capacity: section.capacity,
        currentCount: section._count.studentClasses,
        available: section.capacity - section._count.studentClasses,
      })),
    }));
  }

  /**
   * Complete auto-assignment workflow for approved enrollment
   * This orchestrates the entire process of assigning a student to a class/section
   */
  async completeAutoAssignment(
    studentId: string | null,
    schoolId: string,
    enrollmentId: string,
  ): Promise<AutoAssignmentResult> {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Get the enrollment record
      const enrollment = await tx.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          student: {
            include: {
              studentProfile: true,
            },
          },
          gradeLevel: true,
        },
      });

      if (!enrollment) {
        throw new NotFoundException(`Enrollment not found: ${enrollmentId}`);
      }

      // Use studentId from enrollment if not provided
      if (!studentId) {
        studentId = enrollment.studentId;
      }

      if (enrollment.status !== EnrollmentStatus.APPROVED) {
        return {
          success: false,
          message: `Enrollment status is ${enrollment.status}, expected APPROVED`,
          studentName: enrollment.student?.name,
        };
      }

      // Step 2: Check if already assigned
      const existingAssignment = await tx.studentClass.findFirst({
        where: {
          studentId: enrollment.studentId,
          academicYear: enrollment.academicYear,
        },
      });

      if (existingAssignment) {
        return {
          success: true,
          message: 'Student is already assigned to a class/section',
          studentName: enrollment.student?.name,
          classId: existingAssignment.classId,
          sectionId: existingAssignment.sectionId,
        };
      }

      // Step 3: Get academic year record
      const academicYearRecord = await tx.academicYear.findFirst({
        where: {
          schoolId,
          name: enrollment.academicYear,
        },
      });

      if (!academicYearRecord) {
        throw new NotFoundException(
          `Academic year not found: ${enrollment.academicYear}`,
        );
      }

      const classSectionInfo = await this.findOrCreateClassSection(
        tx,
        schoolId,
        academicYearRecord.id,
        enrollment.gradeId,
        enrollment.grade ?? enrollment.gradeLevel?.level ?? null,
        enrollment.gradeLevel?.name ?? null,
        enrollment.student.studentProfile?.stream ?? null,
      );

      // Step 4: Generate unique roll number
      const rollNumber = await this.generateRollNumber(
        tx,
        classSectionInfo.classId,
        classSectionInfo.sectionId,
        schoolId,
      );

      // Step 5: Create StudentClass record
      await tx.studentClass.create({
        data: {
          studentId: enrollment.studentId,
          classId: classSectionInfo.classId,
          sectionId: classSectionInfo.sectionId,
          schoolId,
          academicYear: enrollment.academicYear,
        },
      });

      // Step 6: Update StudentProfile with class assignment
      if (enrollment.student.studentProfile) {
        await tx.studentProfile.update({
          where: { id: enrollment.student.studentProfile.id },
          data: {
            enrollmentStatus: EnrollmentStatus.APPROVED,
            academicYear: enrollment.academicYear,
            className: classSectionInfo.className,
            stream: classSectionInfo.stream,
            section: classSectionInfo.sectionName,
            rollNumber,
          },
        });
      }

      // Step 7: Update enrollment status
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: EnrollmentStatus.APPROVED },
      });

      return {
        success: true,
        message: `Auto-assignment completed: ${enrollment.student.name} assigned to class ${classSectionInfo.classId}, section ${classSectionInfo.sectionId}`,
        studentName: enrollment.student?.name,
        classId: classSectionInfo.classId,
        sectionId: classSectionInfo.sectionId,
        rollNumber,
      };
    });
  }

  /**
   * Find or create class and section for a grade level
   */
  private async findOrCreateClassSection(
    tx: any,
    schoolId: string,
    academicYearId: string,
    gradeId: string | null,
    grade: number | null,
    gradeLabel: string | null,
    requestedStream?: string | null,
  ): Promise<ClassSectionInfo> {
    if (!gradeId) {
      throw new Error('gradeId is required for auto-assignment');
    }
    const isSeniorStreamGrade = grade === 11 || grade === 12;
    const stream = isSeniorStreamGrade ? this.normalizeStudentStream(requestedStream) : null;
    if (isSeniorStreamGrade && !stream) {
      throw new Error('Grade 11 and 12 students must have a stream before auto-assignment');
    }
    const gradeName = gradeLabel || (grade ? `Grade ${grade}` : `Grade ${gradeId}`);
    const className = gradeName;

    // Step 1: Find or create the Class (grade level)
    let classRecord = await tx.class.findFirst({
      where: {
        schoolId,
        gradeId,
        academicYearId,
        name: className,
      },
    });

    if (!classRecord) {
      // Create new class for this grade
      classRecord = await tx.class.create({
        data: {
          schoolId,
          gradeId,
          academicYearId,
          name: className,
          grade: grade ?? undefined,
          section: 'A', // Default section
        },
      });
      this.logger.log(
        `Created new class for gradeId ${gradeId} for academic year ${academicYearId}`,
      );
    }

    // Step 2: Find available section with capacity
    const sections = await tx.section.findMany({
      where: { classId: classRecord.id },
      include: {
        _count: {
          select: { studentClasses: true },
        },
      },
    });

    let selectedSection = sections.find((s: any) => {
      const sectionStream = this.normalizeStudentStream(s.stream);
      return (
        (!isSeniorStreamGrade || !sectionStream || sectionStream === stream) &&
        s._count.studentClasses < s.capacity
      );
    });

    // If no section has capacity, create a new one
    if (!selectedSection) {
      const defaultCapacity = await this.getDefaultSectionCapacity(tx, schoolId);
      const nextSectionLetter = this.getNextSectionLetter(sections.length);
      selectedSection = await tx.section.create({
        data: {
          classId: classRecord.id,
          name: nextSectionLetter,
          stream,
          capacity: defaultCapacity,
        },
      });
      this.logger.log(
        `Created new section ${nextSectionLetter} for class ${classRecord.id}`,
      );
    } else if (isSeniorStreamGrade && !selectedSection.stream) {
      selectedSection = await tx.section.update({
        where: { id: selectedSection.id },
        data: { stream },
      });
    }

    return {
      classId: classRecord.id,
      sectionId: selectedSection.id,
      className: classRecord.name,
      sectionName: selectedSection.name,
      stream,
    };
  }

  /**
   * Generate a unique roll number for the student
   */
  private async generateRollNumber(
    tx: any,
    classId: string,
    sectionId: string,
    schoolId: string,
  ): Promise<string> {
    // Get existing roll numbers for this class/section
    const existingStudents = await tx.studentProfile.findMany({
      where: {
        className: classId,
        section: sectionId,
        schoolId,
      },
      orderBy: {
        rollNumber: 'desc',
      },
      take: 1,
    });

    let nextNumber = 1;
    if (existingStudents.length > 0 && existingStudents[0].rollNumber) {
      const lastRollNumber = existingStudents[0].rollNumber;
      // Extract number from roll number (e.g., "001" -> 1)
      const lastNumber = parseInt(lastRollNumber.replace(/\D/g, ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format roll number with leading zeros (e.g., 001, 002, etc.)
    return String(nextNumber).padStart(3, '0');
  }

  /**
   * Get the next section letter (A, B, C, etc.)
   */
  private getNextSectionLetter(currentCount: number): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[currentCount % letters.length];
  }
}
