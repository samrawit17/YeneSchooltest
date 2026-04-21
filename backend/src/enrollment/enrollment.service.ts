import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolService } from '../school/school.service';
import { AcademicYearService } from '../academic-year/academic-year.service';
import { NotificationService } from '../notification/notification.service';
import { EnrollmentStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolService: SchoolService,
    private readonly academicYearService: AcademicYearService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Resolve school by enrollment key
   */
  async resolveSchoolByKey(enrollmentKey: string) {
    const school =
      await this.schoolService.getSchoolByEnrollmentKey(enrollmentKey);

    if (!school) {
      throw new NotFoundException('Invalid enrollment key');
    }

    return school;
  }

  /**
   * Generate a secure enrollment token for frontend
   * This token contains the schoolId encrypted, so frontend cannot tamper with it
   */
  generateEnrollmentToken(schoolId: string): string {
    const payload = JSON.stringify({ schoolId, exp: Date.now() + 3600000 }); // 1 hour expiry
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-key',
      'salt',
      32,
    );
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Verify and decrypt enrollment token
   */
  verifyEnrollmentToken(token: string): {
    valid: boolean;
    schoolId?: string;
    error?: string;
  } {
    try {
      const [ivHex, authTagHex, encrypted] = token.split(':');

      if (!ivHex || !authTagHex || !encrypted) {
        return { valid: false, error: 'Invalid token format' };
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = crypto.scryptSync(
        process.env.ENCRYPTION_KEY || 'default-key',
        'salt',
        32,
      );
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const payload = JSON.parse(decrypted);

      if (payload.exp < Date.now()) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, schoolId: payload.schoolId };
    } catch (error) {
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Get decrypted schoolId from token (for internal use)
   */
  getSchoolIdFromToken(token: string): string {
    const result = this.verifyEnrollmentToken(token);

    if (!result.valid || !result.schoolId) {
      throw new NotFoundException('Invalid or expired enrollment token');
    }

    return result.schoolId;
  }

  /**
   * Approve enrollment with auto-section assignment
   */
  async approveEnrollment(enrollmentId: string, schoolId: string) {
    // Get the enrollment with student and parent information
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        gradeLevel: true,
        student: {
          include: {
            studentProfile: {
              include: {
                parents: {
                  include: {
                    parent: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.schoolId !== schoolId) {
      throw new BadRequestException(
        'Enrollment does not belong to this school',
      );
    }

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new BadRequestException('Enrollment is not pending');
    }

    // Check if auto-section assignment is enabled
    const autoSectionAssignment =
      await this.isAutoSectionAssignmentEnabled(schoolId);

    let targetClass: { id: string; name: string } | null = null;
    let availableSection: { id: string; name: string } | null = null;

    if (autoSectionAssignment) {
      // Get the current active academic year
      const academicYear =
        await this.academicYearService.getActiveAcademicYear(schoolId);

      if (!academicYear) {
        throw new BadRequestException('No active academic year found');
      }

      // Find the class for this grade level in the current academic year
      targetClass = await this.findClassForGrade(
        enrollment.gradeId,
        academicYear.id,
        schoolId,
      );

      if (!targetClass) {
        throw new BadRequestException(
          `No class found for grade ${enrollment.gradeLevel?.name || enrollment.gradeId} in the current academic year`,
        );
      }

      // Find available section with balanced assignment
      availableSection = await this.findAvailableSection(targetClass.id);

      if (!availableSection) {
        throw new BadRequestException(
          'All sections are full. Cannot approve enrollment.',
        );
      }

      // Create the StudentClass record
      await this.prisma.studentClass.create({
        data: {
          studentId: enrollment.studentId,
          classId: targetClass.id,
          sectionId: availableSection.id,
          schoolId,
          academicYear: academicYear.name,
        },
      });
    }

    // Update enrollment status to APPROVED
    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.APPROVED },
    });

    // Send notification to student
    const className = targetClass
      ? `${targetClass.name}${availableSection ? ` - ${availableSection.name}` : ''}`
      : enrollment.gradeLevel?.name || 'their class';

    await this.notificationService.notifyEnrollmentApproval(
      schoolId,
      enrollment.studentId,
      enrollment.student.name || 'Student',
      className,
    );

    // Send notification to parents
    if (enrollment.student.studentProfile?.parents) {
      for (const parentRelation of enrollment.student.studentProfile.parents) {
        if (parentRelation.parent.user) {
          await this.notificationService.notifyEnrollmentApproval(
            schoolId,
            parentRelation.parent.user.id,
            enrollment.student.name || 'Student',
            className,
          );
        }
      }
    }

    return updatedEnrollment;
  }

  /**
   * Check if auto-section assignment is enabled for the school
   */
  private async isAutoSectionAssignmentEnabled(
    schoolId: string,
  ): Promise<boolean> {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: {
        schoolId_key: {
          schoolId,
          key: 'autoSectionAssignment',
        },
      },
    });

    if (!setting) {
      return true; // Default to enabled if not set
    }

    return setting.value === 'true';
  }

  /**
   * Find class for a grade level in the current academic year
   */
  private async findClassForGrade(
    gradeId: string | null,
    academicYearId: string,
    schoolId: string,
  ): Promise<{ id: string; name: string } | null> {
    if (!gradeId) {
      // Fallback to finding by grade level if gradeId is not provided
      return null;
    }

    return this.prisma.class.findFirst({
      where: {
        gradeId,
        academicYearId,
        schoolId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  /**
   * Find the section with the lowest student count that has available capacity
   */
  private async findAvailableSection(
    classId: string,
  ): Promise<{ id: string; name: string } | null> {
    const sections = await this.prisma.section.findMany({
      where: { classId },
      include: {
        _count: {
          select: { studentClasses: true },
        },
      },
    });

    // Filter sections with available capacity
    const availableSections = sections.filter(
      (section) => section._count.studentClasses < section.capacity,
    );

    if (availableSections.length === 0) {
      return null;
    }

    // Sort by student count (ascending) for balanced assignment
    availableSections.sort(
      (a, b) => a._count.studentClasses - b._count.studentClasses,
    );

    return {
      id: availableSections[0].id,
      name: availableSections[0].name,
    };
  }

  /**
   * Get enrollment by ID with all related data
   */
  async getEnrollmentById(enrollmentId: string) {
    return this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        gradeLevel: true,
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get all enrollments for a school
   */
  async getEnrollmentsBySchool(schoolId: string, status?: EnrollmentStatus) {
    return this.prisma.enrollment.findMany({
      where: {
        schoolId,
        ...(status && { status }),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        gradeLevel: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new enrollment
   */
  async createEnrollment(data: {
    studentId: string;
    schoolId: string;
    academicYear: string;
    gradeId?: string;
    documents?: any;
    metadata?: any;
  }) {
    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId: data.studentId,
        schoolId: data.schoolId,
        academicYear: data.academicYear,
        gradeId: data.gradeId,
        documents: data.documents,
        metadata: data.metadata,
        status: EnrollmentStatus.PENDING,
      },
      include: {
        student: true,
        gradeLevel: true,
      },
    });

    // Notify admins of new enrollment
    await this.notificationService.notifyAdminsOfNewEnrollment(
      data.schoolId,
      enrollment.student.name || 'A student',
      enrollment.gradeLevel?.name || data.gradeId || 'Unknown grade',
    );

    return enrollment;
  }

  /**
   * Reject an enrollment
   */
  async rejectEnrollment(
    enrollmentId: string,
    schoolId: string,
    reason: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            studentProfile: {
              include: {
                parents: {
                  include: {
                    parent: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.schoolId !== schoolId) {
      throw new BadRequestException(
        'Enrollment does not belong to this school',
      );
    }

    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.REJECTED,
        rejectionReason: reason,
      },
    });

    // Send notification to student
    await this.notificationService.notifyEnrollmentRejection(
      schoolId,
      enrollment.studentId,
      enrollment.student.name || 'Student',
      reason,
    );

    // Send notification to parents
    if (enrollment.student.studentProfile?.parents) {
      for (const parentRelation of enrollment.student.studentProfile.parents) {
        if (parentRelation.parent.user) {
          await this.notificationService.notifyEnrollmentRejection(
            schoolId,
            parentRelation.parent.user.id,
            enrollment.student.name || 'Student',
            reason,
          );
        }
      }
    }

    return updatedEnrollment;
  }
}
