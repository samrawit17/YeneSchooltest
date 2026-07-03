import { HttpStatus, BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LocalizedException } from '../core/localization';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService, NotificationType } from '../notification/notification.service';
import { Role } from '../auth/types/role.enum';
import { Prisma } from '@prisma/client';
import { CalendarType, ETHIOPIAN_MONTH_NAMES, toEthiopianDate } from '../common/date.util';
import type { UpsertPayrollSalaryDto, CreatePayrollRunDto, PayrollQueryDto, UpdatePayrollRunStatusDto, UpdatePayrollEntryStatusDto } from './payroll.dto';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async listPayrollStaff(schoolId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        deletedAt: null,
        role: { in: this.getPayrollStaffRoles() },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        teacherProfile: {
          select: {
            employeeId: true,
            designation: true,
            department: { select: { name: true } },
          },
        },
        financeProfile: {
          select: {
            employeeId: true,
            department: { select: { name: true } },
          },
        },
        payrollSalaries: {
          where: { schoolId },
          take: 1,
          select: {
            id: true,
            baseSalary: true,
            allowances: true,
            deductions: true,
            bankName: true,
            bankAccount: true,
            tinNumber: true,
            isActive: true,
            effectiveFrom: true,
            notes: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      employeeId:
        user.teacherProfile?.employeeId ||
        user.financeProfile?.employeeId ||
        null,
      designation:
        user.teacherProfile?.designation ||
        (user.role === Role.FINANCE ? 'Finance Staff' : null),
      department:
        user.teacherProfile?.department?.name ||
        user.financeProfile?.department?.name ||
        null,
      salary: user.payrollSalaries[0] || null,
    }));
  }

  async listPayrollSalaries(schoolId: string) {
    return this.prisma.payrollSalary.findMany({
      where: { schoolId },
      include: {
        staffUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            teacherProfile: {
              select: {
                employeeId: true,
                designation: true,
                department: { select: { name: true } },
              },
            },
            financeProfile: {
              select: {
                employeeId: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async upsertPayrollSalary(user: any, dto: UpsertPayrollSalaryDto) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: dto.staffUserId,
        schoolId: dto.schoolId,
        deletedAt: null,
        role: { in: this.getPayrollStaffRoles() },
      },
      select: { id: true, name: true },
    });

    if (!staff) throw new LocalizedException('payroll.staff_member_not_found_for_this_school_b5cc1d91', undefined, HttpStatus.NOT_FOUND, 'Staff member not found for this school');

    const salary = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.payrollSalary.findUnique({
        where: {
          schoolId_staffUserId: {
            schoolId: dto.schoolId,
            staffUserId: dto.staffUserId,
          },
        },
      });

      const payload = {
        baseSalary: dto.baseSalary,
        allowances: dto.allowances ?? 0,
        deductions: dto.deductions ?? 0,
        bankName: dto.bankName || null,
        bankAccount: dto.bankAccount || null,
        tinNumber: dto.tinNumber || null,
        isActive: dto.isActive ?? true,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : new Date(),
        notes: dto.notes || null,
      };

      const saved = await tx.payrollSalary.upsert({
        where: {
          schoolId_staffUserId: {
            schoolId: dto.schoolId,
            staffUserId: dto.staffUserId,
          },
        },
        update: payload,
        create: {
          schoolId: dto.schoolId,
          staffUserId: dto.staffUserId,
          ...payload,
        },
      });

      await this.logAudit(tx, {
        schoolId: dto.schoolId,
        userId: user.id,
        action: existing ? 'UPDATE' : 'CREATE',
        entityType: 'PayrollSalary',
        entityId: saved.id,
        previousValue: existing,
        newValue: saved,
        amount: saved.baseSalary + saved.allowances - saved.deductions,
        description: `Payroll salary ${existing ? 'updated' : 'created'} for ${staff.name}`,
      });

      return saved;
    });

    return salary;
  }

  async listPayrollRuns(query: PayrollQueryDto) {
    const where: Prisma.PayrollRunWhereInput = { schoolId: query.schoolId };
    if (query.month) where.periodMonth = query.month;
    if (query.year) where.periodYear = query.year;
    if (query.status) where.status = query.status as any;

    const runs = await this.prisma.payrollRun.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
        _count: { select: { entries: true } },
      },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });

    const summary = runs.reduce(
      (sum, run) => ({
        runCount: sum.runCount + 1,
        entryCount: sum.entryCount + run.entryCount,
        grossAmount: sum.grossAmount + run.grossAmount,
        deductionsAmount: sum.deductionsAmount + run.deductionsAmount,
        netAmount: sum.netAmount + run.netAmount,
      }),
      { runCount: 0, entryCount: 0, grossAmount: 0, deductionsAmount: 0, netAmount: 0 },
    );

    return { runs, summary };
  }

  async getPayrollRun(schoolId: string, runId: string) {
    const run = await this.prisma.payrollRun.findFirst({
      where: { id: runId, schoolId },
      include: {
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        paidBy: { select: { id: true, name: true } },
        entries: {
          include: {
            staffUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                teacherProfile: {
                  select: { employeeId: true, designation: true, department: { select: { name: true } } },
                },
                financeProfile: {
                  select: { employeeId: true, department: { select: { name: true } } },
                },
              },
            },
          },
          orderBy: [{ staffUser: { name: 'asc' } }],
        },
      },
    });

    if (!run) throw new LocalizedException('payroll.payroll_run_not_found_861c8197', undefined, HttpStatus.NOT_FOUND, 'Payroll run not found');

    return run;
  }

  async createPayrollRun(user: any, dto: CreatePayrollRunDto) {
    const activeSalaries = await this.prisma.payrollSalary.findMany({
      where: {
        schoolId: dto.schoolId,
        isActive: true,
        staffUser: {
          isActive: true,
          deletedAt: null,
          role: { in: this.getPayrollStaffRoles() },
        },
      },
      include: { staffUser: { select: { id: true, name: true } } },
      orderBy: [{ staffUser: { name: 'asc' } }],
    });

    if (activeSalaries.length === 0) throw new LocalizedException('payroll.add_at_least_one_active_staff_salary_before_creating_payroll_8e71f754', undefined, undefined, 'Add at least one active staff salary before creating payroll');

    const calendarType = await this.getSchoolCalendarType(dto.schoolId);

    try {
      const runId = await this.prisma.$transaction(async (tx) => {
        const run = await tx.payrollRun.create({
          data: {
            schoolId: dto.schoolId,
            title: dto.title || this.getPayrollRunTitle(dto.periodMonth, dto.periodYear, calendarType),
            periodMonth: dto.periodMonth,
            periodYear: dto.periodYear,
            periodCalendarType: calendarType,
            paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
            notes: dto.notes || null,
            createdById: user.id,
          },
        });

        await tx.payrollEntry.createMany({
          data: activeSalaries.map((salary) => {
            const totals = this.calculatePayrollTotals(salary);
            return {
              runId: run.id,
              schoolId: dto.schoolId,
              staffUserId: salary.staffUserId,
              salaryId: salary.id,
              baseSalary: salary.baseSalary,
              allowances: salary.allowances,
              deductions: salary.deductions,
              grossPay: totals.grossPay,
              netPay: totals.netPay,
              status: 'PENDING',
            };
          }),
        });

        await this.refreshPayrollRunTotals(tx, run.id);
        await this.logAudit(tx, {
          schoolId: dto.schoolId,
          userId: user.id,
          action: 'CREATE',
          entityType: 'PayrollRun',
          entityId: run.id,
          newValue: run,
          amount: 0,
          description: `Payroll run created for ${dto.periodMonth}/${dto.periodYear}`,
        });

        return run.id;
      });

      return this.getPayrollRun(dto.schoolId, runId);
    } catch (error: any) {
      if (this.isUniqueConstraintError(error)) throw new LocalizedException('payroll.payroll_already_exists_for_this_month_cdb8a7e1', undefined, undefined, 'Payroll already exists for this month');
      throw error;
    }
  }

  async updatePayrollRunStatus(user: any, runId: string, dto: UpdatePayrollRunStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.findFirst({
        where: { id: runId, schoolId: dto.schoolId },
      });

      if (!run) throw new LocalizedException('payroll.payroll_run_not_found_861c8197', undefined, HttpStatus.NOT_FOUND, 'Payroll run not found');
      if (run.status === 'PAID') throw new LocalizedException('payroll.paid_payroll_runs_cannot_be_changed_0218fe6f', undefined, undefined, 'Paid payroll runs cannot be changed');
      if (run.status === 'CANCELLED') throw new LocalizedException('payroll.cancelled_payroll_runs_cannot_be_changed_0efd96c3', undefined, undefined, 'Cancelled payroll runs cannot be changed');

      if (run.status !== dto.status) {
        const allowedTransitions: Record<string, string[]> = {
          DRAFT: ['APPROVED', 'CANCELLED'],
          APPROVED: ['PAID', 'CANCELLED'],
        };
        const allowedNextStatuses = allowedTransitions[run.status] || [];
        if (!allowedNextStatuses.includes(dto.status)) throw new LocalizedException('payroll.payroll_run_must_move_from_draft_to_approved_before_payment_73789a07', undefined, undefined, 'Payroll run must move from DRAFT to APPROVED before payment');
      }

      const statusData: Record<string, any> = {
        status: dto.status,
        notes: dto.notes ?? run.notes,
      };

      if (dto.status === 'APPROVED') {
        statusData.approvedById = user.id;
        await tx.payrollEntry.updateMany({
          where: { runId, status: 'PENDING' },
          data: { status: 'APPROVED' },
        });
      }

      if (dto.status === 'PAID') {
        const entryStatuses = await tx.payrollEntry.groupBy({
          by: ['status'],
          where: { runId },
          _count: { _all: true },
        });
        const counts = entryStatuses.reduce<Record<string, number>>(
          (sum, row) => ({ ...sum, [row.status]: row._count._all }), {},
        );
        if (counts.PENDING) throw new LocalizedException('payroll.approve_the_payroll_run_before_marking_it_paid_198b4953', undefined, undefined, 'Approve the payroll run before marking it paid');
        if (!counts.APPROVED && !counts.PAID) throw new LocalizedException('payroll.payroll_has_no_payable_entries_to_mark_as_paid_c03e05c2', undefined, undefined, 'Payroll has no payable entries to mark as paid');

        statusData.paidById = user.id;
        statusData.paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : run.paymentDate || new Date();
        statusData.paidAt = new Date();
        await tx.payrollEntry.updateMany({
          where: { runId, status: 'APPROVED' },
          data: { status: 'PAID', paidAt: statusData.paidAt },
        });
      }

      const updated = await tx.payrollRun.update({
        where: { id: runId },
        data: statusData,
      });

      await this.logAudit(tx, {
        schoolId: dto.schoolId,
        userId: user.id,
        action: dto.status,
        entityType: 'PayrollRun',
        entityId: runId,
        previousValue: run,
        newValue: updated,
        amount: updated.netAmount,
        description: `Payroll run marked ${dto.status}`,
      });

      return updated;
    });
  }

  async updatePayrollEntryStatus(user: any, entryId: string, dto: UpdatePayrollEntryStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.payrollEntry.findFirst({
        where: { id: entryId, schoolId: dto.schoolId },
        include: { run: { select: { status: true } } },
      });

      if (!entry) throw new LocalizedException('payroll.payroll_entry_not_found_4bba9b4b', undefined, HttpStatus.NOT_FOUND, 'Payroll entry not found');
      if (entry.run.status === 'PAID' || entry.run.status === 'CANCELLED') throw new LocalizedException('payroll.entries_cannot_be_changed_after_the_payroll_run_is_final_25b100e3', undefined, undefined, 'Entries cannot be changed after the payroll run is final');
      if (entry.status === 'PAID' && dto.status !== 'PAID') throw new LocalizedException('payroll.paid_payroll_entries_cannot_be_reopened_c95a43d6', undefined, undefined, 'Paid payroll entries cannot be reopened');
      if (dto.status === 'PAID' && entry.run.status !== 'APPROVED') throw new LocalizedException('payroll.approve_the_payroll_run_before_paying_staff_entries_63a39624', undefined, undefined, 'Approve the payroll run before paying staff entries');

      const updated = await tx.payrollEntry.update({
        where: { id: entryId },
        data: {
          status: dto.status as any,
          paymentMethod: (dto.paymentMethod || entry.paymentMethod) as any,
          transactionReference: dto.transactionReference || entry.transactionReference,
          notes: dto.notes ?? entry.notes,
          paidAt: dto.status === 'PAID' ? new Date() : entry.paidAt,
        },
      });

      await this.refreshPayrollRunTotals(tx, entry.runId);
      await this.logAudit(tx, {
        schoolId: dto.schoolId,
        userId: user.id,
        action: dto.status,
        entityType: 'PayrollEntry',
        entityId: entryId,
        previousValue: entry,
        newValue: updated,
        amount: updated.netPay,
        reference: updated.transactionReference || undefined,
        description: `Payroll entry marked ${dto.status}`,
      });

      return updated;
    });
  }

  // ─── Cron Jobs ──────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyFinanceForUpcomingPayrollPayments() {
    for (const daysBefore of [5, 2]) {
      const targetStart = new Date();
      targetStart.setDate(targetStart.getDate() + daysBefore);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(targetStart);
      targetEnd.setHours(23, 59, 59, 999);

      const payrollRuns = await this.prisma.payrollRun.findMany({
        where: {
          status: { notIn: ['PAID', 'CANCELLED'] },
          paymentDate: { gte: targetStart, lte: targetEnd },
        },
        select: {
          id: true, schoolId: true, title: true,
          periodMonth: true, periodYear: true, periodCalendarType: true,
          paymentDate: true, netAmount: true,
        },
      });

      for (const run of payrollRuns) {
        try {
          await this.notifyFinanceForPayrollRunDue(run, daysBefore);
        } catch (error: any) {
          this.logger.error(`Failed to send payroll reminder for ${run.title}: ${error?.message || error}`);
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async notifyFinanceToCreateCurrentPayrollRun() {
    const schools = await this.prisma.school.findMany({
      where: { isActive: true, payrollSalaries: { some: { isActive: true } } },
      select: { id: true, name: true },
    });

    for (const school of schools) {
      try {
        const calendarType = await this.getSchoolCalendarType(school.id);
        const period = this.getCurrentPayrollPeriod(calendarType);
        const existingRun = await this.prisma.payrollRun.findFirst({
          where: {
            schoolId: school.id,
            periodCalendarType: calendarType,
            periodMonth: period.month,
            periodYear: period.year,
            status: { not: 'CANCELLED' },
          },
          select: { id: true },
        });

        if (existingRun) continue;
        await this.notifyFinanceForMissingPayrollRun(school, period.month, period.year, calendarType);
      } catch (error: any) {
        this.logger.error(`Failed to send payroll run creation reminder for ${school.name}: ${error?.message || error}`);
      }
    }
  }

  // ─── Private Methods ────────────────────────────────────────────

  private getPayrollStaffRoles() {
    return [Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.FINANCE];
  }

  private getPayrollRunTitle(month: number, year: number, calendarType: CalendarType = 'GREGORIAN') {
    if (calendarType === 'ETHIOPIAN') {
      const monthName = ETHIOPIAN_MONTH_NAMES[month - 1] || `Month ${month}`;
      return `${monthName} ${year} E.C. Payroll`;
    }
    return `${new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' })} ${year} Payroll`;
  }

  private calculatePayrollTotals(row: { baseSalary: number; allowances?: number | null; deductions?: number | null; bonus?: number | null; tax?: number | null }) {
    const baseSalary = Number(row.baseSalary || 0);
    const allowances = Number(row.allowances || 0);
    const deductions = Number(row.deductions || 0);
    const bonus = Number(row.bonus || 0);
    const tax = Number(row.tax || 0);
    const grossPay = baseSalary + allowances + bonus;
    const netPay = Math.max(0, grossPay - deductions - tax);
    return {
      grossPay: Math.round(grossPay * 100) / 100,
      deductionsAmount: Math.round((deductions + tax) * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
    };
  }

  private async getSchoolCalendarType(schoolId: string): Promise<CalendarType> {
    const setting = await this.prisma.schoolSetting.findUnique({
      where: { schoolId_key: { schoolId, key: 'calendar_type' } },
      select: { value: true },
    });
    return setting?.value === 'GREGORIAN' ? 'GREGORIAN' : 'ETHIOPIAN';
  }

  private getCurrentPayrollPeriod(calendarType: CalendarType) {
    const today = new Date();
    if (calendarType === 'ETHIOPIAN') {
      const ethiopian = toEthiopianDate(today);
      return { month: ethiopian.month, year: ethiopian.year };
    }
    return { month: today.getMonth() + 1, year: today.getFullYear() };
  }

  private getPayrollPeriodLabel(month: number, year: number, calendarType: CalendarType) {
    if (calendarType === 'ETHIOPIAN') {
      const monthName = ETHIOPIAN_MONTH_NAMES[month - 1] || `Month ${month}`;
      return `${monthName} ${year} E.C.`;
    }
    return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  private async refreshPayrollRunTotals(tx: any, runId: string) {
    const entries = await tx.payrollEntry.findMany({
      where: { runId },
      select: { grossPay: true, deductions: true, tax: true, netPay: true, status: true },
    });
    const payableEntries = entries.filter((e: any) => e.status !== 'HELD');
    const totals = payableEntries.reduce(
      (sum: any, entry: any) => ({
        grossAmount: sum.grossAmount + Number(entry.grossPay || 0),
        deductionsAmount: sum.deductionsAmount + Number(entry.deductions || 0) + Number(entry.tax || 0),
        netAmount: sum.netAmount + Number(entry.netPay || 0),
      }),
      { grossAmount: 0, deductionsAmount: 0, netAmount: 0 },
    );

    return tx.payrollRun.update({
      where: { id: runId },
      data: {
        grossAmount: Math.round(totals.grossAmount * 100) / 100,
        deductionsAmount: Math.round(totals.deductionsAmount * 100) / 100,
        netAmount: Math.round(totals.netAmount * 100) / 100,
        entryCount: payableEntries.length,
      },
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as any).code === 'P2002'
    );
  }

  private async logAudit(tx: any, data: {
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
  }) {
    const row = await tx.financeAuditLog.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        previousValue: data.previousValue ?? undefined,
        newValue: data.newValue ?? undefined,
        amount: data.amount ?? undefined,
        reference: data.reference ?? null,
        description: data.description || '',
      },
    });
    return row;
  }

  private async notifyFinanceForMissingPayrollRun(
    school: { id: string; name: string },
    periodMonth: number,
    periodYear: number,
    calendarType: CalendarType,
  ) {
    const financeUsers = await this.prisma.user.findMany({
      where: { schoolId: school.id, role: Role.FINANCE, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (financeUsers.length === 0) return;

    const periodLabel = this.getPayrollPeriodLabel(periodMonth, periodYear, calendarType);
    const title = `Create ${periodLabel} payroll run`;
    const message = `No payroll run has been created for ${periodLabel}. Create the monthly run so salaries can be reviewed, approved, and paid.`;

    for (const financeUser of financeUsers) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          schoolId: school.id,
          userId: financeUser.id,
          type: NotificationType.PAYROLL_RUN_REQUIRED,
          metadata: { contains: `"periodCalendarType":"${calendarType}"` },
          AND: [
            { metadata: { contains: `"periodMonth":${periodMonth}` } },
            { metadata: { contains: `"periodYear":${periodYear}` } },
            { metadata: { contains: `"reminder":"create-payroll-run"` } },
          ],
        },
        select: { id: true },
      });
      if (existing) continue;
      await this.notificationService.createNotification({
        schoolId: school.id,
        userId: financeUser.id,
        title,
        message,
        type: NotificationType.PAYROLL_RUN_REQUIRED,
        actionUrl: '/finance/payroll',
        metadata: { periodMonth, periodYear, periodCalendarType: calendarType, reminder: 'create-payroll-run' },
      });
    }
  }

  private async notifyFinanceForPayrollRunDue(
    run: { id: string; schoolId: string; title: string; periodMonth: number; periodYear: number; periodCalendarType?: string | null; paymentDate: Date | null; netAmount: number },
    daysBefore: number,
  ) {
    const financeUsers = await this.prisma.user.findMany({
      where: { schoolId: run.schoolId, role: Role.FINANCE, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (financeUsers.length === 0) return;

    const schoolCalendarType = await this.getSchoolCalendarType(run.schoolId);
    const calendarType: CalendarType =
      run.periodCalendarType === 'ETHIOPIAN' || run.periodCalendarType === 'GREGORIAN'
        ? run.periodCalendarType : schoolCalendarType;
    const periodLabel = this.getPayrollPeriodLabel(run.periodMonth, run.periodYear, calendarType);
    const amount = Number(run.netAmount || 0).toLocaleString('en-US', { style: 'currency', currency: 'ETB' });
    const dateStr = run.paymentDate
      ? run.paymentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'TBD';

    for (const financeUser of financeUsers) {
      await this.notificationService.createNotification({
        schoolId: run.schoolId,
        userId: financeUser.id,
        title: `${run.title} Due in ${daysBefore} Days`,
        message: `${run.title} totaling ${amount} is due on ${dateStr}. Please approve and process the payroll.`,
        type: NotificationType.PAYROLL_PAYMENT_DUE,
        actionUrl: '/finance/payroll',
        metadata: { runId: run.id, title: run.title, periodMonth: run.periodMonth, periodYear: run.periodYear, netAmount: run.netAmount, paymentDate: run.paymentDate, daysBefore },
      });
    }
  }
}
