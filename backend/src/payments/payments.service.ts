import { HttpStatus, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService, NotificationType } from '../notification/notification.service';
import { EventBusService } from '../core/events/event-bus.service';
import { FeeStructureService } from '../fee-structure/fee-structure.service';
import { Role } from '../auth/types/role.enum';
import { PaymentStatus, Prisma } from '@prisma/client';
import type { RecordPaymentDto } from './payments.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly eventBus: EventBusService,
    private readonly feeStructureService: FeeStructureService,
  ) {}

  async recordPayment(user: any, dto: RecordPaymentDto) {
    if (user?.role !== Role.SUPER_ADMIN && user?.schoolId && user.schoolId !== dto.schoolId) throw new LocalizedException('payments.fee_does_not_match_this_school_6ae67d67', undefined, undefined, 'Fee does not match this school');

    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
    const config = await this.feeStructureService.getBillingConfig(dto.schoolId);
    const result = await this.prisma.$transaction(async (tx) => {
      const sf = dto.studentFeeId
        ? await tx.studentFee.findUnique({
            where: { id: dto.studentFeeId },
            include: { payments: true, feeStructure: { select: { feeType: true } } },
          })
        : await tx.studentFee.findFirst({
            where: { schoolId: dto.schoolId, studentId: dto.studentId },
            orderBy: { createdAt: 'desc' },
            include: { payments: true, feeStructure: { select: { feeType: true } } },
          });

      if (!sf) throw new LocalizedException('payments.no_fee_found_for_this_student_generate_student_fees_first_695bf3df', undefined, undefined, 'No fee found for this student. Generate student fees first.');
      if (sf.schoolId !== dto.schoolId) throw new LocalizedException('payments.fee_does_not_match_this_school_6ae67d67', undefined, undefined, 'Fee does not match this school');
      if (sf.studentId !== dto.studentId) throw new LocalizedException('payments.fee_does_not_match_this_student_ec157ce2', undefined, undefined, 'Fee does not match this student');

      const paymentTermId = dto.termId || sf.termId || null;
      const feeInstallmentIndex = this.getFeeStructureInstallmentIndex(sf.feeStructure?.feeType);
      const isInstallmentFee = feeInstallmentIndex !== null;

      if (dto.termId) {
        const term = await tx.term.findFirst({
          where: { id: dto.termId, academicYearId: sf.academicYearId, academicYear: { schoolId: dto.schoolId } },
          select: { id: true },
        });
        if (!term) throw new LocalizedException('payments.selected_payment_period_does_not_match_this_fee_academic_yea_962e89b8', undefined, undefined, 'Selected payment period does not match this fee academic year');
      }
      if (!sf.termId && !paymentTermId && !isInstallmentFee) throw new LocalizedException('payments.select_the_term_or_semester_this_annual_fee_payment_is_for_5f3f8a9b', undefined, undefined, 'Select the term or semester this annual fee payment is for');

      const alreadyPaid = sf.payments.reduce((s, p) => s + p.amountPaid, 0);
      const isAnnualFeePayment = !sf.termId && !isInstallmentFee && Boolean(paymentTermId);
      const perPeriodAmount = isAnnualFeePayment
        ? Math.round((sf.finalAmount / Math.max(config.billingPeriodsPerYear, 1)) * 100) / 100
        : sf.finalAmount;
      const alreadyPaidForSelectedPeriod = isInstallmentFee
        ? alreadyPaid
        : isAnnualFeePayment && paymentTermId
          ? sf.payments.filter((p) => p.termId === paymentTermId).reduce((s, p) => s + p.amountPaid, 0)
          : alreadyPaid;
      const outstanding = Math.max(0, isAnnualFeePayment ? sf.finalAmount - alreadyPaid : perPeriodAmount - alreadyPaidForSelectedPeriod);

      if (dto.amountPaid <= 0) throw new LocalizedException('payments.invalid_amount_a9ced76f', undefined, undefined, 'Invalid amount');
      if (outstanding <= 0) {
        throw new BadRequestException(
          isAnnualFeePayment ? 'This annual fee is already fully paid'
          : isInstallmentFee ? 'This installment is already fully paid'
          : 'This term or semester is already fully paid',
        );
      }
      if (dto.amountPaid > outstanding) {
        throw new BadRequestException(
          isAnnualFeePayment ? `Amount exceeds the remaining annual fee balance. Remaining: ${outstanding}`
          : isInstallmentFee ? `Amount exceeds the remaining installment balance. Remaining: ${outstanding}`
          : `Amount exceeds outstanding balance for the selected term or semester. Remaining: ${outstanding}`,
        );
      }

      const payment = await this.createPaymentWithFallbackReference(tx, {
        schoolId: dto.schoolId, studentFeeId: sf.id, termId: paymentTermId,
        studentId: sf.studentId, amountPaid: dto.amountPaid, paymentMethod: dto.paymentMethod,
        transactionReference: dto.transactionReference, paymentDate, receivedById: user.id, notes: dto.notes,
      });

      const paidNow = alreadyPaid + dto.amountPaid;
      const remaining = Math.max(0, sf.finalAmount - paidNow);
      const newStatus = remaining <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

      await tx.studentFee.update({
        where: { id: sf.id },
        data: { status: newStatus },
      });

      await this.logAudit(tx, {
        schoolId: dto.schoolId, userId: user.id, action: 'PAYMENT',
        entityType: 'Payment', entityId: payment.id,
        previousValue: { paid: alreadyPaid, status: sf.status },
        newValue: { paid: paidNow, status: newStatus },
        amount: dto.amountPaid, reference: dto.transactionReference || payment.receiptNumber,
        description: `Payment recorded for student fee ${sf.id}`,
      });

      return { payment, paymentReference: payment.receiptNumber, remaining, status: newStatus };
    });

    void this.eventBus.emit('fee.paid', { schoolId: dto.schoolId, studentId: dto.studentId, amount: dto.amountPaid });
    await this.notificationService.notifyPaymentReceived(dto.schoolId, dto.studentId, String(dto.amountPaid), result.paymentReference);

    return result;
  }

  async reversePayment(user: any, schoolId: string, paymentId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, schoolId },
        include: { studentFee: { include: { payments: { select: { id: true, amountPaid: true } } } } },
      });
      if (!payment) throw new LocalizedException('payments.payment_not_found_58ad1e2f', undefined, undefined, 'Payment not found');

      const remainingPaid = payment.studentFee.payments
        .filter((item) => item.id !== payment.id)
        .reduce((sum, item) => sum + item.amountPaid, 0);
      const remainingBalance = Math.max(0, payment.studentFee.finalAmount - remainingPaid);
      const newStatus = remainingBalance <= 0 ? PaymentStatus.PAID : remainingPaid > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;

      await tx.payment.delete({ where: { id: payment.id } });
      await tx.studentFee.update({ where: { id: payment.studentFeeId }, data: { status: newStatus } });

      await this.logAudit(tx, {
        schoolId, userId: user.id, action: 'PAYMENT_REVERSED', entityType: 'Payment', entityId: payment.id,
        previousValue: { amountPaid: payment.amountPaid, status: payment.studentFee.status, paymentReference: payment.receiptNumber, termId: payment.termId },
        newValue: { remainingPaid, status: newStatus, reason: reason || null },
        amount: payment.amountPaid, reference: payment.transactionReference || payment.receiptNumber,
        description: `Payment reversed for student fee ${payment.studentFeeId}`,
      });

      return { reversed: true, paymentReference: payment.receiptNumber, remainingPaid, remainingBalance, status: newStatus };
    });
  }

  async getAllPayments(schoolId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { schoolId },
      orderBy: { paymentDate: 'desc' },
      include: {
        term: { select: { id: true, name: true } },
        studentFee: {
          select: { academicYearId: true, termId: true, term: { select: { id: true, name: true } }, feeStructure: { select: { feeType: true } } },
        },
      },
    });

    const formattedPayments = await this.formatPaymentsWithStudentContext(payments);
    const total = payments.reduce((s, p) => s + p.amountPaid, 0);
    return { total, count: payments.length, payments: formattedPayments };
  }

  private async formatPaymentsWithStudentContext(payments: any[]) {
    if (payments.length === 0) return [];

    const rawStudentIds = [...new Set(payments.map((p) => p.studentId).filter(Boolean))];
    const students = await this.prisma.studentProfile.findMany({
      where: { OR: [{ id: { in: rawStudentIds } }, { userId: { in: rawStudentIds } }] },
      include: { user: { select: { name: true } } },
    });

    const studentByAnyId = new Map<string, { profileId: string; userId: string | null; name: string }>();
    students.forEach((student) => {
      const payload = { profileId: student.id, userId: student.userId, name: student.user?.name || 'N/A' };
      studentByAnyId.set(student.id, payload);
      if (student.userId) studentByAnyId.set(student.userId, payload);
    });

    return payments.map((payment: any) => {
      const student = studentByAnyId.get(payment.studentId);
      return {
        id: payment.id, receiptNumber: payment.receiptNumber,
        paymentReference: payment.receiptNumber,
        transactionReference: payment.transactionReference || null,
        studentName: student?.name || 'N/A', studentId: payment.studentId,
        paymentMethod: payment.paymentMethod, amountPaid: payment.amountPaid,
        recordedBy: payment.receivedById, paymentDate: payment.paymentDate.toISOString(),
        notes: payment.notes,
        termId: payment.termId || payment.term?.id || payment.studentFee?.termId || payment.studentFee?.term?.id || null,
        termName: payment.term?.name || payment.studentFee?.term?.name || null,
        feeType: payment.studentFee?.feeStructure?.feeType || null,
      };
    });
  }

  private getPaymentReferenceDateParts(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return { y, m, d, dateKey: `${y}${m}${d}` };
  }

  private async generatePaymentReferenceCandidate(tx: any, schoolId: string, paymentDate: Date) {
    const { dateKey } = this.getPaymentReferenceDateParts(paymentDate);
    const latestPayment = await tx.payment.findFirst({
      where: {
        schoolId,
        paymentDate: { gte: new Date(`${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}-${String(paymentDate.getDate()).padStart(2, '0')}T00:00:00.000Z`), lte: new Date(`${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}-${String(paymentDate.getDate()).padStart(2, '0')}T23:59:59.999Z`) },
        receiptNumber: { startsWith: `PAY-${dateKey}-` },
      },
      orderBy: { receiptNumber: 'desc' },
      select: { receiptNumber: true },
    });
    const latestSequence = latestPayment?.receiptNumber ? Number(latestPayment.receiptNumber.split('-').at(-1)) || 0 : 0;
    return `PAY-${dateKey}-${String(latestSequence + 1).padStart(4, '0')}`;
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private async createPaymentWithUniqueReference(tx: any, data: any) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const receiptNumber = await this.generatePaymentReferenceCandidate(tx, data.schoolId, data.paymentDate);
      try { return await tx.payment.create({ data: { ...data, receiptNumber } }); }
      catch (error) { if (!this.isUniqueConstraintError(error)) throw error; lastError = error; }
    }
    throw lastError || new Error('Failed to generate a unique payment reference');
  }

  private async createPaymentWithFallbackReference(tx: any, data: any) {
    try { return await this.createPaymentWithUniqueReference(tx, data); }
    catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;
      const fallbackReceipt = `PAY-${this.getPaymentReferenceDateParts(data.paymentDate).dateKey}-${Date.now().toString(36).toUpperCase()}`;
      return tx.payment.create({ data: { ...data, receiptNumber: fallbackReceipt } });
    }
  }

  private async logAudit(tx: any, data: { schoolId: string; userId: string; action: string; entityType: string; entityId: string; previousValue?: any; newValue?: any; amount?: number; reference?: string; description?: string }) {
    return tx.financeAuditLog.create({
      data: {
        schoolId: data.schoolId, userId: data.userId, action: data.action,
        entityType: data.entityType, entityId: data.entityId,
        previousValue: data.previousValue ?? undefined, newValue: data.newValue ?? undefined,
        amount: data.amount ?? undefined, reference: data.reference ?? null, description: data.description || '',
      },
    });
  }

  private getFeeStructureInstallmentIndex(feeType?: string | null) {
    const match = String(feeType || '').match(/_INSTALLMENT_(\d+)$/i);
    return match ? Number(match[1]) : null;
  }
}
