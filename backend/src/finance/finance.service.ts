import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Prisma } from '@prisma/client';
import { Role } from '../auth/types/role.enum';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  NotificationService,
  NotificationType,
} from '../notification/notification.service';
import {
  CreateFeeStructureDto,
  UpdateFeeStructureDto,
  GenerateStudentFeesDto,
  StudentFeesQueryDto,
  RecordPaymentDto,
  ReportQueryDto,
  CalculateInstallmentFeesDto,
  GenerateInstallmentFeesDto,
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async assertStudentFeeSummaryAccess(
    user: { id?: string; role?: string; schoolId?: string } | undefined,
    schoolId: string,
    studentId: string,
  ) {
    if (!user?.id) {
      throw new ForbiddenException('Authentication required');
    }

    const normalizedUserRole = String(user.role || '').trim().toUpperCase();
    const elevatedRoles = new Set([
      Role.ADMIN,
      Role.IT_MANAGER,
      Role.FINANCE,
      Role.REGISTRAR,
      Role.SUPER_ADMIN,
    ]);
    if (normalizedUserRole && elevatedRoles.has(normalizedUserRole as Role)) {
      return;
    }

    if (normalizedUserRole === Role.STUDENT) {
      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: {
          schoolId,
          OR: [{ id: studentId }, { userId: studentId }, { userId: user.id }],
        },
        select: { id: true, userId: true },
      });

      if (
        studentProfile &&
        (studentProfile.id === studentId ||
          studentProfile.userId === studentId ||
          studentProfile.userId === user.id)
      ) {
        return;
      }

      throw new ForbiddenException(
        'You can only view your own fee summary',
      );
    }

    if (normalizedUserRole === Role.PARENT) {
      const parentProfile = await this.prisma.parentProfile.findFirst({
        where: {
          schoolId,
          OR: [{ id: user.id }, { userId: user.id }],
        },
        select: { id: true, userId: true },
      });
      if (!parentProfile) {
        throw new ForbiddenException('Parent profile not found');
      }

      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: { schoolId, OR: [{ id: studentId }, { userId: studentId }] },
        select: { id: true, userId: true },
      });
      if (!studentProfile) {
        throw new ForbiddenException('Student not found');
      }

      const possibleParentIds = [
        parentProfile.id,
        parentProfile.userId,
        user.id,
      ].filter((value): value is string => Boolean(value));
      const possibleStudentIds = [
        studentProfile.id,
        studentProfile.userId,
        studentId,
      ].filter((value): value is string => Boolean(value));

      const link = await this.prisma.parentStudent.findFirst({
        where: {
          schoolId,
          parentId: { in: possibleParentIds },
          studentId: { in: possibleStudentIds },
        },
        select: { studentId: true },
      });

      if (link) return;

      throw new ForbiddenException(
        'You can only view your linked children fee summaries',
      );
    }

    throw new ForbiddenException('You are not allowed to view this fee summary');
  }

  private async formatPaymentsWithStudentContext(
    payments: Array<{
      id: string;
      receiptNumber: string;
      studentId: string;
      paymentMethod: string;
      amountPaid: number;
      receivedById: string | null;
      paymentDate: Date;
      notes: string | null;
      termId?: string | null;
      term?: { id: string; name: string } | null;
      studentFee?: {
        academicYearId?: string | null;
        termId?: string | null;
        term?: { id: string; name: string } | null;
        feeStructure?: { feeType?: string | null } | null;
      } | null;
    }>,
  ) {
    if (payments.length === 0) return [];

    const rawStudentIds = [...new Set(payments.map((p) => p.studentId).filter(Boolean))];

    const students = await this.prisma.studentProfile.findMany({
      where: {
        OR: [{ id: { in: rawStudentIds } }, { userId: { in: rawStudentIds } }],
      },
      include: { user: { select: { name: true } } },
    });

    const studentByAnyId = new Map<
      string,
      { profileId: string; userId: string | null; name: string }
    >();
    students.forEach((student) => {
      const payload = {
        profileId: student.id,
        userId: student.userId,
        name: student.user?.name || 'N/A',
      };
      studentByAnyId.set(student.id, payload);
      if (student.userId) {
        studentByAnyId.set(student.userId, payload);
      }
    });

    const academicYearIds = [
      ...new Set(
        payments
          .map((payment) => payment.studentFee?.academicYearId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const academicYears = academicYearIds.length
      ? await this.prisma.academicYear.findMany({
          where: { id: { in: academicYearIds } },
          select: { id: true, name: true },
        })
      : [];

    const academicYearNameById = new Map(
      academicYears.map((academicYear) => [academicYear.id, academicYear.name]),
    );

    const studentRosterIds = [
      ...new Set(
        students.flatMap((student) =>
          [student.id, student.userId].filter(
            (value): value is string => Boolean(value),
          ),
        ),
      ),
    ];
    const academicYearNames = [...new Set(academicYears.map((year) => year.name))];

    const studentClasses =
      studentRosterIds.length > 0 && academicYearNames.length > 0
        ? await this.prisma.studentClass.findMany({
            where: {
              studentId: { in: studentRosterIds },
              academicYear: { in: academicYearNames },
            },
            include: {
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          })
        : [];

    const classByProfileAndYear = new Map<
      string,
      { grade: string | null; section: string | null }
    >();
    studentClasses.forEach((studentClass) => {
      classByProfileAndYear.set(
        `${studentClass.studentId}:${studentClass.academicYear}`,
        {
          grade: studentClass.class?.name || null,
          section: studentClass.section?.name || null,
        },
      );
    });

    return payments.map((payment) => {
      const student = studentByAnyId.get(payment.studentId);
      const academicYearName = payment.studentFee?.academicYearId
        ? academicYearNameById.get(payment.studentFee.academicYearId) || null
        : null;
      const classInfo = student && academicYearName
        ? classByProfileAndYear.get(`${student.profileId}:${academicYearName}`) ||
          (student.userId
            ? classByProfileAndYear.get(`${student.userId}:${academicYearName}`)
            : null)
        : null;

      return {
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        studentName: student?.name || 'N/A',
        studentId: payment.studentId,
        className: classInfo?.grade || 'N/A',
        grade: classInfo?.grade || 'N/A',
        section: classInfo?.section || 'N/A',
        paymentMethod: payment.paymentMethod,
        amountPaid: payment.amountPaid,
        recordedBy: payment.receivedById,
        paymentDate: payment.paymentDate.toISOString(),
        notes: payment.notes,
        termId:
          payment.termId ||
          payment.term?.id ||
          payment.studentFee?.termId ||
          payment.studentFee?.term?.id ||
          null,
        termName:
          payment.term?.name ||
          payment.studentFee?.term?.name ||
          null,
        feeType: payment.studentFee?.feeStructure?.feeType || null,
      };
    });
  }

  // ========================================================
  // INTELLIGENT FEE CALCULATION HELPER METHODS
  // ========================================================

  private async getFeeCollectionModeInternal(
    schoolId: string,
  ): Promise<string> {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'curriculum_type' } },
    });
    return setting?.value || 'TERM';
  }

  private getInstallmentCountInternal(feeCollectionMode: string): number {
    const modeMap: Record<string, number> = {
      QUARTER: 4,
      QUARTERLY: 4,
      SEMESTER: 2,
      SEMESTERLY: 2,
      TERM: 3,
      TERMLY: 3,
      MONTH: 12,
      MONTHLY: 12,
      YEARLY: 1,
      YEAR: 1,
    };
    return modeMap[feeCollectionMode] || 3;
  }

  private calculateInstallmentAmountInternal(
    annualAmount: number,
    feeCollectionMode: string,
  ): number {
    const count = this.getInstallmentCountInternal(feeCollectionMode);
    return Math.round((annualAmount / count) * 100) / 100;
  }

  private calculateRemainderInternal(
    annualAmount: number,
    feeCollectionMode: string,
  ): number {
    const count = this.getInstallmentCountInternal(feeCollectionMode);
    const installmentAmount = Math.floor((annualAmount / count) * 100) / 100;
    return Math.round((annualAmount - installmentAmount * count) * 100) / 100;
  }

  private async getTermsForAcademicYear(
    academicYearId: string,
  ): Promise<any[]> {
    return this.prisma.term.findMany({
      where: { academicYearId },
      orderBy: { order: 'asc' },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyParentsForStartingCurriculumPeriods() {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const startingTerms = await this.prisma.term.findMany({
      where: {
        startDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        academicYear: {
          select: {
            id: true,
            schoolId: true,
            name: true,
          },
        },
      },
    });

    for (const term of startingTerms) {
      try {
        await this.notifyParentsForTermFeeDue(term);
      } catch (error: any) {
        this.logger.error(
          `Failed to send fee reminders for ${term.name}: ${error?.message || error}`,
        );
      }
    }
  }

  async sendPeriodFeeReminders(schoolId: string, termId: string) {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, academicYear: { schoolId } },
      include: {
        academicYear: {
          select: {
            id: true,
            schoolId: true,
            name: true,
          },
        },
      },
    });

    if (!term) {
      throw new Error('Selected curriculum period was not found for this school');
    }

    const sent = await this.notifyParentsForTermFeeDue(term, true);
    return { sent, termName: term.name };
  }

  private async notifyParentsForTermFeeDue(term: {
    id: string;
    name: string;
    academicYearId: string;
    academicYear: { id: string; schoolId: string; name: string };
  }, force = false) {
    const schoolId = term.academicYear.schoolId;
    const curriculumType = await this.getFeeCollectionModeInternal(schoolId);
    const installmentCount = this.getInstallmentCountInternal(curriculumType);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    let sent = 0;

    const fees = await this.prisma.studentFee.findMany({
      where: {
        schoolId,
        academicYearId: term.academicYearId,
        OR: [{ termId: term.id }, { termId: null }],
      },
      include: {
        payments: true,
        feeStructure: { select: { feeType: true } },
        student: { select: { id: true, name: true } },
      },
    });

    for (const fee of fees) {
      const expectedForPeriod = fee.termId
        ? fee.finalAmount
        : Math.round((fee.finalAmount / Math.max(installmentCount, 1)) * 100) /
          100;
      const paidForPeriod = fee.termId
        ? fee.payments.reduce((sum, payment) => sum + payment.amountPaid, 0)
        : fee.payments
            .filter((payment) => payment.termId === term.id)
            .reduce((sum, payment) => sum + payment.amountPaid, 0);
      const balance = Math.max(0, expectedForPeriod - paidForPeriod);

      if (balance <= 0) continue;

      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: {
          schoolId,
          OR: [{ id: fee.studentId }, { userId: fee.studentId }],
        },
        select: {
          id: true,
          user: { select: { name: true } },
          parents: {
            select: {
              parent: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      const parentUserIds = [
        ...new Set(
          (studentProfile?.parents || [])
            .map((link) => link.parent.userId)
            .filter((value): value is string => Boolean(value)),
        ),
      ];

      for (const parentUserId of parentUserIds) {
        const alreadyNotified = await this.prisma.notification.findFirst({
          where: {
            schoolId,
            userId: parentUserId,
            type: NotificationType.FEE_DUE,
            createdAt: { gte: startOfToday },
            metadata: {
              contains: `"termId":"${term.id}"`,
            },
          },
          select: { id: true },
        });

        if (!force && alreadyNotified) continue;

        await this.notificationService.createNotification({
          schoolId,
          userId: parentUserId,
          title: `${term.name} fee payment due`,
          message: `Please pay ${this.formatBirr(balance)} for ${studentProfile?.user?.name || fee.student?.name || 'your child'} for ${term.name}.`,
          type: NotificationType.FEE_DUE,
          actionUrl: '/parent/fees',
          metadata: {
            termId: term.id,
            termName: term.name,
            academicYearId: term.academicYearId,
            studentId: studentProfile?.id || fee.studentId,
            feeType: fee.feeStructure.feeType,
            amountDue: balance,
          },
        });
        sent += 1;
      }
    }

    return sent;
  }

  private formatBirr(amount: number) {
    return `Brr ${amount.toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })}`;
  }

  // ========================================================
  // PUBLIC FEE CALCULATION METHODS
  // ========================================================

  async calculateInstallmentFees(dto: CalculateInstallmentFeesDto) {
    const feeCollectionMode = await this.getFeeCollectionModeInternal(
      dto.schoolId,
    );
    const installmentCount =
      this.getInstallmentCountInternal(feeCollectionMode);
    const installmentAmount = this.calculateInstallmentAmountInternal(
      dto.annualAmount,
      feeCollectionMode,
    );
    const remainder = this.calculateRemainderInternal(
      dto.annualAmount,
      feeCollectionMode,
    );

    const terms = await this.getTermsForAcademicYear(dto.academicYearId);

    const modeLabels: Record<string, string> = {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      SEMESTER: 'Semester',
      TERM: 'Term',
      YEARLY: 'Full Year',
    };

    return {
      mode: feeCollectionMode,
      modeLabel: modeLabels[feeCollectionMode] || feeCollectionMode,
      installmentCount,
      installmentAmount,
      remainder,
      annualAmount: dto.annualAmount,
      totalWithRemainder:
        Math.round((dto.annualAmount + remainder) * 100) / 100,
      description: `Annual tuition of ${dto.annualAmount} split into ${installmentCount} ${modeLabels[feeCollectionMode] || 'installments'}`,
      suggestedTermDistribution: terms
        .slice(0, installmentCount)
        .map((term, index) => ({
          termName: term?.name || `${index + 1}`,
          termId: term?.id,
          amount:
            index === installmentCount - 1 && remainder !== 0
              ? Math.round((installmentAmount + remainder) * 100) / 100
              : installmentAmount,
        })),
    };
  }

  async generateInstallmentFees(dto: GenerateInstallmentFeesDto) {
    const feeCollectionMode = await this.getFeeCollectionModeInternal(
      dto.schoolId,
    );
    const installmentCount =
      this.getInstallmentCountInternal(feeCollectionMode);
    const terms = await this.getTermsForAcademicYear(dto.academicYearId);

    const existingStructures = await this.prisma.feeStructure.findMany({
      where: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        feeType: dto.feeType || 'TUITION',
        ...(dto.grade ? { grade: dto.grade } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingStructures.length === 0) {
      return {
        created: 0,
        message:
          'No base fee structure found. Create an annual fee structure first.',
      };
    }

    const baseStructure = existingStructures[0];
    const annualAmount = baseStructure.amount;
    const baseAmount = this.calculateInstallmentAmountInternal(
      annualAmount,
      feeCollectionMode,
    );
    const remainder = this.calculateRemainderInternal(
      annualAmount,
      feeCollectionMode,
    );

    const amounts: number[] = [];
    for (let i = 0; i < installmentCount; i++) {
      if (i === installmentCount - 1 && remainder !== 0) {
        amounts.push(Math.round((baseAmount + remainder) * 100) / 100);
      } else {
        amounts.push(baseAmount);
      }
    }

    let created = 0;
    await this.prisma.$transaction(async (tx) => {
      const modeLabels: Record<string, string> = {
        MONTHLY: 'Month',
        QUARTERLY: 'Quarter',
        SEMESTER: 'Semester',
        TERM: 'Term',
        YEARLY: 'Full Year',
      };

      for (let i = 0; i < installmentCount; i++) {
        const installmentTermId = terms[i]?.id;
        const existingInstallment = await tx.feeStructure.findFirst({
          where: {
            schoolId: dto.schoolId,
            academicYearId: dto.academicYearId,
            feeType: `${dto.feeType || 'TUITION'}_INSTALLMENT_${i + 1}`,
            ...(dto.grade ? { grade: dto.grade } : {}),
          },
        });

        if (!existingInstallment) {
          await tx.feeStructure.create({
            data: {
              schoolId: dto.schoolId,
              academicYearId: dto.academicYearId,
              termId: installmentTermId || null,
              feeType: `${dto.feeType || 'TUITION'}_INSTALLMENT_${i + 1}`,
              amount: amounts[i],
              grade: dto.grade ?? null,
              description: `${modeLabels[feeCollectionMode]} ${i + 1} of ${installmentCount} for ${dto.feeType || 'Tuition'}`,
              isActive: true,
            },
          });
          created++;
        }
      }
    });

    return {
      created,
      message: `Generated ${created} installment fee structures`,
      breakdown: amounts.map((amount, index) => ({
        installment: index + 1,
        amount,
      })),
    };
  }

  async getFeeCollectionMode(schoolId: string): Promise<string> {
    return this.getFeeCollectionModeInternal(schoolId);
  }

  async getInstallmentCount(feeCollectionMode: string): Promise<number> {
    return this.getInstallmentCountInternal(feeCollectionMode);
  }

  // ========================================================
  // EXISTING FEE STRUCTURE METHODS
  // ========================================================

  async createFeeStructure(dto: CreateFeeStructureDto) {
    return this.prisma.feeStructure.create({
      data: {
        schoolId: dto.schoolId,
        academicYearId: dto.academicYearId,
        termId: dto.termId ?? null,
        feeType: dto.feeType,
        amount: dto.amount,
        grade: dto.grade ?? null,
        semester: dto.semester ?? null,
        description: dto.description ?? null,
        isActive: true,
      },
    });
  }

  async listFeeStructures(
    schoolId: string,
    academicYearId?: string,
    termId?: string,
  ) {
    return this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
        ...(termId && termId !== 'all'
          ? { OR: [{ termId }, { termId: null }] }
          : {}),
      },
      include: { term: { select: { id: true, name: true, order: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateFeeStructure(
    id: string,
    schoolId: string,
    dto: UpdateFeeStructureDto,
  ) {
    const fs = await this.prisma.feeStructure.findUnique({ where: { id } });
    if (!fs || fs.schoolId !== schoolId)
      throw new Error('Fee structure not found for this school');
    return this.prisma.feeStructure.update({
      where: { id },
      data: {
        feeType: dto.feeType ?? fs.feeType,
        amount: dto.amount ?? fs.amount,
        grade: dto.grade === undefined ? fs.grade : dto.grade,
        semester: dto.semester === undefined ? fs.semester : dto.semester,
        description:
          dto.description === undefined ? fs.description : dto.description,
        isActive: dto.isActive === undefined ? fs.isActive : dto.isActive,
      },
    });
  }

  async deleteFeeStructure(id: string, schoolId: string) {
    const fs = await this.prisma.feeStructure.findUnique({ where: { id } });
    if (!fs || fs.schoolId !== schoolId)
      throw new Error('Fee structure not found for this school');
    return this.prisma.feeStructure.delete({ where: { id } });
  }

  // ========================================================
  // STUDENT FEES METHODS
  // ========================================================

  async generateStudentFees(dto: GenerateStudentFeesDto) {
    const ay = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!ay) throw new Error('Academic year not found');

    const feeStructuresWhere: any = {
      schoolId: dto.schoolId,
      academicYearId: dto.academicYearId,
      isActive: true,
      ...(dto.grade ? { OR: [{ grade: dto.grade }, { grade: null }] } : {}),
    };
    if (dto.termId) feeStructuresWhere.termId = dto.termId;

    const feeStructures = await this.prisma.feeStructure.findMany({
      where: feeStructuresWhere,
    });
    if (feeStructures.length === 0) return { created: 0 };

    // Get all approved students for this school (get userId since that's what StudentFee expects)
    const students = await this.prisma.studentProfile.findMany({
      where: { schoolId: dto.schoolId, enrollmentStatus: 'APPROVED' },
      select: { userId: true },
    });
    const studentIds = students.map((s) => s.userId).filter(Boolean);
    if (studentIds.length === 0) return { created: 0 };

    let created = 0;
    let skipped = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const fs of feeStructures) {
        for (const studentId of studentIds) {
          // Check if fee already exists for this student and fee structure
          const exists = await tx.studentFee.findFirst({
            where: { studentId, feeStructureId: fs.id },
            select: { id: true },
          });
          if (exists) {
            skipped++;
            continue;
          }

          await tx.studentFee.create({
            data: {
              schoolId: dto.schoolId,
              studentId,
              feeStructureId: fs.id,
              academicYearId: dto.academicYearId,
              termId: fs.termId || undefined,
              totalAmount: fs.amount,
              discount: 0,
              finalAmount: fs.amount,
              status: PaymentStatus.PENDING,
            },
          });
          created++;
        }
      }
    });
    console.log('Generated student fees:', created, 'skipped:', skipped);
    return { created };
  }

  async getStudentFees(query: StudentFeesQueryDto) {
    const {
      schoolId,
      academicYearId,
      termId,
      grade,
      sectionId,
      status,
      page = 1,
      limit = 20,
      studentId,
    } = query;
    const skip = (page - 1) * limit;
    const whereBase: any = { schoolId };
    if (status) whereBase.status = status as PaymentStatus;
    if (studentId) whereBase.studentId = studentId;
    if (academicYearId) whereBase.academicYearId = academicYearId;
    if (termId) whereBase.termId = termId;

    if (grade !== undefined || sectionId) {
      if (academicYearId) {
        const ay = await this.prisma.academicYear.findUnique({
          where: { id: academicYearId },
        });
        if (ay) {
          const scWhere: any = { schoolId, academicYear: ay.name };
          if (grade !== undefined) scWhere.class = { grade };
          if (sectionId) scWhere.sectionId = sectionId;
          const studentClasses = await this.prisma.studentClass.findMany({
            where: scWhere,
            select: { studentId: true },
          });
          const ids = Array.from(
            new Set(studentClasses.map((x) => x.studentId)),
          );
          if (ids.length > 0) whereBase.studentId = { in: ids };
        }
      }
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.studentFee.count({ where: whereBase }),
      this.prisma.studentFee.findMany({
        where: whereBase,
        include: {
          student: { select: { id: true, name: true } },
          feeStructure: {
            include: { term: { select: { id: true, name: true } } },
          },
          term: { select: { id: true, name: true } },
          payments: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const data = rows.map((sf) => {
      const paid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const remaining = Math.max(0, sf.finalAmount - paid);
      return {
        id: sf.id,
        studentId: sf.studentId,
        studentName: sf.student?.name,
        feeType: sf.feeStructure.feeType,
        totalFee: sf.totalAmount,
        discount: sf.discount,
        finalAmount: sf.finalAmount,
        paidAmount: paid,
        remainingBalance: remaining,
        status: sf.status,
        academicYearId: sf.academicYearId,
        termName: sf.term?.name || sf.feeStructure.term?.name || null,
        updatedAt: sf.updatedAt,
      };
    });

    return { total, data };
  }

  // ========================================================
  // PAYMENT METHODS
  // ========================================================

  private getReceiptDateParts(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return { y, m, d, dateKey: `${y}${m}${d}` };
  }

  private async generateReceiptNumber(schoolId: string, paymentDate = new Date()) {
    const { y, m, d, dateKey } = this.getReceiptDateParts(paymentDate);
    const latestPayment = await this.prisma.payment.findFirst({
      where: {
        schoolId,
        paymentDate: {
          gte: new Date(`${y}-${m}-${d}T00:00:00.000Z`),
          lte: new Date(`${y}-${m}-${d}T23:59:59.999Z`),
        },
        receiptNumber: { startsWith: `RCPT-${dateKey}-` },
      },
      orderBy: { receiptNumber: 'desc' },
      select: { receiptNumber: true },
    });

    const latestSequence = latestPayment?.receiptNumber
      ? Number(latestPayment.receiptNumber.split('-').at(-1)) || 0
      : 0;
    const seq = String(latestSequence + 1).padStart(4, '0');
    return `RCPT-${dateKey}-${seq}`;
  }

  private async generateReceiptNumberCandidate(
    tx: any,
    schoolId: string,
    paymentDate: Date,
  ) {
    const { y, m, d, dateKey } = this.getReceiptDateParts(paymentDate);
    const latestPayment = await tx.payment.findFirst({
      where: {
        schoolId,
        paymentDate: {
          gte: new Date(`${y}-${m}-${d}T00:00:00.000Z`),
          lte: new Date(`${y}-${m}-${d}T23:59:59.999Z`),
        },
        receiptNumber: { startsWith: `RCPT-${dateKey}-` },
      },
      orderBy: { receiptNumber: 'desc' },
      select: { receiptNumber: true },
    });

    const latestSequence = latestPayment?.receiptNumber
      ? Number(latestPayment.receiptNumber.split('-').at(-1)) || 0
      : 0;
    const seq = String(latestSequence + 1).padStart(4, '0');
    return `RCPT-${dateKey}-${seq}`;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async createPaymentWithUniqueReceipt(
    tx: any,
    data: {
      schoolId: string;
      studentFeeId: string;
      termId: string | null;
      studentId: string;
      amountPaid: number;
      paymentMethod: string;
      transactionReference?: string;
      paymentDate: Date;
      receivedById: string;
      notes?: string;
    },
  ) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const receiptNumber = await this.generateReceiptNumberCandidate(
        tx,
        data.schoolId,
        data.paymentDate,
      );
      try {
        return await tx.payment.create({
          data: {
            ...data,
            receiptNumber,
          },
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError || new Error('Failed to generate a unique receipt number');
  }

  private async createPaymentWithFallbackReceipt(
    tx: any,
    data: {
      schoolId: string;
      studentFeeId: string;
      termId: string | null;
      studentId: string;
      amountPaid: number;
      paymentMethod: string;
      transactionReference?: string;
      paymentDate: Date;
      receivedById: string;
      notes?: string;
    },
  ) {
    try {
      return await this.createPaymentWithUniqueReceipt(tx, data);
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) {
        throw error;
      }

      const fallbackReceipt = `RCPT-${this.getReceiptDateParts(data.paymentDate).dateKey}-${Date.now().toString(36).toUpperCase()}`;
      return tx.payment.create({
        data: {
          ...data,
          receiptNumber: fallbackReceipt,
        },
      });
    }
  }

  private async getPeriodCountForFee(tx: any, schoolId: string, academicYearId: string) {
    const termsCount = await tx.term.count({ where: { academicYearId } });
    if (termsCount > 0) return termsCount;

    const setting = await tx.schoolSetting.findFirst({
      where: { schoolId, key: 'curriculum_type' },
      select: { value: true },
    });
    return this.getInstallmentCountInternal(setting?.value || 'TERM');
  }

  private async legacyGenerateReceiptNumber(schoolId: string) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateKey = `${y}${m}${d}`;
    const countToday = await this.prisma.payment.count({
      where: {
        schoolId,
        paymentDate: {
          gte: new Date(`${y}-${m}-${d}T00:00:00.000Z`),
          lte: new Date(`${y}-${m}-${d}T23:59:59.999Z`),
        },
      },
    });
    const seq = String(countToday + 1).padStart(4, '0');
    return `RCPT-${dateKey}-${seq}`;
  }

  private async logAudit(
    tx: any,
    data: {
      schoolId: string;
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      previousValue?: any;
      newValue?: any;
      amount?: number;
      reference?: string;
      description?: string;
    },
  ) {
    return tx.financeAuditLog.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        previousValue: data.previousValue
          ? JSON.stringify(data.previousValue)
          : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : null,
        amount: data.amount,
        reference: data.reference,
        description: data.description,
      },
    });
  }

  async recordPayment(user: any, dto: RecordPaymentDto) {
    const paymentDate = dto.paymentDate
      ? new Date(dto.paymentDate)
      : new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const sf = dto.studentFeeId
        ? await tx.studentFee.findUnique({
            where: { id: dto.studentFeeId },
            include: { payments: true },
          })
        : await tx.studentFee.findFirst({
            where: { studentId: dto.studentId },
            orderBy: { createdAt: 'desc' },
            include: { payments: true },
          });

      if (!sf) {
        throw new Error(
          'No fee found for this student. Generate student fees first.',
        );
      }
      if (sf.schoolId !== dto.schoolId) {
        throw new Error('Fee does not match this school');
      }
      const paymentTermId = dto.termId || sf.termId || null;
      if (dto.termId) {
        const term = await tx.term.findFirst({
          where: { id: dto.termId, academicYearId: sf.academicYearId },
          select: { id: true },
        });
        if (!term) {
          throw new Error('Selected payment period does not match this fee academic year');
        }
      }
      if (!sf.termId && !paymentTermId) {
        throw new Error('Select the term or semester this annual fee payment is for');
      }

      const alreadyPaid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const alreadyPaidForSelectedPeriod =
        paymentTermId
          ? sf.payments
              .filter((payment) => payment.termId === paymentTermId)
              .reduce((s, payment) => s + payment.amountPaid, 0)
          : alreadyPaid;
      const expectedForSelectedPeriod =
        !sf.termId && paymentTermId
          ? Math.round(
              (sf.finalAmount /
                Math.max(
                  await this.getPeriodCountForFee(
                    tx,
                    dto.schoolId,
                    sf.academicYearId,
                  ),
                  1,
                )) *
                100,
            ) / 100
          : sf.finalAmount;
      const outstanding = Math.max(
        0,
        expectedForSelectedPeriod - alreadyPaidForSelectedPeriod,
      );
      if (dto.amountPaid <= 0) throw new Error('Invalid amount');
      if (outstanding <= 0) {
        throw new Error('This term or semester is already fully paid');
      }
      if (dto.amountPaid > outstanding)
        throw new Error(
          `Amount exceeds outstanding balance for the selected term or semester. Remaining: ${outstanding}`,
        );

      const payment = await this.createPaymentWithFallbackReceipt(tx, {
        schoolId: dto.schoolId,
        studentFeeId: sf.id,
        termId: paymentTermId,
        studentId: sf.studentId,
        amountPaid: dto.amountPaid,
        paymentMethod: dto.paymentMethod,
        transactionReference: dto.transactionReference,
        paymentDate,
        receivedById: user.id,
        notes: dto.notes,
      });

      const paidNow = alreadyPaid + dto.amountPaid;
      const remaining = Math.max(0, sf.finalAmount - paidNow);
      const newStatus =
        remaining <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
      await tx.studentFee.update({
        where: { id: sf.id },
        data: { status: newStatus },
      });

      await tx.receipt.create({
        data: {
          schoolId: dto.schoolId,
          paymentId: payment.id,
          receiptNumber: payment.receiptNumber,
          studentId: dto.studentId,
          amountPaid: dto.amountPaid,
          paymentMethod: dto.paymentMethod,
          paymentDate,
          generatedById: user.id,
          notes: dto.notes,
        },
      });

      await this.logAudit(tx, {
        schoolId: dto.schoolId,
        userId: user.id,
        action: 'PAYMENT',
        entityType: 'Payment',
        entityId: payment.id,
        previousValue: { paid: alreadyPaid, status: sf.status },
        newValue: { paid: paidNow, status: newStatus },
        amount: dto.amountPaid,
        reference: payment.receiptNumber,
        description: `Payment recorded for student fee ${sf.id}`,
      });

      return { payment, receiptNumber: payment.receiptNumber, remaining, status: newStatus };
    });

    await this.notifyParentsOfRecordedPayment(dto.schoolId, result.payment);

    return result;
  }

  private async notifyParentsOfRecordedPayment(
    schoolId: string,
    payment: {
      id: string;
      studentId: string;
      termId: string | null;
      amountPaid: number;
      receiptNumber: string;
    },
  ) {
    const studentProfile = await this.prisma.studentProfile.findFirst({
      where: {
        schoolId,
        userId: payment.studentId,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        parents: {
          select: {
            parent: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    const parentUserIds = [
      ...new Set(
        (studentProfile?.parents || [])
          .map((link) => link.parent.userId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    if (parentUserIds.length === 0) {
      return { count: 0 };
    }

    const term = payment.termId
      ? await this.prisma.term.findUnique({
          where: { id: payment.termId },
          select: { id: true, name: true },
        })
      : null;
    const studentName = studentProfile?.user?.name || 'your child';
    const amount = this.formatBirr(payment.amountPaid);

    return this.notificationService.createBulkNotifications({
      schoolId,
      userIds: parentUserIds,
      title: 'Payment Recorded',
      message: `Payment of ${amount} has been recorded for ${studentName}${term?.name ? ` for ${term.name}` : ''}. Receipt #: ${payment.receiptNumber}`,
      type: NotificationType.PAYMENT_RECEIVED,
      actionUrl: '/parent/fees',
      metadata: {
        paymentId: payment.id,
        receiptNumber: payment.receiptNumber,
        amountPaid: payment.amountPaid,
        studentId: studentProfile?.id || payment.studentId,
        studentUserId: payment.studentId,
        studentName,
        termId: term?.id || null,
        termName: term?.name || null,
      },
    });
  }

  // ========================================================
  // REPORT METHODS
  // ========================================================

  async getAllPayments(schoolId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { schoolId },
      orderBy: { paymentDate: 'desc' },
      include: {
        term: { select: { id: true, name: true } },
        studentFee: {
          select: {
            academicYearId: true,
            termId: true,
            term: { select: { id: true, name: true } },
            feeStructure: { select: { feeType: true } },
          },
        },
      },
    });

    const formattedPayments =
      await this.formatPaymentsWithStudentContext(payments);

    const total = payments.reduce((s, p) => s + p.amountPaid, 0);
    return { total, count: payments.length, payments: formattedPayments };
  }

  async reversePayment(
    user: any,
    schoolId: string,
    paymentId: string,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, schoolId },
        include: {
          studentFee: {
            include: {
              payments: { select: { id: true, amountPaid: true } },
            },
          },
          receipt: true,
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      const remainingPaid = payment.studentFee.payments
        .filter((item) => item.id !== payment.id)
        .reduce((sum, item) => sum + item.amountPaid, 0);
      const remainingBalance = Math.max(
        0,
        payment.studentFee.finalAmount - remainingPaid,
      );
      const newStatus =
        remainingBalance <= 0
          ? PaymentStatus.PAID
          : remainingPaid > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.PENDING;

      if (payment.receipt) {
        await tx.receipt.delete({ where: { id: payment.receipt.id } });
      }

      await tx.payment.delete({ where: { id: payment.id } });

      await tx.studentFee.update({
        where: { id: payment.studentFeeId },
        data: { status: newStatus },
      });

      await this.logAudit(tx, {
        schoolId,
        userId: user.id,
        action: 'PAYMENT_REVERSED',
        entityType: 'Payment',
        entityId: payment.id,
        previousValue: {
          amountPaid: payment.amountPaid,
          status: payment.studentFee.status,
          receiptNumber: payment.receiptNumber,
          termId: payment.termId,
        },
        newValue: {
          remainingPaid,
          status: newStatus,
          reason: reason || null,
        },
        amount: payment.amountPaid,
        reference: payment.receiptNumber,
        description: `Payment reversed for student fee ${payment.studentFeeId}`,
      });

      return {
        reversed: true,
        receiptNumber: payment.receiptNumber,
        remainingPaid,
        remainingBalance,
        status: newStatus,
      };
    });
  }

  async dailyCollectionReport(query: ReportQueryDto) {
    const { schoolId, from, to, termId, academicYearId } = query;

    // Parse dates or default to today
    let start = from ? new Date(from) : undefined;
    let end = to ? new Date(to) : undefined;
    if (!start || !end) {
      const y = new Date().getFullYear();
      const m = String(new Date().getMonth() + 1).padStart(2, '0');
      const d = String(new Date().getDate()).padStart(2, '0');
      start = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
      end = new Date(`${y}-${m}-${d}T23:59:59.999Z`);
    }

    const where: any = { schoolId, paymentDate: { gte: start, lte: end } };
    if (academicYearId || (termId && termId !== 'all')) {
      where.studentFee = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(termId && termId !== 'all'
          ? { OR: [{ termId }, { termId: null }] }
          : {}),
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        term: { select: { id: true, name: true } },
        studentFee: {
          select: {
            termId: true,
            term: { select: { id: true, name: true } },
            academicYearId: true,
            feeStructure: {
              select: {
                feeType: true,
              },
            },
          },
        },
      },
    });

    const formattedPayments =
      await this.formatPaymentsWithStudentContext(payments);

    const total = payments.reduce((s, p) => s + p.amountPaid, 0);
    const dailyDataMap = new Map<string, number>();
    payments.forEach((payment) => {
      const dateKey = payment.paymentDate.toISOString().split('T')[0];
      dailyDataMap.set(
        dateKey,
        (dailyDataMap.get(dateKey) || 0) + payment.amountPaid,
      );
    });
    const dailyData = Array.from(dailyDataMap.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, amount]) => ({ date, amount }));

    // Get outstanding balances and student payment stats
    let totalOutstanding = 0;
    let totalRevenue = 0;
    let outstandingRows: any[] = [];
    let paidStudents = 0;
    let partialStudents = 0;
    let unpaidStudents = 0;
    const feeBreakdown = {
      tuition: 0,
      registration: 0,
      examFee: 0,
      library: 0,
      other: 0,
    };

    payments.forEach((payment) => {
      const feeType = payment.studentFee?.feeStructure?.feeType;
      switch (feeType) {
        case 'TUITION':
          feeBreakdown.tuition += payment.amountPaid;
          break;
        case 'REGISTRATION':
          feeBreakdown.registration += payment.amountPaid;
          break;
        case 'EXAM':
          feeBreakdown.examFee += payment.amountPaid;
          break;
        case 'LIBRARY':
          feeBreakdown.library += payment.amountPaid;
          break;
        default:
          feeBreakdown.other += payment.amountPaid;
          break;
      }
    });

    if (academicYearId) {
      const outstandingResult = await this.outstandingBalancesReport(
        schoolId,
        academicYearId,
        termId,
      );
      totalOutstanding = outstandingResult.totalOutstanding;
      totalRevenue = outstandingResult.totalRevenue;
      outstandingRows = outstandingResult.rows;

      // Calculate payment status counts from rows - consider PENDING as unpaid
      outstandingRows.forEach((row: any) => {
        const status = row.status;
        if (status === 'PAID') {
          paidStudents++;
        } else if (status === 'PARTIAL') {
          partialStudents++;
        } else if (status === 'PENDING' || status === 'UNPAID') {
          unpaidStudents++;
        }
      });
    }

    return {
      total: totalRevenue,
      todayTotal: total,
      totalOutstanding,
      count: payments.length,
      payments: formattedPayments,
      dailyData,
      feeBreakdown,
      outstandingRows,
      paidStudents,
      partialStudents,
      unpaidStudents,
    };
  }

  async monthlyRevenueReport(schoolId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    const payments = await this.prisma.payment.findMany({
      where: { schoolId, paymentDate: { gte: start, lte: end } },
    });
    const total = payments.reduce((s, p) => s + p.amountPaid, 0);
    return { month, year, total, count: payments.length };
  }

  async outstandingBalancesReport(
    schoolId: string,
    academicYearId: string,
    termId?: string,
  ) {
    const selectedTerm =
      termId && termId !== 'all'
        ? await this.prisma.term.findUnique({
            where: { id: termId },
            select: { id: true, name: true, order: true, academicYearId: true },
          })
        : null;
    const curriculumType = await this.getFeeCollectionModeInternal(schoolId);
    const installmentCount = this.getInstallmentCountInternal(curriculumType);
    const terms = await this.getTermsForAcademicYear(academicYearId);

    const where: any = {
      schoolId,
      academicYearId,
      ...(termId && termId !== 'all'
        ? { OR: [{ termId }, { termId: null }] }
        : {}),
    };

    const fees = await this.prisma.studentFee.findMany({
      where,
      include: {
        payments: true,
        student: { select: { id: true, name: true } },
        feeStructure: {
          include: {
            term: { select: { name: true } },
          },
        },
        term: { select: { name: true } },
      },
    });

    // Get academic year name (studentClass uses year name, not ID)
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: academicYearId },
      select: { name: true },
    });
    const academicYearName = academicYear?.name;

    // Get student classes in parallel
    const studentIds = fees.map((f) => f.studentId);
    const studentClasses = await this.prisma.studentClass.findMany({
      where: {
        studentId: { in: studentIds },
        academicYear: academicYearName,
      },
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    });

    // Create a map for quick lookup
    const classMap = new Map<
      string,
      { grade: string | null; section: string | null }
    >();
    studentClasses.forEach((sc) => {
      classMap.set(sc.studentId, {
        grade: sc.class?.name || null,
        section: sc.section?.name || null,
      });
    });

    const rows = fees.map((sf) => {
      const paid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const isYearWide = !sf.termId;
      const isPeriodView = Boolean(selectedTerm);

      let displayTotal = sf.finalAmount;
      let displayPaid = paid;
      let displayRemaining = Math.max(0, sf.finalAmount - paid);
      let displayStatus = sf.status;
      let scopeLabel =
        sf.term?.name ||
        sf.feeStructure.term?.name ||
        'Whole Academic Year';

      if (isPeriodView && isYearWide && selectedTerm) {
        const perPeriodAmount =
          Math.round((sf.finalAmount / Math.max(installmentCount, 1)) * 100) /
          100;
        const paidTowardCurrent = Math.max(
          0,
          Math.min(perPeriodAmount, paid),
        );
        const currentRemaining = Math.max(
          0,
          perPeriodAmount - paidTowardCurrent,
        );

        displayTotal = perPeriodAmount;
        displayPaid = paidTowardCurrent;
        displayRemaining = currentRemaining;
        displayStatus =
          currentRemaining <= 0
            ? PaymentStatus.PAID
            : paidTowardCurrent > 0
              ? PaymentStatus.PARTIAL
              : PaymentStatus.PENDING;
        scopeLabel = `${selectedTerm.name} share`;
      }

      const studentClass = classMap.get(sf.studentId);
      return {
        studentId: sf.studentId,
        studentName: sf.student?.name,
        grade: studentClass?.grade || null,
        section: studentClass?.section || null,
        feeType: sf.feeStructure.feeType,
        scopeLabel,
        isYearWide,
        total: displayTotal,
        paid: displayPaid,
        remaining: displayRemaining,
        status: displayStatus,
      };
    });
    const totalOutstanding = rows.reduce((s, r) => s + r.remaining, 0);
    // Total Revenue = actual amount collected (sum of all payments made)
    const totalRevenue = rows.reduce((s, r) => s + r.paid, 0);
    return { totalOutstanding, totalRevenue, rows };
  }

  async markOverdueFees(
    schoolId: string,
    academicYearId: string,
    termId?: string,
  ) {
    const where: any = {
      schoolId,
      academicYearId,
      status: PaymentStatus.PENDING,
    };
    if (termId) where.termId = termId;

    const overdueFees = await this.prisma.studentFee.findMany({
      where: { ...where, dueDate: { lt: new Date() } },
    });

    if (overdueFees.length === 0)
      return { updated: 0, message: 'No fees due for marking overdue' };

    let updated = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const fee of overdueFees) {
        await tx.studentFee.update({
          where: { id: fee.id },
          data: { status: PaymentStatus.OVERDUE },
        });
        updated++;
      }
    });

    return { updated, message: `Marked ${updated} fees as overdue` };
  }

  async getOverdueFeesReport(
    schoolId: string,
    academicYearId: string,
    termId?: string,
  ) {
    const where: any = {
      schoolId,
      academicYearId,
      status: PaymentStatus.OVERDUE,
    };
    if (termId) where.termId = termId;

    const fees = await this.prisma.studentFee.findMany({
      where,
      include: {
        payments: true,
        student: { select: { id: true, name: true } },
        feeStructure: true,
        term: { select: { name: true } },
      },
    });

    const rows = fees.map((sf) => {
      const paid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const daysOverdue = sf.dueDate
        ? Math.floor(
            (new Date().getTime() - new Date(sf.dueDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;
      return {
        studentId: sf.studentId,
        studentName: sf.student?.name,
        feeType: sf.feeStructure.feeType,
        termName: sf.term?.name || null,
        total: sf.finalAmount,
        paid,
        remaining: Math.max(0, sf.finalAmount - paid),
        daysOverdue: Math.max(0, daysOverdue),
        dueDate: sf.dueDate?.toISOString() || null,
      };
    });

    const totalOverdue = rows.reduce((s, r) => s + r.remaining, 0);
    return { totalOverdue, count: rows.length, rows };
  }

  async getAuditLogs(
    schoolId: string,
    entityType?: string,
    entityId?: string,
    limit = 100,
  ) {
    const where: any = { schoolId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    return this.prisma.financeAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async paymentHistoryForStudent(schoolId: string, studentId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { schoolId, studentId },
      orderBy: { paymentDate: 'desc' },
      include: { studentFee: { include: { feeStructure: true } } },
    });
    const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
    return { totalPaid, count: payments.length, payments };
  }

  // ========================================================
  // CURRICULUM INFO
  // ========================================================

  async getCurriculumInfo(schoolId: string, academicYearId: string) {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'curriculum_type' } },
    });
    const curriculumType = setting?.value || 'TERM';
    const terms = await this.getTermsForAcademicYear(academicYearId);
    return { curriculumType, terms, termCount: terms.length };
  }

  // ========================================================
  // STUDENT FEE SUMMARY (PARENT PORTAL)
  // ========================================================

  async getStudentFeeSummary(
    schoolId: string,
    studentId: string,
    academicYearId: string,
    termId?: string,
  ) {
    let student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: { select: { name: true } } },
    });

    if (!student) {
      student = await this.prisma.studentProfile.findUnique({
        where: { userId: studentId },
        include: { user: { select: { name: true } } },
      });
    }

    if (!student) throw new Error('Student not found');
    const profileId = student.id;
    const candidateStudentIds = [student.id, student.userId].filter(
      (value): value is string => Boolean(value),
    );

    const selectedTerm =
      termId && termId !== 'all'
        ? await this.prisma.term.findUnique({
            where: { id: termId },
            select: { id: true, name: true, order: true, academicYearId: true },
          })
        : null;
    const curriculumType = await this.getFeeCollectionModeInternal(schoolId);
    const installmentCount = this.getInstallmentCountInternal(curriculumType);
    const terms = await this.getTermsForAcademicYear(academicYearId);

    const studentFeesWhere: any = {
      studentId: { in: candidateStudentIds },
      academicYearId,
      schoolId,
    };
    if (termId && termId !== 'all') {
      studentFeesWhere.OR = [{ termId }, { termId: null }];
    }

    const studentFees = await this.prisma.studentFee.findMany({
      where: studentFeesWhere,
      include: {
        feeStructure: { include: { term: { select: { name: true } } } },
        term: { select: { name: true } },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: { term: { select: { name: true } } },
        },
      },
    });

    const feeItems = studentFees.map((sf) => {
      const paid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const isYearWide = !sf.termId;
      const isPeriodView = Boolean(selectedTerm);

      let amount = sf.totalAmount;
      let paidAmount = paid;
      let balance = Math.max(0, sf.finalAmount - paid);
      let status = sf.status;
      let termName = sf.term?.name || sf.feeStructure.term?.name || null;

      if (isPeriodView && isYearWide && selectedTerm) {
        const perPeriodAmount =
          Math.round((sf.finalAmount / Math.max(installmentCount, 1)) * 100) /
          100;
        const paidTowardCurrent = Math.max(0, Math.min(perPeriodAmount, paid));
        const currentRemaining = Math.max(0, perPeriodAmount - paidTowardCurrent);

        amount = perPeriodAmount;
        paidAmount = paidTowardCurrent;
        balance = currentRemaining;
        status =
          currentRemaining <= 0
            ? PaymentStatus.PAID
            : paidTowardCurrent > 0
              ? PaymentStatus.PARTIAL
              : PaymentStatus.PENDING;
        termName = `${selectedTerm.name} share`;
      }

      return {
        id: sf.id,
        name: sf.feeStructure.feeType,
        amount,
        dueDate: sf.dueDate?.toISOString() || null,
        status,
        paidAmount,
        balance,
        category: sf.feeStructure.feeType,
        termId: sf.termId,
        termName,
        isYearWide,
      };
    });

    const payments = studentFees.flatMap((sf) =>
      sf.payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        studentFeeId: sf.id,
        amount: p.amountPaid,
        paymentMethod: p.paymentMethod,
        paidAt: p.paymentDate.toISOString(),
        feeItemName: sf.feeStructure.feeType,
        termId: p.termId || sf.termId,
        termName:
          p.term?.name || sf.term?.name || sf.feeStructure.term?.name || null,
        isYearWide: !sf.termId,
        status: 'COMPLETED',
      })),
    );

    const totalFees = feeItems.reduce((s, f) => s + f.amount, 0);
    const totalPaid = feeItems.reduce((s, f) => s + f.paidAmount, 0);
    const totalBalance = feeItems.reduce((s, f) => s + f.balance, 0);

    return {
      student: {
        id: student.id,
        name: student.user.name,
        studentCode: student.studentCode || 'N/A',
        className:
          'Grade ' +
          (student.academicYear ? student.academicYear.split('-')[0] : 'N/A'),
        section: student.section || 'N/A',
      },
      feeItems,
      payments,
      curriculumType,
      terms,
      summary: { totalFees, totalPaid, totalBalance, nextDueDate: null },
    };
  }

  // ========================================================
  // DISCOUNT POLICY METHODS
  // ========================================================

  async createDiscountPolicy(
    schoolId: string,
    data: {
      name: string;
      discountType: string;
      discountValue: number;
      isActive?: boolean;
      criteria?: string;
    },
  ) {
    return this.prisma.discountPolicy.create({
      data: {
        schoolId,
        name: data.name,
        discountType: data.discountType,
        discountValue: data.discountValue,
        isActive: data.isActive ?? true,
        criteria: data.criteria ?? null,
      },
    });
  }

  async listDiscountPolicies(schoolId: string, includeInactive = false) {
    return this.prisma.discountPolicy.findMany({
      where: { schoolId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async updateDiscountPolicy(
    id: string,
    schoolId: string,
    data: {
      name?: string;
      discountType?: string;
      discountValue?: number;
      isActive?: boolean;
      criteria?: string;
    },
  ) {
    const policy = await this.prisma.discountPolicy.findUnique({
      where: { id },
    });
    if (!policy || policy.schoolId !== schoolId)
      throw new Error('Discount policy not found for this school');
    return this.prisma.discountPolicy.update({
      where: { id },
      data: {
        name: data.name ?? policy.name,
        discountType: data.discountType ?? policy.discountType,
        discountValue: data.discountValue ?? policy.discountValue,
        isActive: data.isActive ?? policy.isActive,
        criteria: data.criteria ?? policy.criteria,
      },
    });
  }

  async deleteDiscountPolicy(id: string, schoolId: string) {
    const policy = await this.prisma.discountPolicy.findUnique({
      where: { id },
    });
    if (!policy || policy.schoolId !== schoolId)
      throw new Error('Discount policy not found for this school');
    return this.prisma.discountPolicy.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async applyDiscountPolicy(
    studentFeeId: string,
    discountPolicyId: string,
    schoolId: string,
  ) {
    const policy = await this.prisma.discountPolicy.findUnique({
      where: { id: discountPolicyId },
    });
    if (!policy || policy.schoolId !== schoolId)
      throw new Error('Invalid discount policy');

    const studentFee = await this.prisma.studentFee.findUnique({
      where: { id: studentFeeId },
    });
    if (!studentFee || studentFee.schoolId !== schoolId)
      throw new Error('Student fee not found');

    let discountAmount = 0;
    if (policy.discountType === 'PERCENTAGE') {
      discountAmount = (studentFee.totalAmount * policy.discountValue) / 100;
    } else {
      discountAmount = policy.discountValue;
    }

    return this.prisma.studentFee.update({
      where: { id: studentFeeId },
      data: {
        discountPolicyId,
        discount: discountAmount,
        finalAmount: Math.max(0, studentFee.totalAmount - discountAmount),
      },
    });
  }
}
