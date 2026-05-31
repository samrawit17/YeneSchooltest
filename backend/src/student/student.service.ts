import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import archiver from 'archiver';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialService } from '../credential/credential.service';
import { Prisma, Role, EnrollmentStatus } from '@prisma/client';
import { ClassService } from '../class/class.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { SCHOOL_SETTING_KEYS } from '../school-settings/school-settings.service';

export interface CreateStudentDto {
  email?: string;
  name: string;
  schoolId: string;
  academicYear: string;
  grade: number; // Grade number (1-12)
  className?: string; // Class name (e.g., "Grade 5")
  stream?: string | null;
  section?: string; // Section (e.g., "A")
  rollNumber?: string; // Roll number
  gender?: string;
  address?: string;
  phone?: string;
  motherName?: string;
  motherPhone?: string;
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
  stream?: string | null;
  address?: string;
  phone?: string;
  motherName?: string;
  motherPhone?: string;
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
  classId?: string;
  sectionId?: string;
  stream?: string | null;
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

  private normalizeStudentStream(stream?: string | null, grade?: number | null) {
    if (!grade || ![11, 12].includes(grade)) {
      return null;
    }

    const normalized = String(stream || '').trim().toUpperCase();
    if (!normalized) {
      return null;
    }

    if (!['SOCIAL', 'NATURAL'].includes(normalized)) {
      throw new BadRequestException('Student stream must be SOCIAL or NATURAL for Grade 11 and 12');
    }

    return normalized;
  }

  private extractGradeFromClassName(className?: string | null) {
    const match = String(className || '').match(/\d+/);
    return match ? Number(match[0]) : null;
  }

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
      stream,
      section,
      rollNumber,
      gender,
      address,
      phone,
      motherName,
      motherPhone,
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
        stream: this.normalizeStudentStream(stream, grade),
        section,
        rollNumber,
        gender,
        address,
        phone,
        motherName,
        motherPhone,
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
                          phone: true,
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

        const academicYearValues = [
          ...new Set(
            studentProfiles
              .map((profile) => profile.academicYear)
              .filter((value): value is string => !!value),
          ),
        ];
        const academicYears = academicYearValues.length
          ? await this.prismaService.academicYear.findMany({
              where: {
                schoolId,
                OR: [
                  { id: { in: academicYearValues } },
                  { name: { in: academicYearValues } },
                ],
              },
              select: { id: true, name: true, ethiopianYear: true },
            })
          : [];
        const academicYearDisplayByValue = new Map<string, string>();
        academicYears.forEach((year) => {
          const display = String(year.ethiopianYear || year.name || '').trim();
          if (!display) return;
          academicYearDisplayByValue.set(year.id, display);
          academicYearDisplayByValue.set(year.name, display);
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
            academicYearDisplay:
              academicYearDisplayByValue.get(profile.academicYear || '') ||
              profile.academicYear ||
              null,
            parentName: profile.parents?.[0]?.parent?.user?.name || null,
            parentPhone: profile.parents?.[0]?.parent?.user?.phone || null,
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
            username: true,
            name: true,
            avatarUrl: true,
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
        where: {
          schoolId,
          OR: [{ id: student.academicYear }, { name: student.academicYear }],
        },
        select: { id: true, name: true, ethiopianYear: true },
      });
      academicYearName = academicYear
        ? String(academicYear.ethiopianYear || academicYear.name || '').trim()
        : null;
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
      academicYearDisplay: academicYearName || student.academicYear || null,
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

