import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { FinanceReportQuery, PaginatedReportResponse } from '../dto/reports.dto';

@Injectable()
export class FinanceReportService {
  private readonly logger = new Logger(FinanceReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDailyCollection(query: FinanceReportQuery): Promise<any> {
    const { schoolId, from, to } = query;
    const startDate = from ? new Date(from) : new Date(new Date().toDateString());
    const endDate = to ? new Date(to) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

    const payments = await this.prisma.payment.findMany({
      where: { schoolId, paymentDate: { gte: startDate, lte: endDate } },
      include: {
        studentFee: {
          select: { feeStructure: { select: { feeType: true } }, termId: true },
        },
        term: { select: { name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    const feeBreakdown: Record<string, number> = {};
    for (const p of payments) {
      const feeType = p.studentFee?.feeStructure?.feeType || 'OTHER';
      feeBreakdown[feeType] = (feeBreakdown[feeType] || 0) + Number(p.amountPaid);
    }

    return {
      totalAmount,
      count: payments.length,
      feeBreakdown: Object.entries(feeBreakdown).map(([feeType, amount]) => ({ feeType, amount })),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amountPaid,
        date: p.paymentDate,
        method: p.paymentMethod,
        receiptNumber: p.receiptNumber,
        term: p.term?.name,
        feeType: p.studentFee?.feeStructure?.feeType,
      })),
    };
  }

  async getMonthlyRevenue(query: FinanceReportQuery): Promise<any> {
    const { schoolId } = query;
    const month = query.from ? new Date(query.from).getMonth() : new Date().getMonth();
    const year = query.from ? new Date(query.from).getFullYear() : new Date().getFullYear();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const result = await this.prisma.payment.aggregate({
      where: { schoolId, paymentDate: { gte: startDate, lte: endDate } },
      _sum: { amountPaid: true },
      _count: { id: true },
    });

    return {
      totalAmount: result._sum.amountPaid || 0,
      count: result._count.id,
      month,
      year,
    };
  }

  async getOutstandingBalances(query: FinanceReportQuery): Promise<any> {
    const { schoolId, academicYearId } = query;

    const where: any = { schoolId, status: { in: ['PENDING', 'PARTIAL'] } };
    if (academicYearId) where.academicYearId = academicYearId;

    const fees = await this.prisma.studentFee.findMany({
      where,
      include: {
        student: { select: { name: true } },
        payments: { select: { amountPaid: true } },
        feeStructure: { select: { feeType: true, amount: true } },
        term: { select: { name: true } },
        discountPolicy: { select: { name: true, discountType: true, discountValue: true } },
      },
    });

    let totalOutstanding = 0;
    const rows = fees.map((fee) => {
      const paid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
      const remaining = Number(fee.finalAmount) - paid;
      totalOutstanding += Math.max(0, remaining);
      return {
        studentName: fee.student.name,
        feeType: fee.feeStructure?.feeType,
        term: fee.term?.name,
        totalAmount: fee.finalAmount,
        paid,
        remaining: Math.max(0, remaining),
        status: fee.status,
        dueDate: fee.dueDate,
        discount: fee.discountPolicy
          ? `${fee.discountPolicy.name} (${fee.discountPolicy.discountValue}${fee.discountPolicy.discountType === 'PERCENTAGE' ? '%' : ''})`
          : null,
      };
    });

    return { totalOutstanding, count: fees.length, rows };
  }

  async getOverdueFees(query: FinanceReportQuery): Promise<any> {
    const { schoolId, academicYearId } = query;

    const where: any = { schoolId, status: 'OVERDUE' };
    if (academicYearId) where.academicYearId = academicYearId;

    const fees = await this.prisma.studentFee.findMany({
      where,
      include: {
        student: { select: { name: true } },
        payments: { select: { amountPaid: true } },
        feeStructure: { select: { feeType: true, amount: true } },
        term: { select: { name: true } },
      },
    });

    const now = Date.now();
    const rows = fees.map((fee) => {
      const paid = fee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
      const daysOverdue = fee.dueDate ? Math.floor((now - new Date(fee.dueDate).getTime()) / (24 * 60 * 60 * 1000)) : 0;
      return {
        studentName: fee.student.name,
        feeType: fee.feeStructure?.feeType,
        term: fee.term?.name,
        totalAmount: fee.finalAmount,
        paid,
        remaining: Math.max(0, Number(fee.finalAmount) - paid),
        dueDate: fee.dueDate,
        daysOverdue: Math.max(0, daysOverdue),
        status: fee.status,
      };
    });

    const totalOverdue = rows.reduce((sum, r) => sum + r.remaining, 0);
    return { totalOverdue, count: fees.length, rows };
  }
}
