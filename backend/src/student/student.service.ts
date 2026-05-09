import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialService } from '../credential/credential.service';
import { Role, EnrollmentStatus } from '@prisma/client';
import { ClassService } from '../class/class.service';
import { CacheService } from '../infrastructure/cache/cache.service';

export interface CreateStudentDto {
  email?: string;
  name: string;
  schoolId: string;
  academicYear: string;
  grade: number; // Grade number (1-12)
  className?: string; // Class name (e.g., "Grade 5")
  section?: string; // Section (e.g., "A")
  rollNumber?: string; // Roll number
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
  photo?: string; // Base64 encoded photo
  documents?: {
    type: string;
    fileUrl: string;
    title?: string;
  }[];
}

export interface UpdateStudentDto {
  name?: string;
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
  photo?: string; // Base64 encoded photo
  documents?: {
    type: string;
    fileUrl: string;
    title?: string;
  }[];
}

export interface ApproveEnrollmentDto {
  className: string;
  section: string;
  rollNumber: string;
}

export interface AssignClassDto {
  className: string;
  section: string;
  rollNumber: string;
}

export interface StudentsByClassResult {
  class: {
    id: string;
    name: string;
    grade: number;
    section: string;
  };
  students: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    gender?: string;
    avatarUrl?: string;
    studentCode?: string;
    rollNumber?: string;
    section?: any;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class StudentService {
  constructor(
    private prismaService: PrismaService,
    private credentialService: CredentialService,
    private classService: ClassService, // Fixed param order
    private cacheService: CacheService,
  ) {}

  private getStudentListNamespace(schoolId: string) {
    return `students:school:${schoolId}`;
  }

  private async invalidateStudentCaches(
    schoolId: string,
    studentUserIds: string[] = [],
  ) {
    await this.cacheService.bumpVersion(this.getStudentListNamespace(schoolId));
    await this.cacheService.bumpVersion(`dashboard:school:${schoolId}`);

    for (const studentUserId of studentUserIds) {
      await this.cacheService.bumpVersion(`dashboard:user:${studentUserId}`);
      await this.cacheService.bumpVersion(`grades:student:${studentUserId}`);
    }
  }

  async getMyClassAssignment(studentUserId: string, schoolId: string) {
    const activeAcademicYear = await this.prismaService.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true, name: true },
    });

    const include = {
      class: {
        select: {
          id: true,
          name: true,
          section: true,
          grade: true,
        },
      },
      section: {
        select: {
          id: true,
          name: true,
        },
      },
    } as const;

    const findLatestAssignment = async (where: Record<string, any>) =>
      this.prismaService.studentClass.findFirst({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
      });

    let assignment = await findLatestAssignment({
      studentId: studentUserId,
      schoolId,
      ...(activeAcademicYear ? { academicYear: activeAcademicYear.id } : {}),
    });

    if (!assignment) {
      assignment = await findLatestAssignment({
        studentId: studentUserId,
        schoolId,
      });
    }

    if (!assignment) {
      return {
        assigned: false,
        classId: null,
        sectionId: null,
        className: null,
        section: null,
        academicYearId: activeAcademicYear?.id || null,
        academicYearName: activeAcademicYear?.name || null,
      };
    }

    return {
      assigned: true,
      classId: assignment.classId,
      sectionId: assignment.sectionId,
      className: assignment.class?.name || null,
      section: assignment.section?.name || null,
      grade: assignment.class?.grade ?? null,
      academicYearId: assignment.academicYear || activeAcademicYear?.id || null,
      academicYearName: activeAcademicYear?.name || null,
    };
  }

  async createStudent(createStudentDto: CreateStudentDto, createdById: string) {
    const {
      email,
      name,
      schoolId,
      academicYear,
      grade,
      className,
      section,
      rollNumber,
      gender,
      address,
      phone,
      emergencyContact,
      guardianName,
      guardianPhone,
      guardianEmail,
      photo,
      documents,
    } = createStudentDto;

    // Check if school exists
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Check if email already exists
    if (email) {
      const existingUser = await this.prismaService.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }
    }

    // Generate professional credentials using CredentialService
    const credentials = await this.credentialService.generateStudentCredentials(
      schoolId,
      academicYear,
    );

    // Create user with generated credentials
    const user = await this.prismaService.user.create({
      data: {
        email: email || null,
        name,
        username: credentials.username,
        password: credentials.hashedPassword,
        role: Role.STUDENT,
        schoolId,
        avatarUrl: photo || undefined,
        mustChangePassword: true, // Force password change on first login
      },
    });

    // Create student profile
    const studentProfile = await this.prismaService.studentProfile.create({
      data: {
        userId: user.id,
        schoolId,
        studentCode: credentials.username,
        studentId: credentials.username, // Using same as username/admission number
        enrollmentStatus: EnrollmentStatus.APPROVED, // Admin-created students are automatically approved
        academicYear,
        className,
        section,
        rollNumber,
        gender,
        address,
        phone,
        emergencyContact: emergencyContact
          ? JSON.stringify(emergencyContact)
          : undefined,
        documents: documents ? JSON.stringify(documents) : undefined,
      },
    });

    // Create enrollment
    const enrollment = await this.prismaService.enrollment.create({
      data: {
        studentId: user.id,
        schoolId,
        status: EnrollmentStatus.APPROVED, // Admin-created students are automatically approved
        academicYear,
        grade,
      },
    });

    await this.invalidateStudentCaches(schoolId, [user.id]);

    return {
      user,
      studentProfile,
      enrollment,
      username: credentials.username,
      temporaryPassword: credentials.temporaryPassword, // Return temp password for admin to share (shown only once)
    };
  }

  async getStudents(
    schoolId: string,
    filters?: { status?: EnrollmentStatus; grade?: number; section?: string },
    pagination?: { page: number; limit: number },
    requesterId?: string,
    requesterRole?: string,
    search?: string,
    rollNumber?: string,
  ) {
    const where: any = { schoolId };

    // If requester is a teacher, filter by their assigned classes (both homeroom and subject classes)
    if (requesterRole === 'TEACHER' && requesterId) {
      // Find all classes where the user is the homeroom teacher
      const homeroomClasses = await this.prismaService.class.findMany({
        where: {
          schoolId,
          homeroomTeacherId: requesterId,
        },
        select: { id: true, name: true, section: true },
      });

      const homeroomClassIds = homeroomClasses.map((c) => c.id);

      // Find all classes where the teacher teaches subjects
      const teacherClassSubjects =
        await this.prismaService.classSubject.findMany({
          where: {
            teacherId: requesterId,
          },
          select: { classId: true },
        });

      const subjectClassIds = teacherClassSubjects.map((cs) => cs.classId);

      // Combine all class IDs
      const allClassIds = [
        ...new Set([...homeroomClassIds, ...subjectClassIds]),
      ];

      // Get student IDs from multiple sources
      let studentIdsFromClasses: string[] = [];

      // 1. Get students from StudentClass table
      if (allClassIds.length > 0) {
        const studentClasses = await this.prismaService.studentClass.findMany({
          where: {
            classId: { in: allClassIds },
            schoolId,
          },
          select: { studentId: true },
        });
        studentIdsFromClasses = studentClasses.map((sc) => sc.studentId);
      }

      // 2. Also get students from StudentProfile by className and section (for homeroom classes)
      // This handles cases where students are not yet assigned via StudentClass
      for (const homeroomClass of homeroomClasses) {
        // Try different class name formats (e.g., "Grade 1" or "1")
        const classNameVariants = [
          homeroomClass.name,
          homeroomClass.name.replace('Grade ', ''),
          `Grade ${homeroomClass.name.replace('Grade ', '')}`,
        ];

        const studentsByProfile =
          await this.prismaService.studentProfile.findMany({
            where: {
              schoolId,
              OR: classNameVariants.map((name) => ({
                className: name,
                section: homeroomClass.section,
              })),
            },
            select: { userId: true },
          });
        studentIdsFromClasses = [
          ...studentIdsFromClasses,
          ...studentsByProfile.map((s) => s.userId),
        ];
      }

      // Remove duplicates
      studentIdsFromClasses = [...new Set(studentIdsFromClasses)];

      if (studentIdsFromClasses.length > 0) {
        // Filter by student IDs from teacher's classes
        where.userId = { in: studentIdsFromClasses };

        // Teachers can search by name or rollNumber within their classes
        if (search || rollNumber) {
          const conditions: any[] = [];
          if (search) {
            conditions.push({
              user: {
                name: { contains: search, mode: 'insensitive' },
              },
            });
          }
          if (rollNumber) {
            conditions.push({
              rollNumber: { contains: rollNumber, mode: 'insensitive' },
            });
          }
          if (conditions.length > 0) {
            where.OR = conditions;
          }
        }
      } else {
        // Teacher has no assigned classes with students, return empty
        return {
          data: [],
          total: 0,
          page: pagination?.page || 1,
          limit: pagination?.limit || 10,
          totalPages: 0,
        };
      }
    }

    if (filters?.status) {
      where.enrollmentStatus = filters.status;
    }
    if (filters?.grade) {
      // Filter by className which contains the grade (e.g., "Grade 10")
      where.className = { contains: `Grade ${filters.grade}` };
    }
    if (filters?.section) {
      where.section = filters.section;
    }

    // Apply search filter for all users (not just teachers)
    // Search by: studentCode, rollNumber, user.name, user.email
    // Note: SQLite is case-insensitive by default for text search
    if (search || rollNumber) {
      const conditions: any[] = [];

      if (search) {
        // Search in studentCode
        conditions.push({
          studentCode: { contains: search, mode: 'insensitive' },
        });
        // Search in rollNumber
        conditions.push({
          rollNumber: { contains: search, mode: 'insensitive' },
        });
        // Search in user name (requires relation)
        conditions.push({
          user: {
            name: { contains: search, mode: 'insensitive' },
          },
        });
        // Search in user email
        conditions.push({
          user: {
            email: { contains: search, mode: 'insensitive' },
          },
        });
      }

      if (rollNumber) {
        conditions.push({
          rollNumber: { contains: rollNumber },
        });
      }

      if (conditions.length > 0) {
        where.OR = conditions;
      }
    }

    const skip = pagination ? (pagination.page - 1) * pagination.limit : 0;
    const take = pagination?.limit || 20;
    return this.cacheService.getOrSetVersioned(
      this.getStudentListNamespace(schoolId),
      JSON.stringify({
        filters,
        pagination,
        requesterId,
        requesterRole,
        search,
        rollNumber,
        where,
      }),
      120,
      async () => {
        const studentProfiles =
          await this.prismaService.studentProfile.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  isActive: true,
                },
              },
              parents: {
                include: {
                  parent: {
                    include: {
                      user: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
          });

        const enrollments = await this.prismaService.enrollment.findMany({
          where: {
            studentId: { in: studentProfiles.map((sp) => sp.userId) },
          },
        });

        const total = await this.prismaService.studentProfile.count({ where });

        const data = studentProfiles.map((profile) => {
          let gradeNum: number | undefined = undefined;
          if (profile.className) {
            const gradeMatch = profile.className.match(/Grade\s*(\d+)/i);
            gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : undefined;
          }

          return {
            ...profile,
            grade: gradeNum,
            parentName: profile.parents?.[0]?.parent?.user?.name || null,
            enrollment: enrollments.find((e) => e.studentId === profile.userId),
          };
        });

        return {
          data,
          total,
          page: pagination?.page || 1,
          limit: take,
          totalPages: Math.ceil(total / take),
        };
      },
    );
  }

  async getStudentById(studentId: string, schoolId: string) {
    // Try to find by userId first, then by studentProfile id
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        OR: [{ userId: studentId }, { id: studentId }],
        schoolId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        parents: {
          include: {
            parent: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    lastLoginAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get enrollment separately
    const enrollment = await this.prismaService.enrollment.findFirst({
      where: {
        studentId,
        schoolId,
      },
    });

    // Get academic year name from student profile's academicYear field
    let academicYearName: string | null = null;
    if (student.academicYear) {
      const academicYear = await this.prismaService.academicYear.findFirst({
        where: { id: student.academicYear },
        select: { id: true, name: true },
      });
      academicYearName = academicYear?.name || null;
    }

    // Prefer the canonical StudentClass assignment, then fall back to profile text fields.
    const currentStudentClass = await this.prismaService.studentClass.findFirst({
      where: {
        studentId: student.userId,
        schoolId,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        class: {
          include: {
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        section: {
          include: {
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    let classWithTeacher: any = null;
    let sectionWithTeacher: any = null;

    if (currentStudentClass) {
      classWithTeacher = currentStudentClass.class;
      sectionWithTeacher = currentStudentClass.section;
    } else if (student.className && student.section) {
      const classNameVariants = [
        student.className,
        student.className.replace('Grade ', ''),
        `Grade ${student.className.replace('Grade ', '')}`,
      ];

      const classRecord = await this.prismaService.class.findFirst({
        where: {
          schoolId,
          section: student.section,
          OR: classNameVariants.map((name) => ({ name })),
        },
        include: {
          homeroomTeacher: {
            select: {
              id: true,
              name: true,
            },
          },
          sections: {
            where: { name: student.section },
            include: {
              homeroomTeacher: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: 1,
          },
        },
      });

      classWithTeacher = classRecord;
      sectionWithTeacher = classRecord?.sections?.[0] || null;
    }

    const homeroomTeacher =
      sectionWithTeacher?.homeroomTeacher || classWithTeacher?.homeroomTeacher || null;

    // Format parent info
    const parentInfo =
      student.parents?.map((p: any) => ({
        id: p.parent?.user?.id,
        name: p.parent?.user?.name,
        email: p.parent?.user?.email,
        phone: p.parent?.user?.phone,
        relation: p.relation,
        isPrimary: p.isPrimary,
        emergencyContact: p.emergencyContact,
        lastLogin: p.parent?.user?.lastLoginAt,
      })) || [];

    return {
      ...student,
      enrollment,
      enrollmentYear: enrollment?.academicYear || academicYearName || null,
      classTeacher: homeroomTeacher?.name || null,
      class: classWithTeacher
        ? {
            id: classWithTeacher.id,
            name: classWithTeacher.name,
            section: classWithTeacher.section,
            homeroomTeacher,
          }
        : null,
      lastLogin: student.user?.lastLoginAt || null,
      parents: parentInfo,
    };
  }

  /**
   * Get students formatted for ID card generation
   * Returns all data needed to render professional ID cards
   */
  async getStudentsForIdCards(
    schoolId: string,
    filters?: {
      grade?: string;
      section?: string;
      academicYear?: string;
      search?: string;
      studentIds?: string[];
    },
  ) {
    // Get school info for the card header
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        phone: true,
        address: true,
        logoUrl: true,
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Build the where clause for student profiles
    const where: any = {
      schoolId,
      enrollmentStatus: 'APPROVED',
    };

    if (filters?.grade) {
      // Support both "Grade 10" and "10" formats
      const gradeStr = filters.grade;
      where.OR = [
        { className: gradeStr },
        { className: `Grade ${gradeStr}` },
        { className: gradeStr.replace('Grade ', '') },
      ];
    }

    if (filters?.section) {
      where.section = filters.section;
    }

    if (filters?.academicYear) {
      where.academicYear = filters.academicYear;
    }

    if (filters?.studentIds && filters.studentIds.length > 0) {
      where.userId = { in: filters.studentIds };
    }

    // Fetch students with all related data
    const studentProfiles = await this.prismaService.studentProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            phone: true,
          },
        },
        parents: {
          include: {
            parent: {
              include: {
                user: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
          take: 1, // Primary parent for emergency contact
        },
      },
      orderBy: [
        { className: 'asc' },
        { section: 'asc' },
        { rollNumber: 'asc' },
      ],
      take: 500, // Limit for performance
    });

    // Get the active academic year name
    let academicYearName = '';
    if (filters?.academicYear) {
      const ay = await this.prismaService.academicYear.findFirst({
        where: { id: filters.academicYear, schoolId },
        select: { name: true },
      });
      academicYearName = ay?.name || filters.academicYear;
    } else {
      const activeAy = await this.prismaService.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { name: true },
      });
      academicYearName = activeAy?.name || '';
    }

    // Transform to ID card data format
    const students = studentProfiles.map((profile) => {
      // Extract grade number from className
      let gradeNum = 0;
      if (profile.className) {
        const match = profile.className.match(/(\d+)/);
        gradeNum = match ? parseInt(match[1]) : 0;
      }

      // Parse emergency contact
      let emergencyContact: any = null;
      if (profile.emergencyContact) {
        try {
          emergencyContact = JSON.parse(profile.emergencyContact);
        } catch {}
      }

      // Fall back to parent info for emergency contact
      if (!emergencyContact && profile.parents?.[0]) {
        const parentData = profile.parents[0];
        emergencyContact = {
          name: parentData.parent?.user?.name || 'N/A',
          phone: parentData.parent?.user?.phone || 'N/A',
          relation: parentData.relation || 'Parent',
        };
      }

      // Parse medical info for blood group
      let bloodGroup: string | undefined;
      if (profile.medicalInfo) {
        try {
          const medical = JSON.parse(profile.medicalInfo);
          bloodGroup = medical.bloodGroup || medical.blood_group;
        } catch {}
      }

      return {
        studentId: profile.userId,
        studentCode: profile.studentCode,
        name: profile.user?.name || 'Unknown',
        grade: gradeNum,
        section: profile.section || 'N/A',
        academicYear: profile.academicYear || academicYearName,
        dateOfBirth: null, // Not stored in current schema
        gender: profile.gender || undefined,
        bloodGroup,
        address: profile.address || undefined,
        phone: profile.user?.phone || profile.phone || undefined,
        email: profile.user?.email || undefined,
        photoUrl: profile.user?.avatarUrl || undefined,
        rollNumber: profile.rollNumber || undefined,
        emergencyContact,
      };
    });

    return {
      students,
      school: {
        name: school.name,
        code: school.code,
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || '',
        logo: school.logoUrl || undefined,
      },
      academicYear: academicYearName,
      total: students.length,
    };
  }

  async updateStudent(
    studentId: string,
    schoolId: string,
    updateStudentDto: UpdateStudentDto,
  ) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        userId: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const {
      name,
      gender,
      address,
      phone,
      emergencyContact,
      guardianName,
      guardianPhone,
      guardianEmail,
      photo,
      documents,
    } = updateStudentDto;

    // Update user if name or photo provided
    if (name || photo) {
      await this.prismaService.user.update({
        where: { id: studentId },
        data: {
          ...(name && { name }),
          ...(photo && { avatarUrl: photo }),
        },
      });
    }

    // Update student profile
    const updated = await this.prismaService.studentProfile.update({
      where: { userId: studentId },
      data: {
        ...(gender && { gender }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(emergencyContact && {
          emergencyContact: JSON.stringify(emergencyContact),
        }),
        ...(guardianName && { guardianName }),
        ...(guardianPhone && { guardianPhone }),
        ...(guardianEmail && { guardianEmail }),
        ...(documents && { documents: JSON.stringify(documents) }),
      },
    });
    await this.invalidateStudentCaches(schoolId, [studentId]);
    return updated;
  }

  async deleteStudent(studentId: string, schoolId: string) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        userId: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Delete enrollment records
    await this.prismaService.enrollment.deleteMany({
      where: {
        studentId,
        schoolId,
      },
    });

    // Delete student profile
    await this.prismaService.studentProfile.delete({
      where: { userId: studentId },
    });

    // Delete user account
    await this.prismaService.user.delete({
      where: { id: studentId },
    });

    await this.invalidateStudentCaches(schoolId, [studentId]);
    return { message: 'Student deleted successfully' };
  }

  async getPendingEnrollments(schoolId: string) {
    const enrollments = await this.prismaService.enrollment.findMany({
      where: {
        schoolId,
        status: EnrollmentStatus.PENDING,
      },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get student profiles separately
    const studentIds = enrollments.map((e) => e.studentId);
    const studentProfiles = await this.prismaService.studentProfile.findMany({
      where: {
        userId: { in: studentIds },
      },
    });

    // Combine the data
    return enrollments.map((enrollment) => ({
      ...enrollment,
      studentProfile: studentProfiles.find(
        (sp) => sp.userId === enrollment.studentId,
      ),
    }));
  }

  async approveEnrollment(
    enrollmentId: string,
    schoolId: string,
    approveData: ApproveEnrollmentDto,
  ) {
    const enrollment = await this.prismaService.enrollment.findFirst({
      where: {
        id: enrollmentId,
        schoolId,
      },
      include: {
        student: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new BadRequestException('Enrollment is not pending');
    }

    const { className, section, rollNumber } = approveData;

    // Update enrollment status
    await this.prismaService.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.APPROVED,
      },
    });

    // Update student profile
    await this.prismaService.studentProfile.update({
      where: { userId: enrollment.studentId },
      data: {
        enrollmentStatus: EnrollmentStatus.APPROVED,
        className,
        section,
        rollNumber,
      },
    });

    await this.invalidateStudentCaches(schoolId, [enrollment.studentId]);
    return { message: 'Enrollment approved successfully' };
  }

  async rejectEnrollment(
    enrollmentId: string,
    schoolId: string,
    rejectionReason: string,
  ) {
    const enrollment = await this.prismaService.enrollment.findFirst({
      where: {
        id: enrollmentId,
        schoolId,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new BadRequestException('Enrollment is not pending');
    }

    // Update enrollment status
    await this.prismaService.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.REJECTED,
        rejectionReason,
      },
    });

    // Update student profile
    await this.prismaService.studentProfile.update({
      where: { userId: enrollment.studentId },
      data: {
        enrollmentStatus: EnrollmentStatus.REJECTED,
      },
    });

    await this.invalidateStudentCaches(schoolId, [enrollment.studentId]);
    return { message: 'Enrollment rejected successfully' };
  }

  // REGISTRAR: Assign/Update class for student
  async assignClass(
    studentId: string,
    schoolId: string,
    assignData: AssignClassDto,
  ) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        userId: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const { className, section, rollNumber } = assignData;

    // Update student profile with class assignment
    await this.prismaService.studentProfile.update({
      where: { userId: studentId },
      data: {
        className,
        section,
        rollNumber,
      },
    });

    await this.invalidateStudentCaches(schoolId, [studentId]);
    return {
      message: 'Class assigned successfully',
      studentId,
      className,
      section,
      rollNumber,
    };
  }

  // REGISTRAR: Upload documents for student
  async uploadDocuments(studentId: string, schoolId: string, documents: any[]) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        userId: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get existing documents
    const existingDocs = student.documents ? JSON.parse(student.documents) : [];

    // Merge with new documents
    const updatedDocs = [
      ...existingDocs,
      ...documents.map((doc) => ({
        ...doc,
        uploadedAt: new Date().toISOString(),
      })),
    ];

    // Update student profile
    await this.prismaService.studentProfile.update({
      where: { userId: studentId },
      data: {
        documents: JSON.stringify(updatedDocs),
      },
    });

    await this.invalidateStudentCaches(schoolId, [studentId]);
    return {
      message: 'Documents uploaded successfully',
      studentId,
      documentCount: updatedDocs.length,
    };
  }

  /**
   * NEW: Proxy for /api/students?classId=... (offline attendance cache)
   * Delegates to ClassService.getStudentsByClass() for identical logic
   */
  async getStudentsByClassProxy(
    classId: string,
    sectionId?: string,
    search?: string,
    pagination?: { page: number; limit: number },
    schoolId?: string, // Made optional
  ) {
    return this.classService.getStudentsByClass(
      classId,
      sectionId,
      search,
      pagination,
    );
  }

  async getStudentsByHomeroomTeacher(
    schoolId: string,
    teacherId: string,
    requesterRole: string,
  ) {
    const [homeroomSections, classSubjectAssignments, timetableAssignments] =
      await Promise.all([
        this.prismaService.section.findMany({
          where: {
            homeroomTeacherId: teacherId,
            class: {
              schoolId,
            },
          },
          select: {
            id: true,
            name: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
          },
        }),
        this.prismaService.classSubject.findMany({
          where: {
            teacherId,
            class: {
              schoolId,
            },
          },
          select: {
            classId: true,
            sectionId: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
            section: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prismaService.timetableSlot.findMany({
          where: {
            teacherId,
            class: {
              schoolId,
            },
          },
          select: {
            classId: true,
            sectionId: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
            section: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
      ]);

    const assignedSectionsMap = new Map<
      string,
      {
        classId: string;
        sectionId: string;
        className: string;
        sectionName: string;
        grade: number | null;
      }
    >();

    for (const section of homeroomSections) {
      assignedSectionsMap.set(`${section.class.id}:${section.id}`, {
        classId: section.class.id,
        sectionId: section.id,
        className: section.class.name,
        sectionName: section.name,
        grade: section.class.grade,
      });
    }

    for (const assignment of [
      ...classSubjectAssignments,
      ...timetableAssignments,
    ]) {
      assignedSectionsMap.set(`${assignment.classId}:${assignment.sectionId}`, {
        classId: assignment.classId,
        sectionId: assignment.sectionId,
        className: assignment.class.name,
        sectionName: assignment.section.name,
        grade: assignment.class.grade,
      });
    }

    const assignedSections = Array.from(assignedSectionsMap.values()).sort(
      (left, right) => {
        const classCompare = left.className.localeCompare(right.className);
        if (classCompare !== 0) {
          return classCompare;
        }
        return left.sectionName.localeCompare(right.sectionName);
      },
    );

    if (assignedSections.length === 0) {
      return { data: [] };
    }

    const studentsFromClassLinks =
      await this.prismaService.studentClass.findMany({
        where: {
          schoolId,
          OR: assignedSections.map((section) => ({
            classId: section.classId,
            sectionId: section.sectionId,
          })),
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              email: true,
              phone: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              grade: true,
            },
          },
          section: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { class: { name: 'asc' } },
          { section: { name: 'asc' } },
          { student: { name: 'asc' } },
        ],
      });

    const assignedProfileMatchers = assignedSections.flatMap((assignment) => {
      const className = assignment.className || `Grade ${assignment.grade}`;
      const classNameVariants = [
        className,
        className.replace('Grade ', ''),
        `Grade ${className.replace('Grade ', '')}`,
      ].filter(
        (value, index, array) => value && array.indexOf(value) === index,
      );

      const sectionVariants = [
        assignment.sectionName,
        assignment.sectionName.toUpperCase(),
        assignment.sectionName.toLowerCase(),
      ].filter(
        (value, index, array) => value && array.indexOf(value) === index,
      );

      return classNameVariants.flatMap((name) =>
        sectionVariants.map((section) => ({
          className: name,
          section,
          classId: assignment.classId,
          sectionId: assignment.sectionId,
          grade: assignment.grade,
        })),
      );
    });

    const studentsFromProfiles =
      assignedProfileMatchers.length > 0
        ? await this.prismaService.studentProfile.findMany({
            where: {
              schoolId,
              OR: assignedProfileMatchers.map((matcher) => ({
                className: matcher.className,
                section: matcher.section,
              })),
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  email: true,
                  phone: true,
                },
              },
            },
            orderBy: {
              user: {
                name: 'asc',
              },
            },
          })
        : [];

    const studentMap = new Map<
      string,
      {
        id: string;
        name: string;
        avatarUrl: string | null;
        email: string | null;
        phone: string | null;
        classId: string;
        className: string;
        section: string | null;
        grade: number | null;
        academicYear: string | null;
      }
    >();

    for (const studentClass of studentsFromClassLinks) {
      studentMap.set(studentClass.student.id, {
        id: studentClass.student.id,
        name: studentClass.student.name,
        avatarUrl: studentClass.student.avatarUrl,
        email: studentClass.student.email,
        phone: studentClass.student.phone,
        classId: studentClass.class.id,
        className: studentClass.class.name,
        section: studentClass.section.name,
        grade: studentClass.class.grade,
        academicYear: studentClass.academicYear,
      });
    }

    for (const profile of studentsFromProfiles) {
      if (studentMap.has(profile.userId)) {
        continue;
      }

      const matchedClass = assignedProfileMatchers.find(
        (matcher) =>
          matcher.className === profile.className &&
          matcher.section === profile.section,
      );

      if (!matchedClass) {
        continue;
      }

      studentMap.set(profile.userId, {
        id: profile.user.id,
        name: profile.user.name,
        avatarUrl: profile.user.avatarUrl,
        email: profile.user.email,
        phone: profile.user.phone,
        classId: matchedClass.classId,
        className:
          profile.className ||
          assignedSections.find(
            (section) =>
              section.classId === matchedClass.classId &&
              section.sectionId === matchedClass.sectionId,
          )?.className ||
          '',
        section: profile.section,
        grade: matchedClass.grade ?? null,
        academicYear: null,
      });
    }

    return {
      data: Array.from(studentMap.values()).sort((left, right) => {
        const classCompare =
          `${left.className}-${left.section || ''}`.localeCompare(
            `${right.className}-${right.section || ''}`,
          );
        if (classCompare !== 0) {
          return classCompare;
        }
        return left.name.localeCompare(right.name);
      }),
    };
  }

  private async generateStudentCode(schoolId: string): Promise<string> {
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const schoolPrefix = school.name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');

    return `${schoolPrefix}${timestamp}${random}`;
  }

  private generateTempPassword(): string {
    return (
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8)
    );
  }
}
