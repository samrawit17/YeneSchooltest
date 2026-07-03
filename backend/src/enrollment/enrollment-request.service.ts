import { HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { PrismaService } from '../prisma/prisma.service';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
import { EventBusService } from '../core/events/event-bus.service';
import { CredentialService } from '../credential/credential.service';
import { EnrollmentRequestStatus } from '@prisma/client';
import { Role } from '../auth/types/role.enum';
import * as crypto from 'crypto';

export interface CreateEnrollmentRequestDto {
  schoolId: string;
  academicYearId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  faydaNumber: string;
  nationality?: string;
  email?: string;
  phone?: string;
  address?: string;
  previousSchool?: string;
  previousGrade?: number;
  transferCertificate?: boolean;
  parentFirstName: string;
  parentLastName: string;
  parentPhone: string;
  parentEmail?: string;
  parentRelation: string;
  requestedGrade: number;
  requestedStream?: string;
  documents?: Record<string, boolean>;
}

export interface EnrollmentQueryDto {
  schoolId: string;
  academicYearId?: string;
  status?: string;
  grade?: number;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class EnrollmentRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schoolSettings: SchoolSettingsService,
    private readonly eventBus: EventBusService,
    private readonly credentialService: CredentialService,
  ) {}

  async getPublicSchools() {
    const schools = await this.prisma.school.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        publicUrlSlug: true,
        logoUrl: true,
        schoolSettings: {
          where: {
            key: { in: ['theme_color', 'login_image_url', 'SCHOOL_STARTS_AT', 'REGISTRATION_STARTS_AT', 'MAINTENANCE_MODE'] },
          },
          select: {
            key: true,
            value: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return schools.map((school) => ({
      id: school.id,
      name: school.name,
      code: school.code,
      publicUrlSlug: school.publicUrlSlug,
      logoUrl: school.logoUrl,
      accentColor:
        school.schoolSettings.find((setting) => setting.key === 'theme_color')
          ?.value || null,
      loginImageUrl:
        school.schoolSettings.find(
          (setting) => setting.key === 'login_image_url',
        )?.value || null,
      schoolStartsAt:
        school.schoolSettings.find(
          (setting) => setting.key === 'SCHOOL_STARTS_AT',
        )?.value || null,
      registrationStartsAt:
        school.schoolSettings.find(
          (setting) => setting.key === 'REGISTRATION_STARTS_AT',
        )?.value || null,
      isMaintenance:
        school.schoolSettings.find((setting) => setting.key === 'MAINTENANCE_MODE')
          ?.value === 'true',
    }));
  }

  async getPublicSchoolById(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        publicUrlSlug: true,
        logoUrl: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        schoolSettings: {
          where: { key: { in: ['theme_color', 'login_image_url', 'SCHOOL_STARTS_AT', 'REGISTRATION_STARTS_AT', 'MAINTENANCE_MODE'] } },
          select: { key: true, value: true },
        },
      },
    });
    if (!school) return null;
    return {
      id: school.id,
      name: school.name,
      code: school.code,
      publicUrlSlug: school.publicUrlSlug,
      logoUrl: school.logoUrl,
      email: school.email,
      phone: school.phone,
      address: school.address,
      isActive: school.isActive,
      accentColor:
        school.schoolSettings.find((setting) => setting.key === 'theme_color')
          ?.value || null,
      loginImageUrl:
        school.schoolSettings.find(
          (setting) => setting.key === 'login_image_url',
        )?.value || null,
      schoolStartsAt:
        school.schoolSettings.find(
          (setting) => setting.key === 'SCHOOL_STARTS_AT',
        )?.value || null,
      registrationStartsAt:
        school.schoolSettings.find(
          (setting) => setting.key === 'REGISTRATION_STARTS_AT',
        )?.value || null,
      isMaintenance:
        school.schoolSettings.find((setting) => setting.key === 'MAINTENANCE_MODE')
          ?.value === 'true',
    };
  }

  async getPublicSchoolByUrlSlug(publicUrlSlug: string) {
    const school = await this.prisma.school.findUnique({
      where: { publicUrlSlug },
      select: {
        id: true,
        name: true,
        code: true,
        publicUrlSlug: true,
        logoUrl: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        schoolSettings: {
          where: { key: { in: ['theme_color', 'login_image_url', 'SCHOOL_STARTS_AT', 'REGISTRATION_STARTS_AT', 'MAINTENANCE_MODE'] } },
          select: { key: true, value: true },
        },
      },
    });
    if (!school) return null;
    return {
      id: school.id,
      name: school.name,
      code: school.code,
      publicUrlSlug: school.publicUrlSlug,
      logoUrl: school.logoUrl,
      email: school.email,
      phone: school.phone,
      address: school.address,
      isActive: school.isActive,
      accentColor:
        school.schoolSettings.find((setting) => setting.key === 'theme_color')
          ?.value || null,
      loginImageUrl:
        school.schoolSettings.find(
          (setting) => setting.key === 'login_image_url',
        )?.value || null,
      schoolStartsAt:
        school.schoolSettings.find(
          (setting) => setting.key === 'SCHOOL_STARTS_AT',
        )?.value || null,
      registrationStartsAt:
        school.schoolSettings.find(
          (setting) => setting.key === 'REGISTRATION_STARTS_AT',
        )?.value || null,
      isMaintenance:
        school.schoolSettings.find((setting) => setting.key === 'MAINTENANCE_MODE')
          ?.value === 'true',
    };
  }

  async getAvailableGrades(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });
    if (!school) throw new LocalizedException('enrollment.school_not_found_c75997d5', undefined, HttpStatus.NOT_FOUND, 'School not found');

    const gradeLevels =
      await this.schoolSettings.getGradeLevelsForSchool(schoolId);

    return gradeLevels
      .filter((gradeLevel) => gradeLevel.level >= 1)
      .map((gradeLevel) => ({ grade: gradeLevel.level }));
  }

  private async assertRequestedGradeAllowed(schoolId: string, grade: number) {
    const availableGrades = await this.getAvailableGrades(schoolId);
    if (!availableGrades.some((available) => available.grade === grade)) {
      throw new BadRequestException(
        `Grade ${grade} is not available for this school's grade system`,
      );
    }
  }

  /**
   * Calculate roll number based on alphabetical order
   * Gets the highest roll number in the section and adds 1
   */
  private async calculateRollNumber(sectionId: string): Promise<number> {
    const highestRoll = await this.prisma.studentClass.findFirst({
      where: { sectionId },
      orderBy: { student: { studentProfile: { rollNumber: 'desc' } } },
      include: {
        student: {
          include: { studentProfile: true },
        },
      },
    });

    if (!highestRoll || !highestRoll.student.studentProfile?.rollNumber) {
      return 1;
    }

    const currentMax =
      parseInt(highestRoll.student.studentProfile.rollNumber) || 0;
    return currentMax + 1;
  }

  /**
   * Generate a unique student username
   * Format: SCHOOLCODE-YEAR-SEQUENCE (e.g., SCH-2026-0001)
   */
  private async generateStudentUsername(
    schoolId: string,
    academicYearId: string,
  ): Promise<string> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    const schoolCode = school?.code?.toUpperCase() || 'STU';
    const yearPart =
      academicYear?.name?.replace(/[^0-9]/g, '').slice(-4) ||
      String(new Date().getFullYear());

    // Count existing students for this school and academic year
    const count = await this.prisma.studentProfile.count({
      where: {
        schoolId,
        academicYear: academicYear?.name,
      },
    });

    const sequence = String(count + 1).padStart(4, '0');

    return `${schoolCode}-${yearPart}-${sequence}`;
  }

  /**
   * Get the next available section based on capacity
   * Prefers the requested section if specified and has capacity
   */
  private async findBestSection(
    classId: string,
    requestedSection?: string,
  ): Promise<{ id: string; name: string } | null> {
    // Get all sections for this class with student count
    const sections = await this.prisma.section.findMany({
      where: { classId },
      include: {
        _count: { select: { studentClasses: true } },
      },
    });

    if (sections.length === 0) {
      return null;
    }

    // If requested section is specified, try to use it first
    if (requestedSection) {
      const requested = sections.find(
        (s) =>
          s.name === requestedSection && s._count.studentClasses < s.capacity,
      );
      if (requested) {
        return { id: requested.id, name: requested.name };
      }
    }

    // Find section with lowest enrollment (load balancing)
    const available = sections.filter(
      (s) => s._count.studentClasses < s.capacity,
    );

    if (available.length === 0) {
      return null; // All sections are full
    }

    // Sort by current enrollment (ascending) for balanced distribution
    available.sort((a, b) => a._count.studentClasses - b._count.studentClasses);

    return { id: available[0].id, name: available[0].name };
  }

  private normalizeStudentStream(
    stream?: string | null,
    grade?: number | null,
  ) {
    if (!grade || ![11, 12].includes(grade)) {
      return null;
    }
    const normalized = String(stream || '')
      .trim()
      .toUpperCase();
    if (!normalized) {
      return null;
    }
    if (!['SOCIAL', 'NATURAL'].includes(normalized)) {
      throw new BadRequestException(
        'Student stream must be SOCIAL or NATURAL for Grade 11 and 12',
      );
    }
    return normalized;
  }

  /**
   * Create a new enrollment request
   */
  async createEnrollmentRequest(dto: CreateEnrollmentRequestDto) {
    // Verify school exists and self-enrollment is enabled
    const schoolData = await this.prisma.school.findUnique({
      where: { id: dto.schoolId },
    });
    if (!schoolData) throw new LocalizedException('enrollment.school_not_found_c75997d5', undefined, HttpStatus.NOT_FOUND, 'School not found');
    if (!schoolData.isActive) throw new LocalizedException('enrollment.school_is_not_active_046ac9f6', undefined, undefined, 'School is not active');

    // Check if enrollment is open
    const enrollmentOpen = await this.schoolSettings.getSetting(
      dto.schoolId,
      'SELF_ENROLLMENT_ACTIVE',
    );
    const isOpen = enrollmentOpen === true || enrollmentOpen === 'true';
    if (!isOpen) throw new LocalizedException('enrollment.online_enrollment_is_currently_closed_6d41f9a8', undefined, undefined, 'Online enrollment is currently closed');

    await this.assertRequestedGradeAllowed(dto.schoolId, dto.requestedGrade);

    const faydaNumber = String(dto.faydaNumber || '').replace(/\D/g, '');
    if (!/^\d{12}$/.test(faydaNumber)) throw new LocalizedException('enrollment.fayda_number_fan_d385448e', undefined, undefined, '\'Fayda Number (FAN');

    const existingStudentFayda = await this.prisma.studentProfile.findFirst({
      where: { schoolId: dto.schoolId, faydaNumber },
      select: { id: true },
    });
    if (existingStudentFayda) throw new LocalizedException('enrollment.fayda_number_fan_d385448e', undefined, undefined, '\'Fayda Number (FAN');

    const existingEnrollmentFayda =
      await this.prisma.enrollmentRequest.findFirst({
        where: {
          schoolId: dto.schoolId,
          faydaNumber,
          status: {
            in: [
              EnrollmentRequestStatus.PENDING,
              EnrollmentRequestStatus.WAITLISTED,
            ],
          },
        },
        select: { id: true },
      });
    if (existingEnrollmentFayda) {
      throw new BadRequestException(
        'An active enrollment request already uses this Fayda Number (FAN)',
      );
    }
    const requestedStream = this.normalizeStudentStream(
      dto.requestedStream,
      dto.requestedGrade,
    );
    if (
      (dto.requestedGrade === 11 || dto.requestedGrade === 12) &&
      !requestedStream
    ) {
      throw new BadRequestException(
        'Grade 11 and 12 enrollment requires SOCIAL or NATURAL stream',
      );
    }

    // Check for duplicate email
    if (dto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email, schoolId: dto.schoolId },
      });
      if (existingUser) throw new LocalizedException('enrollment.a_user_with_this_email_already_exists_daaa1c70', undefined, undefined, 'A user with this email already exists');
    }

    // Check for duplicate parent phone
    const existingParent = await this.prisma.user.findFirst({
      where: { phone: dto.parentPhone, schoolId: dto.schoolId },
    });
    if (existingParent) {
      throw new BadRequestException(
        'A parent with this phone number already exists',
      );
    }

    // Verify academic year exists
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!academicYear) throw new LocalizedException('enrollment.academic_year_not_found_561c725b', undefined, HttpStatus.NOT_FOUND, 'Academic year not found');
    if (academicYear.schoolId !== dto.schoolId) {
      throw new BadRequestException(
        'Academic year does not belong to the selected school',
      );
    }

    // Count existing enrollments for this school and academic year to generate sequence
    const enrollmentCount = await this.prisma.enrollmentRequest.count({
      where: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
      },
    });

    // Generate reference number: SCHOOLCODE-YEAR{SEQUENCE}
    // e.g., ABC-2026001 (school code + 4-digit year + 3-digit sequence)
    const schoolCode = schoolData?.code?.toUpperCase() || 'SCH';
    const yearPart =
      academicYear.name.replace(/[^0-9]/g, '').slice(-4) ||
      new Date().getFullYear();
    const sequence = String(enrollmentCount + 1).padStart(4, '0');
    const referenceNumber = `${schoolCode}-${yearPart}${sequence}`;

    // Create enrollment request (class allocation happens during approval)
    const enrollment = await this.prisma.enrollmentRequest.create({
      data: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        status: EnrollmentRequestStatus.PENDING,
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        faydaNumber,
        nationality: dto.nationality,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        previousSchool: dto.previousSchool,
        previousGrade: dto.previousGrade,
        transferCertificate: dto.transferCertificate,
        parentFirstName: dto.parentFirstName,
        parentLastName: dto.parentLastName,
        parentPhone: dto.parentPhone,
        parentEmail: dto.parentEmail,
        parentRelation: dto.parentRelation,
        requestedGrade: dto.requestedGrade,
        requestedStream,
        documents: dto.documents ? JSON.stringify(dto.documents) : null,
      },
    });

    void this.eventBus.emit('enrollment.created', {
      schoolId: dto.schoolId,
      studentId: `${enrollment.firstName} ${enrollment.lastName}`,
      gradeId: String(enrollment.requestedGrade),
    });

    return { ...enrollment, referenceNumber };
  }

  /**
   * List enrollment requests with filters
   */
  async listEnrollmentRequests(query: EnrollmentQueryDto) {
    const {
      schoolId,
      academicYearId,
      status,
      grade,
      search,
      page = 1,
      limit = 20,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (academicYearId) where.academicYearId = academicYearId;
    if (status) where.status = status;
    if (grade) where.requestedGrade = grade;

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { parentPhone: { contains: search, mode: 'insensitive' } },
        { parentFirstName: { contains: search, mode: 'insensitive' } },
        { parentLastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, requests] = await this.prisma.$transaction([
      this.prisma.enrollmentRequest.count({ where }),
      this.prisma.enrollmentRequest.findMany({
        where,
        include: {
          academicYear: { select: { id: true, name: true } },
          allocatedClass: { select: { id: true, name: true } },
          allocatedSection: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      data: requests,
    };
  }

  /**
   * Get single enrollment request
   */
  async getEnrollmentRequest(id: string, schoolId: string) {
    const enrollment = await this.prisma.enrollmentRequest.findFirst({
      where: { id, schoolId },
      include: {
        academicYear: { select: { id: true, name: true } },
        allocatedClass: { select: { id: true, name: true, section: true } },
        allocatedSection: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
    });

    if (!enrollment) throw new LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, HttpStatus.NOT_FOUND, 'Enrollment request not found');

    return enrollment;
  }

  /**
   * Approve enrollment and auto-allocate student
   */
  async approveEnrollment(id: string, schoolId: string, approvedBy: string) {
    const enrollment = await this.prisma.enrollmentRequest.findFirst({
      where: { id, schoolId },
    });

    if (!enrollment) throw new LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, HttpStatus.NOT_FOUND, 'Enrollment request not found');

    const approvableStatuses: EnrollmentRequestStatus[] = [
      EnrollmentRequestStatus.PENDING,
      EnrollmentRequestStatus.WAITLISTED,
    ];
    if (!approvableStatuses.includes(enrollment.status)) {
      throw new BadRequestException(
        `Enrollment request cannot be approved from status: ${enrollment.status}`,
      );
    }

    // Validate required fields
    if (!enrollment.firstName || !enrollment.lastName) {
      throw new BadRequestException(
        'Invalid enrollment data: missing student name',
      );
    }

    const requestedStream = this.normalizeStudentStream(
      enrollment.requestedStream,
      enrollment.requestedGrade,
    );
    await this.assertRequestedGradeAllowed(schoolId, enrollment.requestedGrade);
    if (
      (enrollment.requestedGrade === 11 || enrollment.requestedGrade === 12) &&
      !requestedStream
    ) {
      throw new BadRequestException(
        'Grade 11 and 12 enrollment requires SOCIAL or NATURAL stream before approval',
      );
    }
    const className = `Grade ${enrollment.requestedGrade}`;

    // Get or create class for the requested grade and stream
    let classInfo = await this.prisma.class.findFirst({
      where: {
        schoolId,
        academicYearId: enrollment.academicYearId,
        name: className,
      },
    });

    if (!classInfo) {
      // Auto-create class for the grade
      classInfo = await this.prisma.class.create({
        data: {
          schoolId,
          academicYearId: enrollment.academicYearId,
          name: className,
          section: '', // Will be set per section
          grade: enrollment.requestedGrade,
        },
      });
    }

    const existingSections = await this.prisma.section.findMany({
      where: { classId: classInfo.id },
      include: {
        _count: { select: { studentClasses: true } },
      },
      orderBy: { name: 'asc' },
    });

    let section: any = existingSections.find(
      (s) =>
        (!s.stream || s.stream === requestedStream) &&
        s._count.studentClasses < s.capacity,
    );

    if (!section) {
      const nextSectionName = String.fromCharCode(65 + existingSections.length);
      section = await this.prisma.section.create({
        data: {
          classId: classInfo.id,
          name: nextSectionName,
          stream: requestedStream,
          capacity: 30,
        },
      });
    } else if (!section.stream) {
      section = await this.prisma.section.update({
        where: { id: section.id },
        data: { stream: requestedStream },
        include: {
          _count: { select: { studentClasses: true } },
        },
      });
    }

    const sectionName = section.name;

    const academicYearName =
      (
        await this.prisma.academicYear.findUnique({
          where: { id: enrollment.academicYearId },
          select: { name: true },
        })
      )?.name || '';

    // Calculate roll number
    const rollNumber = await this.calculateRollNumber(section.id);

    // Reuse partially-created student user/profile on retry after a failed approval.
    let studentUser = enrollment.userId
      ? await this.prisma.user.findUnique({ where: { id: enrollment.userId } })
      : null;

    if (!studentUser && enrollment.allocatedStudentCode) {
      studentUser = await this.prisma.user.findFirst({
        where: {
          username: enrollment.allocatedStudentCode,
          schoolId,
          role: Role.STUDENT,
        },
      });
    }

    if (!studentUser && enrollment.email) {
      studentUser = await this.prisma.user.findFirst({
        where: {
          email: enrollment.email,
          schoolId,
          role: Role.STUDENT,
        },
      });
    }

    let studentProfile = studentUser
      ? await this.prisma.studentProfile.findUnique({
          where: { userId: studentUser.id },
        })
      : null;

    const generatedCredentials =
      !studentUser && !studentProfile
        ? await this.credentialService.generateStudentCredentials(
            schoolId,
            academicYearName || enrollment.academicYearId,
          )
        : null;

    const studentCode =
      enrollment.allocatedStudentCode ||
      studentUser?.username ||
      studentProfile?.studentCode ||
      generatedCredentials?.username;

    if (!studentCode) throw new LocalizedException('enrollment.failed_to_generate_student_username_6f663242', undefined, undefined, 'Failed to generate student username');

    const studentEmail = enrollment.email || null;
    const studentPassword =
      generatedCredentials?.temporaryPassword ||
      crypto.randomBytes(8).toString('hex');
    const hashedStudentPassword =
      generatedCredentials?.hashedPassword ||
      studentUser?.password ||
      studentPassword;
    const isNewStudentUser = !studentUser;

    // Ethiopian naming: firstName + middleName (if exists) + lastName
    const studentFullName = enrollment.middleName
      ? `${enrollment.firstName} ${enrollment.middleName} ${enrollment.lastName}`
      : `${enrollment.firstName} ${enrollment.lastName}`;

    if (!studentUser) {
      studentUser = await this.prisma.user.create({
        data: {
          name: studentFullName,
          email: studentEmail,
          phone: enrollment.phone,
          username: studentCode,
          password: hashedStudentPassword,
          role: Role.STUDENT,
          schoolId,
          isActive: false,
          mustChangePassword: true,
        },
      });
    }

    if (!studentProfile) {
      studentProfile = await this.prisma.studentProfile.create({
        data: {
          userId: studentUser.id,
          schoolId,
          studentCode,
          studentId: studentCode,
          enrollmentStatus: 'APPROVED',
          academicYear: academicYearName,
          className: classInfo.name,
          stream: requestedStream,
          section: sectionName,
          rollNumber: String(rollNumber),
          gender: enrollment.gender,
          faydaNumber: enrollment.faydaNumber || undefined,
          address: enrollment.address,
          phone: enrollment.phone,
          nationality: enrollment.nationality,
        },
      });
    } else {
      studentProfile = await this.prisma.studentProfile.update({
        where: { id: studentProfile.id },
        data: {
          enrollmentStatus: 'APPROVED',
          academicYear: academicYearName,
          className: classInfo.name,
          stream: requestedStream,
          section: sectionName,
          rollNumber: String(rollNumber),
          gender: enrollment.gender,
          faydaNumber: enrollment.faydaNumber || undefined,
          address: enrollment.address,
          phone: enrollment.phone,
          nationality: enrollment.nationality,
        },
      });
    }

    const existingStudentClass = await this.prisma.studentClass.findFirst({
      where: {
        studentId: studentUser.id,
        academicYear: academicYearName,
      },
    });

    if (!existingStudentClass) {
      await this.prisma.studentClass.create({
        data: {
          studentId: studentUser.id,
          classId: classInfo.id,
          sectionId: section.id,
          schoolId,
          academicYear: academicYearName,
        },
      });
    } else {
      await this.prisma.studentClass.update({
        where: { id: existingStudentClass.id },
        data: {
          classId: classInfo.id,
          sectionId: section.id,
          schoolId,
          academicYear: academicYearName,
        },
      });
    }

    // Create parent account if needed
    // Ethiopian naming: parent firstName + student's lastName
    const parentName = `${enrollment.parentFirstName} ${enrollment.lastName}`;

    let parentUser = await this.prisma.user.findFirst({
      where: { phone: enrollment.parentPhone, schoolId },
    });

    let isNewParentUser = false;
    let parentCredentials: Awaited<
      ReturnType<typeof this.credentialService.generateStaffCredentials>
    > | null = null;

    if (!parentUser) {
      isNewParentUser = true;
      parentCredentials = await this.credentialService.generateStaffCredentials(
        schoolId,
        Role.PARENT,
        academicYearName,
      );

      parentUser = await this.prisma.user.create({
        data: {
          name: parentName,
          email: enrollment.parentEmail || null,
          phone: enrollment.parentPhone,
          username: parentCredentials.username,
          password: parentCredentials.hashedPassword,
          role: Role.PARENT,
          schoolId,
          isActive: false,
          mustChangePassword: true,
        },
      });

      await this.prisma.parentProfile.create({
        data: {
          userId: parentUser.id,
          schoolId,
          phone: enrollment.parentPhone,
        },
      });
    }

    // Link parent to student
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId: parentUser.id },
    });

    if (parentProfile) {
      const existingLink = await this.prisma.parentStudent.findFirst({
        where: {
          parentId: parentProfile.id,
          studentId: studentProfile.id,
          schoolId,
        },
      });

      if (!existingLink) {
        await this.prisma.parentStudent.create({
          data: {
            parentId: parentProfile.id,
            studentId: studentProfile.id,
            schoolId,
            relation: enrollment.parentRelation,
            isPrimary: true,
          },
        });
      }
    }

    // Update enrollment request
    const updated = await this.prisma.enrollmentRequest.update({
      where: { id },
      data: {
        status: EnrollmentRequestStatus.APPROVED,
        approvedBy,
        approvedAt: new Date(),
        allocatedClassId: classInfo.id,
        allocatedSectionId: section.id,
        allocatedRollNumber: rollNumber,
        allocatedStudentCode: studentCode,
        userId: studentUser.id,
      },
    });

    // Store student credentials for admin reference
    if (isNewStudentUser) {
      await this.credentialService.createPendingCredential({
        schoolId,
        userId: studentUser.id,
        name: studentFullName,
        email: enrollment.email || null,
        username: studentCode,
        temporaryPassword: studentPassword,
        role: 'STUDENT',
      });
    }

    // Store parent credentials for admin reference
    if (isNewParentUser && parentCredentials) {
      await this.credentialService.createPendingCredential({
        schoolId,
        userId: parentUser.id,
        name: parentName,
        email: enrollment.parentEmail || null,
        username: parentCredentials.username,
        temporaryPassword: parentCredentials.temporaryPassword,
        role: 'PARENT',
      });
    }

    // Return credentials for sending
    return {
      enrollment: updated,
      credentials: {
        student: {
          userId: studentUser.id,
          username: studentCode,
          password: isNewStudentUser ? studentPassword : 'Existing account',
          studentCode,
          class: classInfo.name,
          section: sectionName,
          rollNumber,
        },
        parent: {
          userId: parentUser.id,
          username: parentUser.username || parentCredentials?.username,
          password: isNewParentUser
            ? parentCredentials?.temporaryPassword || ''
            : 'Existing account',
          phone: enrollment.parentPhone,
        },
      },
    };
  }

  /**
   * Reject enrollment request
   */
  async rejectEnrollment(id: string, schoolId: string, reason: string) {
    const enrollment = await this.prisma.enrollmentRequest.findFirst({
      where: { id, schoolId },
    });

    if (!enrollment) throw new LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, HttpStatus.NOT_FOUND, 'Enrollment request not found');

    const rejectableStatuses: EnrollmentRequestStatus[] = [
      EnrollmentRequestStatus.PENDING,
      EnrollmentRequestStatus.WAITLISTED,
    ];
    if (!rejectableStatuses.includes(enrollment.status)) {
      throw new BadRequestException(
        `Enrollment request cannot be rejected from status: ${enrollment.status}`,
      );
    }

    return this.prisma.enrollmentRequest.update({
      where: { id },
      data: {
        status: EnrollmentRequestStatus.REJECTED,
        rejectionReason: reason,
      },
    });
  }

  /**
   * Waitlist enrollment request
   */
  async waitlistEnrollment(id: string, schoolId: string) {
    const enrollment = await this.prisma.enrollmentRequest.findFirst({
      where: { id, schoolId },
    });

    if (!enrollment) throw new LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, HttpStatus.NOT_FOUND, 'Enrollment request not found');

    if (enrollment.status !== EnrollmentRequestStatus.PENDING) throw new LocalizedException('enrollment.enrollment_request_is_not_pending_19200b3a', undefined, undefined, 'Enrollment request is not pending');

    return this.prisma.enrollmentRequest.update({
      where: { id },
      data: {
        status: EnrollmentRequestStatus.WAITLISTED,
      },
    });
  }

  /**
   * Cancel enrollment request
   */
  async cancelEnrollment(id: string, schoolId: string) {
    const enrollment = await this.prisma.enrollmentRequest.findFirst({
      where: { id, schoolId },
    });

    if (!enrollment) throw new LocalizedException('enrollment.enrollment_request_not_found_e12aca15', undefined, HttpStatus.NOT_FOUND, 'Enrollment request not found');

    if (enrollment.status === EnrollmentRequestStatus.APPROVED) throw new LocalizedException('enrollment.cannot_cancel_an_approved_enrollment_71c5999b', undefined, undefined, 'Cannot cancel an approved enrollment');

    return this.prisma.enrollmentRequest.update({
      where: { id },
      data: {
        status: EnrollmentRequestStatus.CANCELLED,
      },
    });
  }

  /**
   * Get enrollment statistics
   */
  async getEnrollmentStats(schoolId: string, academicYearId?: string) {
    const where: any = { schoolId };
    if (academicYearId) where.academicYearId = academicYearId;

    const [total, pending, approved, rejected, waitlisted] = await Promise.all([
      this.prisma.enrollmentRequest.count({ where }),
      this.prisma.enrollmentRequest.count({
        where: { ...where, status: EnrollmentRequestStatus.PENDING },
      }),
      this.prisma.enrollmentRequest.count({
        where: { ...where, status: EnrollmentRequestStatus.APPROVED },
      }),
      this.prisma.enrollmentRequest.count({
        where: { ...where, status: EnrollmentRequestStatus.REJECTED },
      }),
      this.prisma.enrollmentRequest.count({
        where: { ...where, status: EnrollmentRequestStatus.WAITLISTED },
      }),
    ]);

    // Count by grade
    const byGrade = await this.prisma.enrollmentRequest.groupBy({
      by: ['requestedGrade'],
      where,
      _count: { id: true },
    });

    return {
      total,
      pending,
      approved,
      rejected,
      waitlisted,
      byGrade: byGrade.map((g) => ({
        grade: g.requestedGrade,
        count: g._count.id,
      })),
    };
  }

  /**
   * Check enrollment capacity for a grade
   */
  async checkGradeCapacity(schoolId: string, grade: number) {
    const classInfo = await this.prisma.class.findFirst({
      where: {
        schoolId,
        name: `Grade ${grade}`,
      },
      include: {
        sections: {
          include: {
            _count: { select: { studentClasses: true } },
          },
        },
      },
    });

    if (!classInfo) {
      return { exists: false, message: `No class found for Grade ${grade}` };
    }

    const sections = classInfo.sections.map((s) => ({
      name: s.name,
      capacity: s.capacity,
      enrolled: s._count.studentClasses,
      available: s.capacity - s._count.studentClasses,
    }));

    const totalCapacity = sections.reduce((sum, s) => sum + s.capacity, 0);
    const totalEnrolled = sections.reduce((sum, s) => sum + s.enrolled, 0);

    return {
      exists: true,
      grade: classInfo.name,
      totalCapacity,
      totalEnrolled,
      totalAvailable: totalCapacity - totalEnrolled,
      isFull: totalEnrolled >= totalCapacity,
      sections,
    };
  }

  /**
   * Get enrollment status for a school
   */
  async getEnrollmentStatus(schoolId: string) {
    const enrollmentOpen = await this.schoolSettings.getSetting(
      schoolId,
      'SELF_ENROLLMENT_ACTIVE',
    );
    const isOpen = enrollmentOpen === true || enrollmentOpen === 'true';

    // Get active academic year
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
    });

    return {
      isOpen,
      academicYearId: academicYear?.id || null,
      academicYearName: academicYear?.name || null,
      message: isOpen
        ? 'Enrollment is currently open'
        : 'Online enrollment is currently closed. Please contact the school for more information.',
    };
  }
}