    const profileAcademicYearValues = Array.from(
      new Set(
        studentProfiles
          .map((profile) => profile.academicYear)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const academicYearRows = profileAcademicYearValues.length
      ? await this.prismaService.academicYear.findMany({
          where: {
            schoolId,
            OR: [
              { id: { in: profileAcademicYearValues } },
              { name: { in: profileAcademicYearValues } },
            ],
          },
          select: { id: true, name: true },
        })
      : [];
    const academicYearLabelByValue = new Map<string, string>();
    for (const year of academicYearRows) {
      academicYearLabelByValue.set(year.id, year.name);
      academicYearLabelByValue.set(year.name, year.name);
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
        academicYear:
          academicYearLabelByValue.get(profile.academicYear || '') ||
          academicYearName ||
          profile.academicYear ||
          '',
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

  async getIdCardTemplate(schoolId: string) {
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { name: true, phone: true, address: true, logoUrl: true },
    });

    const stored = await this.prismaService.schoolSetting.findFirst({
      where: { schoolId, key: SCHOOL_SETTING_KEYS.ID_CARD_TEMPLATE },
      select: { value: true },
    });

    let template: any = {};
    if (stored?.value) {
      try {
        template = JSON.parse(stored.value);
      } catch {
        template = {};
      }
    }

    return {
      schoolId,
      title: template.title || 'Student ID Card',
      themeColor: this.normalizeHexColor(template.themeColor, '#1B4F72'),
      schoolName: template.schoolName || school?.name || '',
      schoolPhone: template.schoolPhone || school?.phone || '',
      schoolAddress: template.schoolAddress || school?.address || '',
      schoolLogoUrl: school?.logoUrl || '',
      showEmergencyContact: template.showEmergencyContact !== false,
      showBloodGroup: template.showBloodGroup === true,
      useCustomBackground: template.useCustomBackground === true,
      customBackgroundUrl: template.customBackgroundUrl || '',
    };
  }

  async saveIdCardTemplate(schoolId: string, value: Record<string, any>) {
    const normalized = {
      title: String(value.title || 'Student ID Card').trim(),
      themeColor: this.normalizeHexColor(value.themeColor, '#1B4F72'),
      schoolName: String(value.schoolName || '').trim(),
      schoolPhone: String(value.schoolPhone || '').trim(),
      schoolAddress: String(value.schoolAddress || '').trim(),
      showEmergencyContact: value.showEmergencyContact !== false,
      showBloodGroup: value.showBloodGroup === true,
      useCustomBackground: value.useCustomBackground === true,
      customBackgroundUrl: String(value.customBackgroundUrl || '').trim(),
    };

    const existing = await this.prismaService.schoolSetting.findFirst({
      where: { schoolId, key: SCHOOL_SETTING_KEYS.ID_CARD_TEMPLATE },
      select: { id: true },
    });

    if (existing) {
      await this.prismaService.schoolSetting.update({
        where: { id: existing.id },
        data: { value: JSON.stringify(normalized) },
      });
    } else {
      await this.prismaService.schoolSetting.create({
        data: {
          schoolId,
          key: SCHOOL_SETTING_KEYS.ID_CARD_TEMPLATE,
          value: JSON.stringify(normalized),
        },
      });
    }

    return this.getIdCardTemplate(schoolId);
  }

  async uploadIdCardWatermark(schoolId: string, file: Express.Multer.File): Promise<string> {
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Watermark must be a PNG, JPG, or WEBP image');
    }
    const extension =
      file.mimetype === 'image/png' ? '.png' :
      file.mimetype === 'image/webp' ? '.webp' :
      '.jpg';
    const relativeDir = path.join('uploads', 'id-card-watermarks');
    const publicDir = path.join(process.cwd(), 'public', relativeDir);
    const fileName = `${schoolId}-${Date.now()}${extension}`;
    await fs.promises.mkdir(publicDir, { recursive: true });
    await fs.promises.writeFile(path.join(publicDir, fileName), file.buffer);
    return `/${relativeDir.split(path.sep).join('/')}/${fileName}`;
  }

  private normalizeHexColor(value: any, fallback: string) {
    const raw = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
  }

  private hexToRgbColor(value: string) {
    const raw = this.normalizeHexColor(value, '#1B4F72').replace('#', '');
    return rgb(
      parseInt(raw.slice(0, 2), 16) / 255,
      parseInt(raw.slice(2, 4), 16) / 255,
      parseInt(raw.slice(4, 6), 16) / 255,
    );
  }

  private resolvePublicAssetPath(urlPath: string): string | null {
    const raw = String(urlPath || '').trim();
    if (!raw) return null;
    if (path.isAbsolute(raw) && !raw.includes('..') && fs.existsSync(raw)) return raw;
    const clean = raw.replace(/^\/+/, '');
    if (!clean || clean.includes('..')) return null;
    const candidates = [
      path.join(process.cwd(), 'public', clean),
      path.join(process.cwd(), 'backend', 'public', clean),
      path.join(process.cwd(), 'frontend', 'public', clean),
      path.resolve(__dirname, '..', '..', 'public', clean),
      path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', clean),
      path.join(process.cwd(), '..', 'frontend', 'public', clean),
    ].filter(Boolean);
    return candidates.find((candidate) => fs.existsSync(candidate)) || null;
  }

