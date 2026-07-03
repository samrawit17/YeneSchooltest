"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
const notification_service_1 = require("../notification/notification.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const fee_structure_service_1 = require("../fee-structure/fee-structure.service");
const role_enum_1 = require("../auth/types/role.enum");
const client_1 = require("@prisma/client");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    prisma;
    notificationService;
    eventBus;
    feeStructureService;
    logger = new common_1.Logger(PaymentsService_1.name);
    constructor(prisma, notificationService, eventBus, feeStructureService) {
        this.prisma = prisma;
        this.notificationService = notificationService;
        this.eventBus = eventBus;
        this.feeStructureService = feeStructureService;
    }
    async recordPayment(user, dto) {
        if (user?.role !== role_enum_1.Role.SUPER_ADMIN && user?.schoolId && user.schoolId !== dto.schoolId) {
            throw new localization_1.LocalizedException('payments.fee_does_not_match_this_school_6ae67d67', undefined, undefined, 'Fee does not match this school');
        }
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
            throw new localization_1.LocalizedException('payments.no_fee_found_for_this_student_generate_student_fees_first_695bf3df', undefined, undefined, 'No fee found for this student. Generate student fees first.');
            throw new localization_1.LocalizedException('payments.fee_does_not_match_this_school_6ae67d67', undefined, undefined, 'Fee does not match this school');
            throw new localization_1.LocalizedException('payments.fee_does_not_match_this_student_ec157ce2', undefined, undefined, 'Fee does not match this student');
            const paymentTermId = dto.termId || sf.termId || null;
            const feeInstallmentIndex = this.getFeeStructureInstallmentIndex(sf.feeStructure?.feeType);
            const isInstallmentFee = feeInstallmentIndex !== null;
            if (dto.termId) {
                const term = await tx.term.findFirst({
                    where: { id: dto.termId, academicYearId: sf.academicYearId, academicYear: { schoolId: dto.schoolId } },
                    select: { id: true },
                });
                throw new localization_1.LocalizedException('payments.selected_payment_period_does_not_match_this_fee_academic_yea_962e89b8', undefined, undefined, 'Selected payment period does not match this fee academic year');
            }
            if (!sf.termId && !paymentTermId && !isInstallmentFee) {
                throw new localization_1.LocalizedException('payments.select_the_term_or_semester_this_annual_fee_payment_is_for_5f3f8a9b', undefined, undefined, 'Select the term or semester this annual fee payment is for');
            }
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
            throw new localization_1.LocalizedException('payments.invalid_amount_a9ced76f', undefined, undefined, 'Invalid amount');
            if (outstanding <= 0) {
                throw new localization_1.LocalizedException('payments.isannualfeepayment_this_annual_fee_is_already_fully_paid_isi_7e8c7fe8', undefined, undefined, 'isAnnualFeePayment ? \'This annual fee is already fully paid\'\n          : isInstallmentFee ? \'This installment is already fully paid\'\n          : \'This term or semester is already fully paid\'');
            }
            if (dto.amountPaid > outstanding) {
                throw new localization_1.LocalizedException('payments.isannualfeepayment_amount_exceeds_the_remaining_annual_fee_b_dfe6ebab', undefined, undefined, 'isAnnualFeePayment ? `Amount exceeds the remaining annual fee balance. Remaining: ${outstanding}`\n          : isInstallmentFee ? `Amount exceeds the remaining installment balance. Remaining: ${outstanding}`\n          : `Amount exceeds outstanding balance for the selected term or semester. Remaining: ${outstanding}`');
            }
            const payment = await this.createPaymentWithFallbackReference(tx, {
                schoolId: dto.schoolId, studentFeeId: sf.id, termId: paymentTermId,
                studentId: sf.studentId, amountPaid: dto.amountPaid, paymentMethod: dto.paymentMethod,
                transactionReference: dto.transactionReference, paymentDate, receivedById: user.id, notes: dto.notes,
            });
            const paidNow = alreadyPaid + dto.amountPaid;
            const remaining = Math.max(0, sf.finalAmount - paidNow);
            const newStatus = remaining <= 0 ? client_1.PaymentStatus.PAID : client_1.PaymentStatus.PARTIAL;
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
    async reversePayment(user, schoolId, paymentId, reason) {
        return this.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findFirst({
                where: { id: paymentId, schoolId },
                include: { studentFee: { include: { payments: { select: { id: true, amountPaid: true } } } } },
            });
            throw new localization_1.LocalizedException('payments.payment_not_found_58ad1e2f', undefined, undefined, 'Payment not found');
            const remainingPaid = payment.studentFee.payments
                .filter((item) => item.id !== payment.id)
                .reduce((sum, item) => sum + item.amountPaid, 0);
            const remainingBalance = Math.max(0, payment.studentFee.finalAmount - remainingPaid);
            const newStatus = remainingBalance <= 0 ? client_1.PaymentStatus.PAID : remainingPaid > 0 ? client_1.PaymentStatus.PARTIAL : client_1.PaymentStatus.PENDING;
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
    async getAllPayments(schoolId) {
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
    async formatPaymentsWithStudentContext(payments) {
        if (payments.length === 0)
            return [];
        const rawStudentIds = [...new Set(payments.map((p) => p.studentId).filter(Boolean))];
        const students = await this.prisma.studentProfile.findMany({
            where: { OR: [{ id: { in: rawStudentIds } }, { userId: { in: rawStudentIds } }] },
            include: { user: { select: { name: true } } },
        });
        const studentByAnyId = new Map();
        students.forEach((student) => {
            const payload = { profileId: student.id, userId: student.userId, name: student.user?.name || 'N/A' };
            studentByAnyId.set(student.id, payload);
            if (student.userId)
                studentByAnyId.set(student.userId, payload);
        });
        return payments.map((payment) => {
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
    getPaymentReferenceDateParts(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return { y, m, d, dateKey: `${y}${m}${d}` };
    }
    async generatePaymentReferenceCandidate(tx, schoolId, paymentDate) {
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
    isUniqueConstraintError(error) {
        return error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
    }
    async createPaymentWithUniqueReference(tx, data) {
        let lastError;
        for (let attempt = 0; attempt < 5; attempt++) {
            const receiptNumber = await this.generatePaymentReferenceCandidate(tx, data.schoolId, data.paymentDate);
            try {
                return await tx.payment.create({ data: { ...data, receiptNumber } });
            }
            catch (error) {
                if (!this.isUniqueConstraintError(error))
                    throw error;
                lastError = error;
            }
        }
        throw lastError || new Error('Failed to generate a unique payment reference');
    }
    async createPaymentWithFallbackReference(tx, data) {
        try {
            return await this.createPaymentWithUniqueReference(tx, data);
        }
        catch (error) {
            if (!this.isUniqueConstraintError(error))
                throw error;
            const fallbackReceipt = `PAY-${this.getPaymentReferenceDateParts(data.paymentDate).dateKey}-${Date.now().toString(36).toUpperCase()}`;
            return tx.payment.create({ data: { ...data, receiptNumber: fallbackReceipt } });
        }
    }
    async logAudit(tx, data) {
        return tx.financeAuditLog.create({
            data: {
                schoolId: data.schoolId, userId: data.userId, action: data.action,
                entityType: data.entityType, entityId: data.entityId,
                previousValue: data.previousValue ?? undefined, newValue: data.newValue ?? undefined,
                amount: data.amount ?? undefined, reference: data.reference ?? null, description: data.description || '',
            },
        });
    }
    getFeeStructureInstallmentIndex(feeType) {
        const match = String(feeType || '').match(/_INSTALLMENT_(\d+)$/i);
        return match ? Number(match[1]) : null;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notification_service_1.NotificationService,
        event_bus_service_1.EventBusService,
        fee_structure_service_1.FeeStructureService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map