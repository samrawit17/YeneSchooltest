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
  email?: string;
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

    const credentials = await this.credentialService.generateStaffCredentials(
      schoolId,
      Role.PARENT,
    );

    const result = await this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          username: credentials.username,
          name,
          phone,
          password: credentials.hashedPassword,
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

    return {
      ...result,
      credentials: {
        username: credentials.username,
        temporaryPassword: credentials.temporaryPassword,
      },
    };
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

    const credentials = await this.credentialService.generateStaffCredentials(
      schoolId,
      Role.PARENT,
    );

    const result = await this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          username: credentials.username,
          name,
          phone,
          password: credentials.hashedPassword,
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

    return {
      ...result,
      credentials: {
        username: credentials.username,
        temporaryPassword: credentials.temporaryPassword,
      },
    };
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
    options: {
      search?: string;
      page?: number;
      limit?: number;
      status?: string;
      children?: string;
    },
  ) {
    return this.listParents(schoolId, options);
  }

  async listParents(
    schoolId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
      status?: string;
      children?: string;
    },
  ) {
    const { search, page = 1, limit = 20, status, children } = options;
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const trimmedSearch = search?.trim();
    const normalizedStatus = status?.toLowerCase();
    const normalizedChildren = children?.toLowerCase();
    const where: any = { schoolId };
    const andFilters: any[] = [];

    if (trimmedSearch) {
      andFilters.push({
        OR: [
          { user: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
          { user: { email: { contains: trimmedSearch, mode: 'insensitive' } } },
          { user: { phone: { contains: trimmedSearch, mode: 'insensitive' } } },
        ],
      });
    }

    if (normalizedStatus === 'active') {
      andFilters.push({ user: { isActive: true } });
    } else if (normalizedStatus === 'inactive') {
      andFilters.push({ user: { isActive: false } });
    }

    if (normalizedChildren === 'with children') {
      andFilters.push({ children: { some: {} } });
    } else if (normalizedChildren === 'without children') {
      andFilters.push({ children: { none: {} } });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const skip = (safePage - 1) * safeLimit;

    const total = await this.prismaService.parentProfile.count({ where });
    const parents = await this.prismaService.parentProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
          },
        },
        children: {
          include: {
            student: {
              select: {
                user: {
                  select: { id: true, name: true },
                },
                studentCode: true,
                className: true,
                section: true,
              },
            },
          },
        },
      },
      skip,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      total,
      data: parents,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async getParentById(parentId: string, schoolId: string) {
    const parent = await this.prismaService.parentProfile.findFirst({
      where: {
        schoolId,
        OR: [{ id: parentId }, { userId: parentId }],
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, username: true, phone: true, avatarUrl: true, lastLoginAt: true, isActive: true },
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

  async getParentByUserId(userId: string, schoolId: string) {
    const parent = await this.prismaService.parentProfile.findFirst({
      where: { userId, schoolId },
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

    const userUpdateData: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) {
      userUpdateData.name = data.name;
    }
    if (data.email !== undefined) {
      userUpdateData.email = data.email;
    }
    if (data.phone !== undefined) {
      userUpdateData.phone = data.phone;
    }

    if (Object.keys(userUpdateData).length > 0) {
      await this.prismaService.user.update({
        where: { id: parent.userId },
        data: userUpdateData,
      });
    }

    await this.prismaService.parentProfile.update({
      where: { id: parentId },
      data: {
        address: data.address,
        phone: data.phone,
        occupation: data.occupation,
      },
    });

    return this.getParentById(parentId, schoolId);
  }

  async getChildrenByParentUserId(parentUserId: string, schoolId: string) {
    let parentProfile = await this.prismaService.parentProfile.findFirst({
      where: { userId: parentUserId, schoolId },
    });

    if (!parentProfile) {
      const user = await this.prismaService.user.findUnique({
        where: { id: parentUserId },
      });

      if (user) {
        parentProfile = await this.prismaService.parentProfile.findFirst({
          where: { schoolId, user: { email: user.email } },
        });
      }
    }

    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    const parentUser = await this.prismaService.user.findUnique({
      where: { id: parentProfile.userId },
      select: { id: true, name: true, email: true, phone: true },
    });

    const children = await this.prismaService.parentStudent.findMany({
      where: {
        parentId: parentProfile.id,
        student: { schoolId },
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    const studentUserIds = children.map((c) => c.student.userId);

    const studentProfiles = await this.prismaService.studentProfile.findMany({
      where: { schoolId, userId: { in: studentUserIds } },
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

    const schoolSettings = await this.prismaService.schoolSetting.findMany({
      where: {
        schoolId: parentProfile.schoolId,
        key: { in: ['fee_structure_mode', 'curriculum_type'] },
      },
      select: { key: true, value: true },
    });
    const feeStructureMode = schoolSettings.find(
      (setting) => setting.key === 'fee_structure_mode',
    );
    const academicCurriculumType = schoolSettings.find(
      (setting) => setting.key === 'curriculum_type',
    );
    const rawType =
      feeStructureMode?.value || academicCurriculumType?.value || 'TERM';
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
          photoUrl: child.student.user?.avatarUrl || null,
          avatarUrl: child.student.user?.avatarUrl || null,
          className: sp?.className || 'N/A',
          section: sp?.section || 'A',
          student: {
            ...child.student,
            id: child.student.userId,
          },
          parentName: parentUser?.name || null,
          parent: {
            id: parentProfile.id,
            userId: parentProfile.userId,
            relation: child.relation,
            user: parentUser,
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
            schoolId,
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
        schoolId,
        ...(academicYear
          ? { academicYear: { in: [academicYear.id, academicYear.name] } }
          : {}),
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
            classId: studentClass.classId,
            sectionId: studentClass.sectionId,
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

    const promotionRecords = await this.prismaService.promotionRecord.findMany({
      where: { studentId: { in: studentUserIds }, schoolId },
      include: { toClass: { select: { name: true } } },
    });
    const promotedStudentIds = new Set(promotionRecords.map((pr) => pr.studentId));
    const promotedToGradeMap = new Map(
      promotionRecords.map((pr) => [pr.studentId, pr.toClass?.name || null]),
    );
    const promotedAtMap = new Map(
      promotionRecords.map((pr) => [pr.studentId, pr.promotedAt]),
    );

    const childrenWithFees = await Promise.all(children.map(async (child: any) => {
      const studentId = child.student.userId;
      const studentFeeItems = studentFees.filter(
        (sf: any) => sf.studentId === studentId,
      );
      let teacherData: {
        classId?: string | null;
        sectionId?: string | null;
        homeroomTeacher: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
        } | null;
        teachingTeachers: any[];
      } = studentTeacherMap.get(studentId) || {
        classId: null,
        sectionId: null,
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
      let classId = teacherData.classId || null;
      let sectionId = teacherData.sectionId || null;

      if (!teacherData.homeroomTeacher && gradeName) {
        const possibleClassNames = [
          gradeName,
          gradeName.replace('Grade ', ''),
          `Grade ${gradeName.replace('Grade ', '')}`,
        ].filter((value, index, array) => array.indexOf(value) === index);

        const fallbackClass = await this.prismaService.class.findFirst({
          where: {
            schoolId: parentProfile.schoolId,
            ...(academicYear?.id ? { academicYearId: academicYear.id } : {}),
            name: { in: possibleClassNames },
          },
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
                ...(academicYear?.id ? { academicYear: academicYear.id } : {}),
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
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        });

        const fallbackSection =
          fallbackClass && section
            ? await this.prismaService.section.findFirst({
                where: {
                  classId: fallbackClass.id,
                  name: section,
                },
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
                          name: true,
                          code: true,
                        },
                      },
                    },
                  },
                },
              })
            : null;

        const fallbackTeacher =
          fallbackSection?.homeroomTeacher ||
          fallbackClass?.homeroomTeacher ||
          null;

        classId = classId || fallbackClass?.id || null;
        sectionId = sectionId || fallbackSection?.id || null;

        if (fallbackTeacher) {
          teacherData = {
            ...teacherData,
            homeroomTeacher: {
              id: fallbackTeacher.id,
              name: fallbackTeacher.name,
              email: fallbackTeacher.email,
              phone: fallbackTeacher.phone || null,
            },
          };
        }

        if (teacherData.teachingTeachers.length === 0) {
          const fallbackAssignments = [
            ...(fallbackSection?.classSubjects || []),
            ...(fallbackClass?.ClassSubject || []),
          ];
          const teachingTeacherMap = new Map<string, any>();

          for (const assignment of fallbackAssignments) {
            const teacher = assignment.teacher;
            if (!teacher?.id) continue;

            const subjectName = assignment.subject?.name || null;
            const existing = teachingTeacherMap.get(teacher.id);

            if (existing) {
              if (subjectName && !existing.subjects.includes(subjectName)) {
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

          teacherData = {
            ...teacherData,
            teachingTeachers: Array.from(teachingTeacherMap.values()),
          };
        }
      }

      let bloodGroup: string | null = null;
      if (studentProfile?.medicalInfo) {
        try {
          const medicalInfo = JSON.parse(studentProfile.medicalInfo);
          bloodGroup =
            medicalInfo?.bloodGroup || medicalInfo?.blood_group || null;
        } catch {
          bloodGroup = null;
        }
      }

      return {
        ...child,
        isPromoted: promotedStudentIds.has(child.student.userId),
        promotedToGrade: promotedToGradeMap.get(child.student.userId) || null,
        promotedAt: promotedAtMap.get(child.student.userId)?.toISOString() || null,
        name: child.student.user?.name || 'Unknown',
        photoUrl: child.student.user?.avatarUrl || null,
        avatarUrl: child.student.user?.avatarUrl || null,
        classId,
        sectionId,
        className: gradeName || 'N/A',
        section: section,
        studentCode: studentProfile?.studentCode || undefined,
        dateOfBirth: null,
        gender: studentProfile?.gender || null,
        bloodGroup,
        address: studentProfile?.address || null,
        phone: studentProfile?.phone || null,
        email: child.student.user?.email || null,
        admissionDate: studentProfile?.createdAt || null,
        academicYear: studentProfile?.academicYear || null,
        enrollmentStatus: studentProfile?.enrollmentStatus || null,
        student: {
          ...child.student,
          id: child.student.userId,
        },
        parentName: parentUser?.name || null,
        parent: {
          id: parentProfile.id,
          userId: parentProfile.userId,
          relation: child.relation,
          user: parentUser,
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
    }));

    return childrenWithFees;
  }

  async getRelatedTeachersByParentUserId(
    parentUserId: string,
    schoolId: string,
  ): Promise<RelatedTeacherOption[]> {
    let parentProfile = await this.prismaService.parentProfile.findFirst({
      where: { userId: parentUserId, schoolId },
    });

    if (!parentProfile) {
      const user = await this.prismaService.user.findUnique({
        where: { id: parentUserId },
      });

      if (user) {
        parentProfile = await this.prismaService.parentProfile.findFirst({
          where: { schoolId, user: { email: user.email } },
        });
      }
    }

    if (!parentProfile) {
      throw new NotFoundException('Parent profile not found');
    }

    const children = await this.prismaService.parentStudent.findMany({
      where: {
        parentId: parentProfile.id,
        student: { schoolId },
      },
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
      where: { schoolId, userId: { in: studentUserIds } },
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
        ...(activeAcademicYear
          ? {
              academicYear: {
                in: [activeAcademicYear.id, activeAcademicYear.name],
              },
            }
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

    const timetableSlots =
      studentClasses.length > 0
        ? await this.prismaService.timetableSlot.findMany({
            where: {
              schoolId: parentProfile.schoolId,
              teacherId: { not: null },
              OR: studentClasses.map((studentClass) => ({
                classId: studentClass.classId,
                sectionId: studentClass.sectionId,
              })),
              ...(activeAcademicYear?.id
                ? { academicYearId: activeAcademicYear.id }
                : {}),
            },
            select: {
              classId: true,
              sectionId: true,
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
          })
        : [];
    const timetableSlotsByClassSection = new Map<
      string,
      typeof timetableSlots
    >();

    for (const slot of timetableSlots) {
      const key = `${slot.classId}:${slot.sectionId}`;
      const existing = timetableSlotsByClassSection.get(key) || [];
      existing.push(slot);
      timetableSlotsByClassSection.set(key, existing);
    }

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
        timetableSlots?: Array<{
          teacher?: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
          } | null;
          subject?: { name: string } | null;
        }>;
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
        ...(source.timetableSlots || []),
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
            timetableSlots:
              timetableSlotsByClassSection.get(
                `${studentClass.classId}:${studentClass.sectionId}`,
              ) || [],
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
      const fallbackTimetableSlots = fallbackClass
        ? await this.prismaService.timetableSlot.findMany({
            where: {
              schoolId: parentProfile.schoolId,
              classId: fallbackClass.id,
              teacherId: { not: null },
              ...(fallbackSection?.id ? { sectionId: fallbackSection.id } : {}),
              ...(activeAcademicYear?.id
                ? { academicYearId: activeAcademicYear.id }
                : {}),
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
                  name: true,
                },
              },
            },
          })
        : [];

      pushTeacherOptions({
        studentId,
        childName,
        className,
        sectionName,
        classData: fallbackClass,
        sectionData: fallbackSection,
        timetableSlots: fallbackTimetableSlots,
      });
    }
    return options;
  }

  async getChildByIdForParent(
    parentUserId: string,
    childId: string,
    schoolId: string,
  ) {
    const children = await this.getChildrenByParentUserId(
      parentUserId,
      schoolId,
    );

    const child = children.find(
      (item: any) =>
        item.studentId === childId ||
        item.id === childId ||
        item.student?.id === childId ||
        item.student?.userId === childId ||
        item.userId === childId,
    );

    if (!child) {
      throw new NotFoundException('Child not linked to this parent');
    }

    return child;
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
