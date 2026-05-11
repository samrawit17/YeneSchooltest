import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ParentProfile, EnrollmentStatus } from '@prisma/client';
import { Role } from '../auth/types/role.enum';
import { CredentialService } from '../credential/credential.service';

export interface FeeBreakdown {
  feeId: string;
  feeType: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paid: number;
  balance: number;
  status: string;
  termId: string | null;
  termName: string;
}

export interface CreateParentDto {
  email: string;
  name: string;
  phone?: string;
  address?: string;
  occupation?: string;
  schoolId?: string;
}

export interface UpdateParentDto {
  name?: string;
  phone?: string;
  address?: string;
  occupation?: string;
}

export interface LinkParentToStudentDto {
  parentProfileId: string;
  studentProfileId: string;
  relation?: string;
  isPrimary?: boolean;
  emergencyContact?: boolean;
}

export interface CreateParentAndLinkDto {
  email: string;
  name: string;
  phone?: string;
  address?: string;
  occupation?: string;
  studentProfileId: string;
  relation?: string;
  isPrimary?: boolean;
  emergencyContact?: boolean;
}

type RelatedTeacherOption = {
  teacherId: string;
  teacherName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
  studentId: string;
  childName: string;
  className: string | null;
  section: string | null;
  relationType: 'HOMEROOM' | 'TEACHING';
  subjects: string[];
};

