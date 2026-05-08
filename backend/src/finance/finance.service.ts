import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';
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
  constructor(private readonly prisma: PrismaService) {}

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
        ...(termId ? { termId } : {}),
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

  private async generateReceiptNumber(schoolId: string) {
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
    return this.prisma.$transaction(async (tx) => {
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
      const alreadyPaid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const outstanding = Math.max(0, sf.finalAmount - alreadyPaid);
      if (dto.amountPaid <= 0) throw new Error('Invalid amount');
      if (dto.amountPaid > outstanding)
        throw new Error('Amount exceeds outstanding balance');

      const receiptNumber = await this.generateReceiptNumber(dto.schoolId);
      const payment = await tx.payment.create({
        data: {
          schoolId: dto.schoolId,
          studentFeeId: sf.id,
          studentId: sf.studentId,
          amountPaid: dto.amountPaid,
          paymentMethod: dto.paymentMethod,
          transactionReference: dto.transactionReference,
          paymentDate,
          receiptNumber,
          receivedById: user.id,
          notes: dto.notes,
        },
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
        reference: receiptNumber,
        description: `Payment recorded for student fee ${sf.id}`,
      });

      return { payment, receiptNumber, remaining, status: newStatus };
    });
  }

  // ========================================================
  // REPORT METHODS
  // ========================================================

  async getAllPayments(schoolId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { schoolId },
      orderBy: { paymentDate: 'desc' },
      include: { studentFee: { include: { feeStructure: true } } },
    });

    const studentIds = [...new Set(payments.map((p) => p.studentId))];
    const students = await this.prisma.studentProfile.findMany({
      where: { id: { in: studentIds } },
      include: { user: { select: { name: true } } },
    });
    const studentMap = new Map(students.map((s) => [s.id, s.user.name]));

    const formattedPayments = payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      studentName: studentMap.get(p.studentId) || 'N/A',
      studentId: p.studentId,
      grade: 'N/A',
      section: 'N/A',
      paymentMethod: p.paymentMethod,
      amountPaid: p.amountPaid,
      recordedBy: p.receivedById,
      paymentDate: p.paymentDate.toISOString(),
      notes: p.notes,
    }));

    const total = payments.reduce((s, p) => s + p.amountPaid, 0);
    return { total, count: payments.length, payments: formattedPayments };
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
    if (termId && termId !== 'all') where.studentFee = { termId };

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        studentFee: { select: { termId: true, academicYearId: true } },
      },
    });

    const total = payments.reduce((s, p) => s + p.amountPaid, 0);

    // Get outstanding balances and student payment stats
    let totalOutstanding = 0;
    let totalRevenue = 0;
    let outstandingRows: any[] = [];
    let paidStudents = 0;
    let partialStudents = 0;
    let unpaidStudents = 0;

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
      payments,
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
    const where: any = { schoolId, academicYearId };
    if (termId && termId !== 'all') where.termId = termId;

    const fees = await this.prisma.studentFee.findMany({
      where,
      include: {
        payments: true,
        student: { select: { id: true, name: true } },
        feeStructure: true,
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
      const remaining = Math.max(0, sf.finalAmount - paid);
      const studentClass = classMap.get(sf.studentId);
      return {
        studentId: sf.studentId,
        studentName: sf.student?.name,
        grade: studentClass?.grade || null,
        section: studentClass?.section || null,
        feeType: sf.feeStructure.feeType,
        total: sf.finalAmount,
        paid,
        remaining,
        status: sf.status,
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

    const studentFeesWhere: any = {
      studentId: profileId,
      academicYearId,
      schoolId,
    };
    if (termId) studentFeesWhere.termId = termId;

    const studentFees = await this.prisma.studentFee.findMany({
      where: studentFeesWhere,
      include: {
        feeStructure: { include: { term: { select: { name: true } } } },
        term: { select: { name: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    const feeItems = studentFees.map((sf) => {
      const paid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const balance = Math.max(0, sf.finalAmount - paid);
      return {
        id: sf.id,
        name: sf.feeStructure.feeType,
        amount: sf.totalAmount,
        dueDate: sf.dueDate?.toISOString() || null,
        status: sf.status,
        paidAmount: paid,
        balance,
        category: sf.feeStructure.feeType,
        termId: sf.termId,
        termName: sf.term?.name || sf.feeStructure.term?.name || null,
      };
    });

    const payments = studentFees.flatMap((sf) =>
      sf.payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        amount: p.amountPaid,
        paymentMethod: p.paymentMethod,
        paidAt: p.paymentDate.toISOString(),
        feeItemName: sf.feeStructure.feeType,
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