  async generateIdCardPdf(schoolId: string, studentId: string): Promise<Buffer> {
    const template = await this.getIdCardTemplate(schoolId);
    const list = await this.getStudentsForIdCards(schoolId, { studentIds: [studentId] });
    const student = list.students?.[0];
    if (!student) throw new NotFoundException('Student not found for ID card');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([336, 212]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    const theme = this.hexToRgbColor(template.themeColor);
    const darkText = rgb(0.08, 0.1, 0.14);
    const mutedText = rgb(0.38, 0.42, 0.48);
    const lightSurface = rgb(0.95, 0.97, 1);

    const drawText = (text: string, x: number, y: number, size = 8, textFont = font, color = darkText) => {
      page.drawText(String(text || ''), { x, y, size, font: textFont, color });
    };
    const readImageBytes = async (url: string | undefined): Promise<Buffer | null> => {
      const clean = String(url || '').trim();
      if (!clean) return null;
      if (clean.startsWith('data:image/')) {
        const encoded = clean.split(',')[1];
        return encoded ? Buffer.from(encoded, 'base64') : null;
      }
      const assetPath = this.resolvePublicAssetPath(clean);
      if (!assetPath || !fs.existsSync(assetPath)) return null;
      return fs.readFileSync(assetPath);
    };
    const drawImage = async (url: string | undefined, x: number, y: number, w: number, h: number) => {
      const bytes = await readImageBytes(url);
      if (!bytes) return false;
      try {
        const lower = String(url || '').toLowerCase();
        const image = lower.includes('image/png') || lower.endsWith('.png')
          ? await pdfDoc.embedPng(bytes)
          : lower.includes('image/jpeg') || lower.includes('image/jpg') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')
            ? await pdfDoc.embedJpg(bytes)
            : await pdfDoc.embedPng(await sharp(bytes).png().toBuffer());
        page.drawImage(image, { x, y, width: w, height: h });
        return true;
      } catch {
        return false;
      }
    };
    const drawWatermark = async () => {
      if (!template.useCustomBackground || !template.customBackgroundUrl) return;
      const bytes = await readImageBytes(template.customBackgroundUrl);
      if (!bytes) return;
      try {
        const lower = template.customBackgroundUrl.toLowerCase();
        const image = lower.endsWith('.png')
          ? await pdfDoc.embedPng(bytes)
          : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
            ? await pdfDoc.embedJpg(bytes)
            : await pdfDoc.embedPng(await sharp(bytes).png().toBuffer());
        const watermarkW = width * 0.58;
        const watermarkH = watermarkW * (image.height / image.width);
        page.drawImage(image, {
          x: (width - watermarkW) / 2,
          y: (height - watermarkH) / 2 - 4,
          width: watermarkW,
          height: watermarkH,
          opacity: 0.12,
        });
      } catch {
        return;
      }
    };

    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    await drawWatermark();
    page.drawRectangle({ x: 0, y: height - 48, width, height: 48, color: theme });
    page.drawRectangle({ x: 0, y: 0, width, height: 24, color: lightSurface });
    await drawImage(template.schoolLogoUrl, 14, height - 40, 28, 28);
    drawText(template.schoolName || 'School Name', 50, height - 24, 13, bold, rgb(1, 1, 1));
    drawText([template.schoolPhone, template.schoolAddress].filter(Boolean).join('  •  '), 50, height - 39, 6.4, font, rgb(0.88, 0.94, 1));
    drawText(template.title || 'Student ID Card', width - 98, height - 24, 9, bold, rgb(1, 1, 1));

    const photoX = 18;
    const photoY = 70;
    page.drawRectangle({ x: photoX, y: photoY, width: 78, height: 92, color: rgb(1, 1, 1), borderColor: theme, borderWidth: 1 });
    const hasPhoto = await drawImage(student.photoUrl, photoX + 4, photoY + 4, 70, 84);
    if (!hasPhoto) {
      page.drawRectangle({ x: photoX + 4, y: photoY + 4, width: 70, height: 84, color: lightSurface });
      drawText('PHOTO', photoX + 23, photoY + 43, 8, bold, mutedText);
    }

    const detailsX = 112;
    drawText(student.name || 'Student Name', detailsX, 151, 15, bold, theme);
    drawText(`ID: ${student.studentCode || '-'}`, detailsX, 133, 9, bold, darkText);
    drawText(`Class: Grade ${student.grade || '-'} ${student.section || ''}`.trim(), detailsX, 118, 8.5, font, darkText);
    drawText(`Academic Year: ${student.academicYear || list.academicYear || '-'}`, detailsX, 104, 8.5, font, darkText);
    if (template.showBloodGroup && student.bloodGroup) drawText(`Blood Group: ${student.bloodGroup}`, detailsX, 90, 8.5, font, darkText);
    if (template.showEmergencyContact && student.emergencyContact?.phone) {
      drawText(`Emergency: ${student.emergencyContact.phone}`, detailsX, 76, 8, font, darkText);
    }

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify({
      studentId: student.studentId,
      studentCode: student.studentCode,
      schoolId,
    }));
    const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrBytes);
    page.drawImage(qrImage, { x: width - 70, y: 54, width: 48, height: 48 });
    drawText('Scan to verify', width - 70, 44, 6.5, font, mutedText);