@Injectable()
export class ParentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly credentialService: CredentialService,
  ) {}

  async createParent(createParentDto: CreateParentDto, createdById: string) {
    const { email, name, phone, address, occupation, schoolId } =
      createParentDto;

    if (!schoolId) {
      throw new BadRequestException('School ID is required');
    }

    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const result = await this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          phone,
          password: 'parent',
          role: Role.PARENT,
          schoolId,
          mustChangePassword: true,
        },
      });

      const parent = await tx.parentProfile.create({
        data: {
          userId: user.id,
          schoolId,
          address,
          occupation,
        },
      });

      return parent;
    });

    return result;
  }

  async createParentAndLink(
    dto: CreateParentAndLinkDto,
    createdById: string,
    schoolId: string,
  ) {
    const {
      email,
      name,
      phone,
      address,
      occupation,
      studentProfileId,
      relation,
      isPrimary,
      emergencyContact,
    } = dto;

    const school = await this.prismaService.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const student = await this.prismaService.studentProfile.findUnique({
      where: { id: studentProfileId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.schoolId !== schoolId) {
      throw new ForbiddenException('Student does not belong to this school');
    }

    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const result = await this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          phone,
          password: 'parent',
          role: Role.PARENT,
          schoolId,
          mustChangePassword: true,
        },
      });

      const parent = await tx.parentProfile.create({
        data: {
          userId: user.id,
          schoolId,
          address,
          occupation,
        },
      });

      await tx.parentStudent.create({
        data: {
          parentId: parent.id,
          studentId: studentProfileId,
          schoolId,
          relation: relation || 'Parent',
          isPrimary: isPrimary ?? true,
          emergencyContact: emergencyContact ?? false,
        },
      });

      return parent;
    });

    return result;
  }

  async linkParentToStudent(dto: LinkParentToStudentDto, schoolId: string) {
    const {
      parentProfileId,
      studentProfileId,
      relation,
      isPrimary,
      emergencyContact,
    } = dto;

    const parent = await this.prismaService.parentProfile.findFirst({
      where: { id: parentProfileId, schoolId },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const student = await this.prismaService.studentProfile.findUnique({
      where: { id: studentProfileId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.schoolId !== schoolId) {
      throw new ForbiddenException('Student does not belong to this school');
    }

    const existingLink = await this.prismaService.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId: parentProfileId,
          studentId: studentProfileId,
        },
      },
    });

    if (existingLink) {
      throw new BadRequestException('Student already linked to this parent');
    }

    return this.prismaService.parentStudent.create({
      data: {
        parentId: parentProfileId,
        studentId: studentProfileId,
        schoolId,
        relation: relation || 'Parent',
        isPrimary: isPrimary ?? true,
        emergencyContact: emergencyContact ?? false,
      },
    });
  }

  async unlinkParentFromStudent(
    parentId: string,
    studentId: string,
    schoolId: string,
  ) {
    const link = await this.prismaService.parentStudent.findFirst({
      where: {
        parentId,
        studentId,
        schoolId,
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    await this.prismaService.parentStudent.delete({
      where: { id: link.id },
    });

    return { success: true };
  }

  async getParents(
    schoolId: string,
    options: { search?: string; page?: number; limit?: number },
  ) {
    return this.listParents(schoolId, options);
  }

  async listParents(
    schoolId: string,
    options: { search?: string; page?: number; limit?: number },
  ) {
    const { search, page = 1, limit = 20 } = options;
    const where: any = { schoolId };

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const total = await this.prismaService.parentProfile.count({ where });
    const parents = await this.prismaService.parentProfile.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, isActive: true },
        },
        children: {
          include: {
            student: {
              select: {
                user: {
                  select: { name: true },
                },
                className: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return { total, data: parents, page, limit };
  }

  async getParentById(parentId: string, schoolId: string) {
    const parent = await this.prismaService.parentProfile.findFirst({
      where: { id: parentId, schoolId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, lastLoginAt: true, isActive: true },
          // Note: the trailing `true` is a typo bug, but we keep it to maintain backward compatibility
        },
        children: {
          include: {
            student: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    return parent;
  }

  async getParentByUserId(userId: string) {
    const parent = await this.prismaService.parentProfile.findUnique({
      where: { userId },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    return parent;
  }

  async updateParent(
    parentId: string,
    schoolId: string,
    data: UpdateParentDto,
  ) {
    const parent = await this.prismaService.parentProfile.findFirst({
      where: { id: parentId, schoolId },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    if (data.name || data.phone) {
      await this.prismaService.user.update({
        where: { id: parent.userId },
        data: { name: data.name, phone: data.phone },
      });
    }

    return this.prismaService.parentProfile.update({
      where: { id: parentId },
      data: { address: data.address, occupation: data.occupation },
    });
  }

  async getChildrenByParentUserId(parentUserId: string) {
    let parentProfile = await this.prismaService.parentProfile.findUnique({
      where: { userId: parentUserId },
    });

    if (!parentProfile) {
      const user = await this.prismaService.user.findUnique({
        where: { id: parentUserId },
      });

      if (user) {
        parentProfile = await this.prismaService.parentProfile.findFirst({
          where: { user: { email: user.email } },
        });
      }
    }

    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    const children = await this.prismaService.parentStudent.findMany({
      where: { parentId: parentProfile.id },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    const studentUserIds = children.map((c) => c.student.userId);

    const studentProfiles = await this.prismaService.studentProfile.findMany({
      where: { userId: { in: studentUserIds } },
    });
    const profileMap = new Map(studentProfiles.map((sp) => [sp.userId, sp]));
    const academicYear =
      (await this.prismaService.academicYear.findFirst({
        where: {
          schoolId: parentProfile.schoolId,
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
      })) ||
      (await this.prismaService.academicYear.findFirst({
        where: {
          schoolId: parentProfile.schoolId,
        },
        orderBy: { createdAt: 'desc' },
      }));

    const schoolSettings = await this.prismaService.schoolSetting.findFirst({
      where: { schoolId: parentProfile.schoolId, key: 'curriculum_type' },
    });
    const rawType = schoolSettings?.value || 'TERM';
    const curriculumTypeMap: Record<string, string> = {
      QUARTER: 'QUARTERLY',
      SEMESTER: 'SEMESTER',
      TERM: 'TERM',
      MONTH: 'MONTHLY',
      YEAR: 'YEARLY',
    };
    const curriculumType = curriculumTypeMap[rawType] || rawType;
    console.log(
      'Returning curriculumType:',
      curriculumType,
      'from rawType:',
      rawType,
    );

    const terms = await this.prismaService.term.findMany({
      where: academicYear
        ? { academicYearId: academicYear.id }
        : { id: 'none' },
      orderBy: { order: 'asc' },
      take: 10,
    });

    const periodLabels: Record<string, string> = {
      MONTHLY: 'Month',
      QUARTERLY: 'Quarter',
      SEMESTER: 'Semester',
      TERM: 'Term',
      YEARLY: 'Full Year',
    };
    const defaultPeriodLabel = periodLabels[curriculumType] || 'Term';
    const periodCountMap: Record<string, number> = {
      QUARTERLY: 4,
      SEMESTER: 2,
      TERM: 3,
      MONTHLY: 12,
      YEARLY: 1,
    };
    const periodCount = terms.length || periodCountMap[curriculumType] || 3;

    if (studentUserIds.length === 0) {
      return children.map((child: any) => {
        const sp = profileMap.get(child.student.userId);
        return {
          ...child,
          name: child.student.user?.name || 'Unknown',
          className: sp?.className || 'N/A',
          section: sp?.section || 'A',
          student: {
            ...child.student,
            id: child.student.userId,
          },
          curriculumType,
          periodCount,
          periodLabels: terms.map((t: any) => t.name),
          fees: {
            total: 0,
            paid: 0,
            balance: 0,
            paidPercentage: 0,
            nextDueDate: null,
            breakdown: [],
          },
        };
      });
    }

    const studentFees = academicYear
      ? await this.prismaService.studentFee.findMany({
          where: {
            studentId: { in: studentUserIds },
            academicYearId: academicYear.id,
          },
          include: {
            feeStructure: { select: { feeType: true } },
            term: { select: { name: true } },
            payments: true,
          },
        })
      : [];

    const studentClasses = await this.prismaService.studentClass.findMany({
      where: {
        studentId: { in: studentUserIds },
        ...(academicYear?.id ? { academicYear: academicYear.id } : {}),
      },
      include: {
        class: {
          select: {
            id: true,
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            ClassSubject: {
              where: {
                teacherId: { not: null },
              },
              select: {
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
                subject: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
        section: {
          select: {
            id: true,
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            classSubjects: {
              where: {
                teacherId: { not: null },
              },
              select: {
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
                subject: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const studentTeacherMap = new Map(
      studentClasses.map((studentClass) => {
        const homeroomTeacher =
          studentClass.section?.homeroomTeacher ||
          studentClass.class?.homeroomTeacher ||
          null;

        const teachingTeacherMap = new Map<string, any>();

        const assignments = [
          ...(studentClass.section?.classSubjects || []),
          ...(studentClass.class?.ClassSubject || []),
        ];

        for (const assignment of assignments) {
          const teacher = assignment.teacher;
          if (!teacher?.id) continue;

          const existing = teachingTeacherMap.get(teacher.id);
          const subjectName = assignment.subject?.name || null;

          if (existing) {
            if (
              subjectName &&
              !existing.subjects.includes(subjectName)
            ) {
              existing.subjects.push(subjectName);
            }
            continue;
          }

          teachingTeacherMap.set(teacher.id, {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            phone: teacher.phone || null,
            subjects: subjectName ? [subjectName] : [],
          });
        }

        return [
          studentClass.studentId,
          {
            homeroomTeacher: homeroomTeacher
              ? {
                  id: homeroomTeacher.id,
                  name: homeroomTeacher.name,
                  email: homeroomTeacher.email,
                  phone: homeroomTeacher.phone || null,
                }
              : null,
            teachingTeachers: Array.from(teachingTeacherMap.values()),
          },
        ];
      }),
    );

    const childrenWithFees = children.map((child: any) => {
      const studentId = child.student.userId;
      const studentFeeItems = studentFees.filter(
        (sf: any) => sf.studentId === studentId,
      );
      const teacherData = studentTeacherMap.get(studentId) || {
        homeroomTeacher: null,
        teachingTeachers: [],
      };

      const groupedByBaseFee = new Map<string, FeeBreakdown[]>();

      studentFeeItems.forEach((sf: any) => {
        let baseFeeType = sf.feeStructure?.feeType || 'TUITION';
        if (baseFeeType.includes('_INSTALLMENT_')) {
          baseFeeType = baseFeeType.replace(/_INSTALLMENT_\d+$/, '');
        } else if (baseFeeType.includes('_INSTALLMENT_')) {
          baseFeeType = baseFeeType.replace(/_INSTALLMENT_\d+$/, '');
        }

        const paidAmount =
          sf.payments?.reduce((sum: number, p: any) => sum + p.amountPaid, 0) ||
          0;
        const termFromDb = terms.find((t) => t.id === sf.termId);
        const item = {
          feeId: sf.id,
          feeType: sf.feeStructure?.feeType || 'Tuition',
          amount: sf.totalAmount || 0,
          discount: sf.discount || 0,
          finalAmount: sf.finalAmount || 0,
          paid: paidAmount,
          balance: Math.max(0, (sf.finalAmount || 0) - paidAmount),
          status: sf.status,
          termId: sf.termId,
          termName:
            termFromDb?.name || sf.term?.name || `${defaultPeriodLabel}`,
        };

        if (!groupedByBaseFee.has(baseFeeType)) {
          groupedByBaseFee.set(baseFeeType, []);
        }
        groupedByBaseFee.get(baseFeeType)?.push(item);
      });

      const breakdown: any[] = [];
      let annualTotal = 0;
      let annualPaid = 0;

      groupedByBaseFee.forEach((items, feeType) => {
        const periodItems = items.sort((a: any, b: any) => {
          const aNum = parseInt(a.termName.replace(/\D/g, '')) || 0;
          const bNum = parseInt(b.termName.replace(/\D/g, '')) || 0;
          return aNum - bNum;
        });

        const totalAmount = periodItems.reduce(
          (sum: number, item: any) => sum + item.finalAmount,
          0,
        );
        const paidAmount = periodItems.reduce(
          (sum: number, item: any) => sum + item.paid,
          0,
        );
        const balanceAmount = Math.max(0, totalAmount - paidAmount);
        const status =
          balanceAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'PENDING';

        const amountPerPeriod =
          periodCount > 0
            ? Math.round((totalAmount / periodCount) * 100) / 100
            : 0;

        annualTotal += totalAmount;
        annualPaid += paidAmount;

        breakdown.push({
          feeType: feeType + '_ANNUAL',
          periodLabel: periodLabels[curriculumType] || 'Annual',
          periodCount,
          amountPerPeriod,
          periods: periodItems,
          totalAmount,
          paidAmount,
          balanceAmount,
          status,
        });
      });

      const total = breakdown.reduce(
        (sum: number, item: any) => sum + item.totalAmount,
        0,
      );
      const paid = breakdown.reduce(
        (sum: number, item: any) => sum + item.paidAmount,
        0,
      );
      const balance = Math.max(0, total - paid);
      const paidPercentage = total > 0 ? Math.round((paid / total) * 100) : 0;

      const studentProfile = profileMap.get(child.student.userId);
      const gradeName = studentProfile?.className || null;
      const section = studentProfile?.section || 'A';

      return {
        ...child,
        name: child.student.user?.name || 'Unknown',
        className: gradeName || 'N/A',
        section: section,
        student: {
          ...child.student,
          id: child.student.userId,
        },
        homeroomTeacher: teacherData.homeroomTeacher,
        teachingTeachers: teacherData.teachingTeachers,
        curriculumType,
        periodCount,
        periodLabels: terms.map((t: any) => t.name),
        fees: {
          total,
          paid,
          balance,
          paidPercentage,
          nextDueDate: null,
          breakdown,
        },
      };
    });

    return childrenWithFees;
  }

  async getRelatedTeachersByParentUserId(
    parentUserId: string,
  ): Promise<RelatedTeacherOption[]> {
    let parentProfile = await this.prismaService.parentProfile.findUnique({
      where: { userId: parentUserId },
    });

    if (!parentProfile) {
      const user = await this.prismaService.user.findUnique({
        where: { id: parentUserId },
      });

      if (user) {
        parentProfile = await this.prismaService.parentProfile.findFirst({
          where: { user: { email: user.email } },
        });
      }
    }

    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    const children = await this.prismaService.parentStudent.findMany({
      where: { parentId: parentProfile.id },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    const studentUserIds = children.map((child) => child.student.userId);
    const studentProfiles = await this.prismaService.studentProfile.findMany({
      where: { userId: { in: studentUserIds } },
      select: {
        userId: true,
        className: true,
        section: true,
      },
    });

    const profileMap = new Map(
      studentProfiles.map((profile) => [profile.userId, profile]),
    );
    const childMap = new Map(
      children.map((child) => [
        child.student.userId,
        {
          childName: child.student.user?.name || 'Unknown',
        },
      ]),
    );
    if (studentUserIds.length === 0) {
      return [];
    }

    const activeAcademicYear =
      (await this.prismaService.academicYear.findFirst({
        where: {
          schoolId: parentProfile.schoolId,
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
      })) ||
      (await this.prismaService.academicYear.findFirst({
        where: {
          schoolId: parentProfile.schoolId,
        },
        orderBy: { createdAt: 'desc' },
      }));

    const studentClasses = await this.prismaService.studentClass.findMany({
      where: {
        studentId: { in: studentUserIds },
        schoolId: parentProfile.schoolId,
        ...(activeAcademicYear?.id
          ? { academicYear: activeAcademicYear.id }
          : {}),
      },
      include: {
        class: {
          select: {
            name: true,
            section: true,
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            ClassSubject: {
              where: { teacherId: { not: null } },
              select: {
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
                subject: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        section: {
          select: {
            name: true,
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            classSubjects: {
              where: { teacherId: { not: null } },
              select: {
                teacher: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
                subject: {
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
    });

    const options: RelatedTeacherOption[] = [];
    const studentClassMap = new Map<string, typeof studentClasses>();
    for (const studentClass of studentClasses) {
      const existing = studentClassMap.get(studentClass.studentId) || [];
      existing.push(studentClass);
      studentClassMap.set(studentClass.studentId, existing);
    }

    const pushTeacherOptions = (
      source: {
        studentId: string;
        childName: string;
        className: string | null;
        sectionName: string | null;
        classData?: {
          homeroomTeacher?: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
          } | null;
          ClassSubject?: Array<{
            teacher?: {
              id: string;
              name: string;
              email: string | null;
              phone: string | null;
            } | null;
            subject?: { name: string } | null;
          }>;
        } | null;
        sectionData?: {
          homeroomTeacher?: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
          } | null;
          classSubjects?: Array<{
            teacher?: {
              id: string;
              name: string;
              email: string | null;
              phone: string | null;
            } | null;
            subject?: { name: string } | null;
          }>;
        } | null;
      },
    ) => {
      const homeroomTeacher =
        source.sectionData?.homeroomTeacher ||
        source.classData?.homeroomTeacher ||
        null;

      if (homeroomTeacher?.id) {
        options.push({
          teacherId: homeroomTeacher.id,
          teacherName: homeroomTeacher.name,
          teacherEmail: homeroomTeacher.email,
          teacherPhone: homeroomTeacher.phone || null,
          studentId: source.studentId,
          childName: source.childName,
          className: source.className,
          section: source.sectionName,
          relationType: 'HOMEROOM',
          subjects: ['Homeroom'],
        });
      }

      const teacherMap = new Map<string, RelatedTeacherOption>();
      const teachingAssignments = [
        ...(source.sectionData?.classSubjects || []),
        ...(source.classData?.ClassSubject || []),
      ];

      for (const assignment of teachingAssignments) {
        const teacher = assignment.teacher;
        if (!teacher?.id) continue;

        const subjectName = assignment.subject?.name;
        const existing = teacherMap.get(teacher.id);

        if (existing) {
          if (subjectName && !existing.subjects.includes(subjectName)) {
            existing.subjects.push(subjectName);
          }
          continue;
        }

        teacherMap.set(teacher.id, {
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherEmail: teacher.email,
          teacherPhone: teacher.phone || null,
          studentId: source.studentId,
          childName: source.childName,
          className: source.className,
          section: source.sectionName,
          relationType: 'TEACHING',
          subjects: subjectName ? [subjectName] : [],
        });
      }

      options.push(...Array.from(teacherMap.values()));
    };

    for (const child of children) {
      const studentId = child.student.userId;
      const childInfo = childMap.get(studentId);
      const studentProfile = profileMap.get(studentId);
      const childName = childInfo?.childName || 'Unknown';
      const className = studentProfile?.className || null;
      const sectionName = studentProfile?.section || null;
      const relatedClasses = studentClassMap.get(studentId) || [];

      if (relatedClasses.length > 0) {
        for (const studentClass of relatedClasses) {
          pushTeacherOptions({
            studentId,
            childName,
            className: className || studentClass.class?.name || null,
            sectionName: sectionName || studentClass.section?.name || null,
            classData: studentClass.class,
            sectionData: studentClass.section,
          });
        }
        continue;
      }

      if (!className) {
        continue;
      }

      const possibleClassNames = [
        className,
        className.replace('Grade ', ''),
        `Grade ${className.replace('Grade ', '')}`,
      ].filter((value, index, array) => array.indexOf(value) === index);

      const fallbackClass = await this.prismaService.class.findFirst({
        where: {
          schoolId: parentProfile.schoolId,
          ...(activeAcademicYear?.id
            ? { academicYearId: activeAcademicYear.id }
            : {}),
          name: { in: possibleClassNames },
        },
        select: {
          id: true,
          name: true,
          homeroomTeacher: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          ClassSubject: {
            where: { teacherId: { not: null } },
            select: {
              teacher: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              subject: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      const fallbackSection =
        fallbackClass && sectionName
          ? await this.prismaService.section.findFirst({
              where: {
                classId: fallbackClass.id,
                name: sectionName,
              },
              select: {
                name: true,
                homeroomTeacher: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
                classSubjects: {
                  where: { teacherId: { not: null } },
                  select: {
                    teacher: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                      },
                    },
                    subject: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            })
          : null;

      pushTeacherOptions({
        studentId,
        childName,
        className,
        sectionName,
        classData: fallbackClass,
        sectionData: fallbackSection,
      });
    }
    return options;
  }

  async getChildByIdForParent(parentUserId: string, childId: string) {
    let parentProfile = await this.prismaService.parentProfile.findUnique({
      where: { userId: parentUserId },
    });

    if (!parentProfile) {
      const user = await this.prismaService.user.findUnique({
        where: { id: parentUserId },
      });

      if (user) {
        parentProfile = await this.prismaService.parentProfile.findFirst({
          where: { user: { email: user.email } },
        });
      }
    }

    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    const parentStudent = await this.prismaService.parentStudent.findFirst({
      where: { parentId: parentProfile.id, studentId: childId },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!parentStudent) {
      throw new NotFoundException('Child not linked to this parent');
    }

    return parentStudent;
  }

  async deleteParent(parentId: string, schoolId: string) {
    const parent = await this.prismaService.parentProfile.findFirst({
      where: { id: parentId, schoolId },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    await this.prismaService.user.update({
      where: { id: parent.userId },
      data: { isActive: false },
    });

    return this.prismaService.parentProfile.update({
      where: { id: parentId },
      data: {},
    });
  }
}
