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
import { PrismaService } from '../prisma/prisma.service';
import { CredentialService } from '../credential/credential.service';
import { Role, EnrollmentStatus } from '@prisma/client';
import { ClassService } from '../class/class.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { SCHOOL_SETTING_KEYS } from '../school-settings/school-settings.service';
import { TemplatesService } from '../templates/templates.service';

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
  classId?: string;
  sectionId?: string;
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
    private templatesService: TemplatesService,
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

  async getIdCardTemplate(schoolId: string) {
    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
      select: { name: true, phone: true, address: true, email: true, logoUrl: true },
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
      themeColor: template.themeColor || '#1f2937',
      templateBackgroundUrl: template.templateBackgroundUrl || '',
      schoolName: template.schoolName || school?.name || '',
      schoolPhone: template.schoolPhone || school?.phone || '',
      schoolAddress: template.schoolAddress || school?.address || '',
      schoolEmail: template.schoolEmail || school?.email || '',
      schoolLogoUrl: template.schoolLogoUrl || school?.logoUrl || '',
    };
  }

  async saveIdCardTemplate(schoolId: string, value: Record<string, any>) {
    const normalized = {
      title: String(value.title || 'Student ID Card').trim(),
      themeColor: String(value.themeColor || '#1f2937').trim(),
      templateBackgroundUrl: String(value.templateBackgroundUrl || '').trim(),
      schoolName: String(value.schoolName || '').trim(),
      schoolPhone: String(value.schoolPhone || '').trim(),
      schoolAddress: String(value.schoolAddress || '').trim(),
      schoolEmail: String(value.schoolEmail || '').trim(),
      schoolLogoUrl: String(value.schoolLogoUrl || '').trim(),
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

  async uploadIdCardTemplate(schoolId: string, file: Express.Multer.File): Promise<string> {
    const backendPublicDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'id-card-templates',
    );
    const frontendPublicDir = path.join(
      process.cwd(),
      '..',
      'frontend',
      'public',
      'uploads',
      'id-card-templates',
    );

    if (!fs.existsSync(backendPublicDir)) {
      fs.mkdirSync(backendPublicDir, { recursive: true });
    }
    if (!fs.existsSync(frontendPublicDir)) {
      fs.mkdirSync(frontendPublicDir, { recursive: true });
    }

    const fileName = `${schoolId}-${Date.now()}${path.extname(file.originalname)}`;
    const backendFilePath = path.join(backendPublicDir, fileName);
    const frontendFilePath = path.join(frontendPublicDir, fileName);

    fs.writeFileSync(backendFilePath, file.buffer);
    fs.copyFileSync(backendFilePath, frontendFilePath);

    return `/uploads/id-card-templates/${fileName}`;
  }

  private resolvePublicAssetPath(urlPath: string): string {
    const clean = String(urlPath || '').trim().replace(/^\/+/, '');
    return path.join(process.cwd(), '..', 'frontend', 'public', clean);
  }

  private async renderIdCardPdfFromTemplate(templatePath: string, payload: {
    title: string;
    schoolName: string;
    schoolAddress: string;
    schoolPhone: string;
    schoolEmail: string;
    studentName: string;
    studentCode: string;
    classLabel: string;
    photoUrl?: string;
    fieldMap?: Array<Record<string, any>>;
  }): Promise<Buffer> {
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPage(0);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const normal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const { width, height } = page.getSize();

    const getVal = (k: string) => ({
      title: payload.title,
      school_name: payload.schoolName,
      school_phone: payload.schoolPhone,
      school_address: payload.schoolAddress,
      school_email: payload.schoolEmail,
      student_name: payload.studentName,
      cert_id: payload.studentCode,
      grade: payload.classLabel,
    } as any)[k] || '';

    const fields = Array.isArray(payload.fieldMap) ? payload.fieldMap : [];
    if (fields.length > 0) {
      for (const f of fields) {
        const x = (Number(f.x_percent || 0) / 100) * width;
        const y = height - (Number(f.y_percent || 0) / 100) * height;
        const w = (Number(f.width_percent ?? f.w_percent ?? 0) / 100) * width || width * 0.16;
        const h = (Number(f.height_percent ?? f.h_percent ?? 0) / 100) * height || height * 0.16;
        const size = Number(f.font_size || 10);
        const color = String(f.font_color || '#000000').replace('#', '');
        const r = parseInt(color.slice(0, 2) || '00', 16) / 255;
        const g = parseInt(color.slice(2, 4) || '00', 16) / 255;
        const b = parseInt(color.slice(4, 6) || '00', 16) / 255;
        if (f.field_key === 'photo' && payload.photoUrl) {
          try {
            const photoPath = this.resolvePublicAssetPath(payload.photoUrl);
            if (fs.existsSync(photoPath)) {
              const photoBytes = fs.readFileSync(photoPath);
              const isPng = payload.photoUrl.toLowerCase().endsWith('.png');
              const img = isPng ? await pdfDoc.embedPng(photoBytes) : await pdfDoc.embedJpg(photoBytes);
              page.drawImage(img, { x, y: y - h, width: w, height: h });
            }
          } catch {}
          continue;
        }
        if (f.field_key === 'qr_code') {
          const qrDataUrl = await QRCode.toDataURL(payload.studentCode || payload.studentName || 'id');
          const qrBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
          const qrImage = await pdfDoc.embedPng(qrBytes);
          page.drawImage(qrImage, { x, y: y - h, width: w, height: h });
          continue;
        }
        page.drawText(String(getVal(String(f.field_key || ''))), { x, y, size, font: f.bold ? font : normal, color: rgb(r, g, b) });
      }
    } else {
      page.drawText(payload.title || 'Student ID Card', { x: width * 0.06, y: height * 0.9, size: 14, font, color: rgb(0, 0, 0) });
      page.drawText(payload.schoolName || '', { x: width * 0.06, y: height * 0.86, size: 10, font: normal });
      page.drawText(`${payload.schoolAddress || ''} ${payload.schoolPhone || ''}`.trim(), { x: width * 0.06, y: height * 0.84, size: 9, font: normal });
      if (payload.schoolEmail) page.drawText(payload.schoolEmail, { x: width * 0.06, y: height * 0.82, size: 9, font: normal });
      page.drawText(payload.studentName || '', { x: width * 0.06, y: height * 0.72, size: 13, font });
      page.drawText(payload.studentCode || '', { x: width * 0.06, y: height * 0.685, size: 10, font: normal });
      page.drawText(payload.classLabel || '', { x: width * 0.06, y: height * 0.655, size: 10, font: normal });
    }

    return Buffer.from(await pdfDoc.save());
  }

  async generateIdCardPdf(schoolId: string, studentId: string): Promise<Buffer> {
    const template = await this.getIdCardTemplate(schoolId);
    const activeTemplate = await this.templatesService.getActiveTemplate(schoolId, 'ID_CARD');
    if (!activeTemplate?.backgroundUrl) {
      throw new BadRequestException('Activate an ID card template first');
    }
    const templatePath = this.resolvePublicAssetPath(activeTemplate.backgroundUrl);
    if (!fs.existsSync(templatePath)) {
      throw new NotFoundException('ID card template file not found');
    }
    const list = await this.getStudentsForIdCards(schoolId, { studentIds: [studentId] });
    const student = list.students?.[0];
    if (!student) throw new NotFoundException('Student not found for ID card');
    return this.renderIdCardPdfFromTemplate(templatePath, {
      title: template.title,
      schoolName: template.schoolName,
      schoolAddress: template.schoolAddress,
      schoolPhone: template.schoolPhone,
      schoolEmail: template.schoolEmail,
      studentName: student.name,
      studentCode: student.studentCode,
      classLabel: `Grade ${student.grade} - ${student.section}`,
      photoUrl: student.photoUrl,
      fieldMap: (() => {
        try { return activeTemplate.fieldMapJson ? JSON.parse(activeTemplate.fieldMapJson) : []; } catch { return []; }
      })(),
    });
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

    const { className, section, rollNumber, classId, sectionId } = assignData;

    let academicYear = student.academicYear;

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
    }

    // Update student profile with class assignment
    await this.prismaService.studentProfile.update({
      where: { userId: studentId },
      data: {
        className,
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
    return (
      Math.random().toString(36).slice(-8) +
      Math.random().toString(36).slice(-8)
    );
  }
}