    page.drawLine({ start: { x: 24, y: 14 }, end: { x: 104, y: 14 }, thickness: 0.7, color: mutedText });
    page.drawLine({ start: { x: width - 116, y: 14 }, end: { x: width - 24, y: 14 }, thickness: 0.7, color: mutedText });
    drawText('School Stamp', 42, 6, 6.5, font, mutedText);
    drawText('Principal Signature', width - 100, 6, 6.5, font, mutedText);

    return Buffer.from(await pdfDoc.save());
  }

  async generateIdCardBulkZip(schoolId: string, studentIds: string[]): Promise<Buffer> {
    const ids = studentIds.filter(Boolean);
    if (!ids.length) throw new BadRequestException('No student IDs provided');
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', (d) => chunks.push(d));
    await Promise.all(ids.map(async (id) => {
      const pdf = await this.generateIdCardPdf(schoolId, id);
      archive.append(pdf, { name: `id-card-${id}.pdf` });
    }));
    await archive.finalize();
    return await new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });
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
      stream,
      address,
      phone,
      motherName,
      motherPhone,
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
        ...(stream !== undefined && { stream: this.normalizeStudentStream(stream, this.extractGradeFromClassName(student.className)) }),
        ...(address && { address }),
        ...(phone && { phone }),
        ...(motherName !== undefined && { motherName }),
        ...(motherPhone !== undefined && { motherPhone }),
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

  async deleteStudent(studentId: string, schoolId: string, deletedById?: string) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        userId: studentId,
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const archivedAt = new Date();
    await this.prismaService.$transaction([
      this.prismaService.$executeRaw(
        Prisma.sql`
          UPDATE "Enrollment"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `,
      ),
      this.prismaService.$executeRaw(
        Prisma.sql`
          UPDATE "StudentProfile"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "userId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `,
      ),
      this.prismaService.$executeRaw(
        Prisma.sql`
          UPDATE "ReportCard"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `,
      ),
      this.prismaService.$executeRaw(
        Prisma.sql`
          UPDATE "Grade"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `,
      ),
      this.prismaService.$executeRaw(
        Prisma.sql`
          UPDATE "StudentFee"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `,
      ),
      this.prismaService.$executeRaw(
        Prisma.sql`
          UPDATE "Payment"
          SET "deletedAt" = ${archivedAt}, "deletedById" = ${deletedById || null}
          WHERE "studentId" = ${studentId}
            AND "schoolId" = ${schoolId}
            AND "deletedAt" IS NULL
        `,
      ),
      this.prismaService.$executeRaw(
        Prisma.sql`
          UPDATE "User"
          SET "deletedAt" = ${archivedAt},
              "deletedById" = ${deletedById || null},
              "isActive" = false,
              "updatedAt" = ${archivedAt}
          WHERE "id" = ${studentId}
            AND "deletedAt" IS NULL
        `,
      ),
    ]);

    await this.invalidateStudentCaches(schoolId, [studentId]);
    return { message: 'Student archived successfully' };
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

    const { className, section, rollNumber, classId, sectionId, stream } = assignData;

    let academicYear = student.academicYear;
    let targetGrade = this.extractGradeFromClassName(className);

    if (classId && sectionId) {
      const targetSection = await this.prismaService.section.findFirst({
        where: { id: sectionId, classId, class: { schoolId } },
        include: { class: true },
      });

      if (!targetSection) {
        throw new BadRequestException('Selected class and section are not valid');
      }

      const activeAcademicYear = await this.prismaService.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { name: true },
      });

      academicYear = student.academicYear || activeAcademicYear?.name || new Date().getFullYear().toString();

      const enrolledCount = await this.prismaService.studentClass.count({
        where: {
          schoolId,
          classId,
          sectionId,
          academicYear,
          studentId: { not: studentId },
        },
      });

      if (targetSection.capacity && enrolledCount >= targetSection.capacity) {
        throw new BadRequestException('Selected section is already at capacity');
      }

      await this.prismaService.studentClass.upsert({
        where: {
          studentId_academicYear: {
            studentId,
            academicYear,
          },
        },
        create: {
          studentId,
          classId,
          sectionId,
          schoolId,
          academicYear,
        },
        update: {
          classId,
          sectionId,
          schoolId,
        },
      });
      targetGrade = targetSection.class.grade;
    }

    // Update student profile with class assignment
    await this.prismaService.studentProfile.update({
      where: { userId: studentId },
      data: {
        className,
        stream: this.normalizeStudentStream(stream, targetGrade),
        section,
        rollNumber,
        academicYear,
      },
    });

    await this.invalidateStudentCaches(schoolId, [studentId]);
    return {
      message: 'Class assigned successfully',
      studentId,
      className,
      stream: this.normalizeStudentStream(stream, targetGrade),
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

  async deleteDocument(studentId: string, schoolId: string, documentKey: string) {
    const student = await this.prismaService.studentProfile.findFirst({
      where: {
        OR: [{ userId: studentId }, { id: studentId }],
        schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const existingDocs = student.documents ? JSON.parse(student.documents) : [];
    const normalizedKey = decodeURIComponent(documentKey || '').toLowerCase();
    const updatedDocs = existingDocs.filter((doc: any) => {
      const candidates = [
        doc.id,
        doc.type,
        doc.title,
        doc.name,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return !candidates.includes(normalizedKey);
    });

    if (updatedDocs.length === existingDocs.length) {
      throw new NotFoundException('Document not found');
    }

    await this.prismaService.studentProfile.update({
      where: { id: student.id },
      data: {
        documents: JSON.stringify(updatedDocs),
      },
    });

    await this.invalidateStudentCaches(schoolId, [student.userId]);
    return {
      message: 'Document deleted successfully',
      studentId: student.userId,
      documentCount: updatedDocs.length,
    };
  }

  async uploadDocumentFile(
    studentId: string,
    schoolId: string,
    file: Express.Multer.File,
    data: { title?: string; type?: string; description?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Document must be a PDF, PNG, JPG, or WEBP file');
    }

    const extension = path.extname(file.originalname || '') || (
      file.mimetype === 'application/pdf'
        ? '.pdf'
        : file.mimetype === 'image/png'
          ? '.png'
          : file.mimetype === 'image/webp'
            ? '.webp'
            : '.jpg'
    );
    const safeType = String(data.type || data.title || 'document')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') || 'document';
    const relativeDir = path.join('uploads', 'student-documents', schoolId, studentId);
    const publicDir = path.join(process.cwd(), 'public', relativeDir);
    const fileName = `${safeType}-${Date.now()}${extension}`;
    await fs.promises.mkdir(publicDir, { recursive: true });
    await fs.promises.writeFile(path.join(publicDir, fileName), file.buffer);

    const fileUrl = `/${relativeDir.split(path.sep).join('/')}/${fileName}`;
    const document = {
      id: `${safeType}-${Date.now()}`,
      type: safeType,
      title: data.title || data.type || file.originalname || 'Document',
      name: data.title || file.originalname || 'Document',
      category: 'student_registration',
      status: 'SUBMITTED',
      submitted: true,
      description: data.description || undefined,
      fileUrl,
      mimeType: file.mimetype,
      size: file.size,
    };

    return this.uploadDocuments(studentId, schoolId, [document]);
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
    if (!schoolId) {
      throw new Error('schoolId is required');
    }
    return this.classService.getStudentsByClass(
      schoolId,
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
    return this.credentialService.generateTemporaryPassword(16);
  }
}
