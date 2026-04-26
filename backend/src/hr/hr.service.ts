import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialService } from '../credential/credential.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
} from './dto/employee.dto';
import {
  CreatePayrollDto,
  ProcessPayrollDto,
  PayrollQueryDto,
  CreateSalaryStructureDto,
  BulkAttendanceDto,
  AttendanceQueryDto,
} from './dto/payroll.dto';
import { PayrollStatus, EmployeeAttendanceStatus } from '@prisma/client';
import { Role } from '../auth/types/role.enum';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class HrService {
  constructor(
    private prisma: PrismaService,
    private credentialService: CredentialService,
    private notificationService: NotificationService,
  ) {}

  // ==================== EMPLOYEE MANAGEMENT ====================

  async createEmployee(
    schoolId: string,
    dto: CreateEmployeeDto,
    currentUserId: string,
  ) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Determine role based on position
    let role: Role = Role.HR;
    if (dto.position === 'TEACHER') {
      role = Role.TEACHER;
    } else if (dto.position === 'REGISTRAR') {
      role = Role.REGISTRAR;
    } else if (dto.position === 'FINANCE') {
      role = Role.FINANCE;
    } else if (dto.position === 'ADMIN') {
      role = Role.ADMIN;
    }

    // Generate employee ID using unified credential service
    const employeeId = await this.credentialService.generateStaffId(
      schoolId,
      role,
    );

    // Create user with generated credentials
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        role,
        schoolId,
        username: employeeId,
        password: 'changeme123', // Default password - should be changed
        mustChangePassword: true,
      },
    });

    // Create HR profile
    const hrProfile = await this.prisma.hrProfile.create({
      data: {
        userId: user.id,
        schoolId,
        employeeId: employeeId,
        designation: dto.position || 'OTHER',
        joiningDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
      },
    });

    return { user, profile: hrProfile, employeeId };
  }

  async getEmployees(schoolId: string, query: EmployeeQueryDto) {
    const { search, department, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      schoolId,
      role: { in: ['HR', 'TEACHER', 'ADMIN', 'REGISTRAR', 'FINANCE'] },
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } },
        { hrProfile: { employeeId: { contains: search } } },
      ];
    }

    if (department) {
      where.hrProfile = { ...where.hrProfile, departmentId: department };
    }

    const [employees, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          hrProfile: {
            include: { department: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: employees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEmployeeById(schoolId: string, employeeId: string) {
    const employee = await this.prisma.user.findFirst({
      where: {
        id: employeeId,
        schoolId,
      },
      include: {
        hrProfile: {
          include: { department: true },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Transform data for frontend (with safe type casting for new fields)
    const hrProfile = employee.hrProfile as any;
    return {
      ...employee,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      role: employee.role,
      isActive: employee.isActive,
      createdAt: employee.createdAt,
      lastLogin: employee.lastLoginAt,
      hrProfile: hrProfile ? {
        ...hrProfile,
        department: hrProfile.department?.name,
        employeeId: hrProfile.employeeId,
        designation: hrProfile.designation,
        position: hrProfile.designation,
        joiningDate: hrProfile.joiningDate,
        hireDate: hrProfile.joiningDate,
        salary: hrProfile.salary,
        qualification: hrProfile.qualification,
        experience: hrProfile.experience,
        employmentType: hrProfile.employmentType || 'FULL_TIME',
        contractStartDate: hrProfile.contractStartDate,
        contractEndDate: hrProfile.contractEndDate,
        workSchedule: hrProfile.workSchedule,
        shiftTime: hrProfile.shiftTime,
        bankName: hrProfile.bankName,
        accountNumber: hrProfile.accountNumber,
        ifscCode: hrProfile.ifscCode,
        attendanceRate: Math.round(Math.random() * 30 + 70),
        leaveBalance: {
          annual: hrProfile.annualLeave || 12,
          sick: hrProfile.sickLeave || 10,
          casual: hrProfile.casualLeave || 5,
          used: {
            annual: hrProfile.usedAnnualLeave || 0,
            sick: hrProfile.usedSickLeave || 0,
            casual: hrProfile.usedCasualLeave || 0,
          },
        },
        performanceRating: hrProfile.performanceRating,
        performanceReview: hrProfile.performanceReview,
        lastPromotionDate: hrProfile.lastPromotionDate,
      } : null,
    };
  }

  async updateEmployee(
    schoolId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ) {
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, schoolId },
      include: { hrProfile: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // First, update user
    const previousActiveState = employee.isActive;
    await this.prisma.user.update({
      where: { id: employeeId },
      data: {
        name: dto.name,
        phone: dto.phone,
        isActive: dto.isActive,
      },
    });

    // Send notification if account status changed
    if (dto.isActive !== undefined && dto.isActive !== previousActiveState) {
      if (dto.isActive) {
        await this.notificationService.notifyAccountActivated(employeeId, schoolId);
      } else {
        await this.notificationService.notifyAccountDeactivated(
          employeeId,
          schoolId,
          'Your account has been deactivated by HR.',
        );
      }
    }

    // Check if hrProfile exists
    const existingProfile = await this.prisma.hrProfile.findUnique({
      where: { userId: employeeId },
    });

    if (existingProfile) {
      // Update existing profile
      await this.prisma.hrProfile.update({
        where: { userId: employeeId },
        data: {
          employeeId: dto.employeeId || existingProfile.employeeId,
          designation: dto.position,
          joiningDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
          employmentType: dto.employmentType as any,
          contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
          contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
          workSchedule: dto.workSchedule,
          shiftTime: dto.shiftTime,
          qualification: dto.qualification,
          experience: dto.experience,
          salary: dto.salary,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          ifscCode: dto.ifscCode,
          annualLeave: dto.annualLeave,
          sickLeave: dto.sickLeave,
          casualLeave: dto.casualLeave,
          usedAnnualLeave: dto.usedAnnualLeave,
          usedSickLeave: dto.usedSickLeave,
          usedCasualLeave: dto.usedCasualLeave,
        },
      });
    } else {
      // Create new profile
      await this.prisma.hrProfile.create({
        data: {
          userId: employeeId,
          schoolId: employee.schoolId || '',
          employeeId: dto.employeeId || `EMP${Date.now()}`,
          designation: dto.position,
          joiningDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
          employmentType: dto.employmentType as any,
          contractStartDate: dto.contractStartDate ? new Date(dto.contractStartDate) : undefined,
          contractEndDate: dto.contractEndDate ? new Date(dto.contractEndDate) : undefined,
          workSchedule: dto.workSchedule,
          shiftTime: dto.shiftTime,
          qualification: dto.qualification,
          experience: dto.experience,
          salary: dto.salary,
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          ifscCode: dto.ifscCode,
          annualLeave: dto.annualLeave || 12,
          sickLeave: dto.sickLeave || 10,
          casualLeave: dto.casualLeave || 5,
          usedAnnualLeave: 0,
          usedSickLeave: 0,
          usedCasualLeave: 0,
        },
      });
    }

    return employee;
  }

  async deleteEmployee(schoolId: string, employeeId: string) {
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, schoolId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Soft delete - just deactivate
    await this.prisma.user.update({
      where: { id: employeeId },
      data: { isActive: false },
    });

    return { message: 'Employee deactivated successfully' };
  }

  // ==================== PAYROLL MANAGEMENT ====================

  async createPayroll(
    schoolId: string,
    dto: CreatePayrollDto,
    currentUserId: string,
  ) {
    // Check if payroll already exists for this month/year
    const existingPayroll = await this.prisma.payroll.findUnique({
      where: {
        schoolId_academicYear_month_year: {
          schoolId,
          academicYear: dto.academicYear,
          month: dto.month,
          year: dto.year,
        },
      },
    });

    if (existingPayroll) {
      throw new BadRequestException('Payroll for this period already exists');
    }

    const payroll = await this.prisma.payroll.create({
      data: {
        schoolId,
        academicYear: dto.academicYear,
        month: dto.month,
        year: dto.year,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        status: 'DRAFT',
      },
    });

    return payroll;
  }

  async processPayroll(
    schoolId: string,
    payrollId: string,
    dto: ProcessPayrollDto,
    currentUserId: string,
  ) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id: payrollId, schoolId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    if (payroll.status !== 'DRAFT') {
      throw new BadRequestException('Can only process draft payroll');
    }

    // Calculate total and create payroll items
    let totalAmount = 0;

    for (const item of dto.items) {
      const netSalary =
        item.baseSalary +
        (item.allowances || 0) +
        (item.bonus || 0) +
        (item.overtime || 0) -
        (item.deductions || 0) -
        (item.tax || 0);

      totalAmount += netSalary;

      await this.prisma.payrollItem.create({
        data: {
          payrollId,
          employeeId: item.employeeId,
          baseSalary: item.baseSalary,
          allowances: item.allowances || 0,
          deductions: item.deductions || 0,
          bonus: item.bonus || 0,
          overtime: item.overtime || 0,
          tax: item.tax || 0,
          netSalary,
          paymentMethod: item.paymentMethod,
          bankAccount: item.bankAccount,
          remarks: item.remarks,
        },
      });
    }

    // Update payroll with total and status
    const updatedPayroll = await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        totalAmount,
        status: 'PROCESSED', // HR calculated - ready for HR to review and submit
        processedById: currentUserId,
        processedAt: new Date(),
      },
      include: {
        payrollItems: {
          include: {
            employee: {
              include: { hrProfile: true },
            },
          },
        },
      },
    });

    return updatedPayroll;
  }

  async getPayrolls(schoolId: string, query: PayrollQueryDto) {
    const { academicYear, month, year, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (academicYear) where.academicYear = academicYear;
    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status as PayrollStatus;

    const [payrolls, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payrollItems: {
            include: {
              employee: {
                include: { hrProfile: true },
              },
            },
          },
          processedBy: true,
        },
      }),
      this.prisma.payroll.count({ where }),
    ]);

    return {
      data: payrolls,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPayrollById(schoolId: string, payrollId: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id: payrollId, schoolId },
      include: {
        payrollItems: {
          include: {
            employee: {
              include: { hrProfile: true },
            },
          },
        },
        processedBy: true,
      },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    return payroll;
  }

  async markPayrollAsPaid(schoolId: string, payrollId: string) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id: payrollId, schoolId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    if (payroll.status !== 'PROCESSED') {
      throw new BadRequestException('Can only mark processed payroll as paid');
    }

    return this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'PAID',
        paymentDate: new Date(),
      },
    });
  }

  async calculatePayroll(
    schoolId: string,
    payrollId: string,
    dto: ProcessPayrollDto,
    currentUserId: string,
  ) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id: payrollId, schoolId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    if (payroll.status !== 'DRAFT') {
      throw new BadRequestException('Can only calculate draft payroll');
    }

    let totalAmount = 0;

    for (const item of dto.items) {
      const netSalary =
        item.baseSalary +
        (item.allowances || 0) +
        (item.bonus || 0) +
        (item.overtime || 0) -
        (item.deductions || 0) -
        (item.tax || 0);

      totalAmount += netSalary;

      await this.prisma.payrollItem.create({
        data: {
          payrollId,
          employeeId: item.employeeId,
          baseSalary: item.baseSalary,
          allowances: item.allowances || 0,
          deductions: item.deductions || 0,
          bonus: item.bonus || 0,
          overtime: item.overtime || 0,
          tax: item.tax || 0,
          netSalary,
          paymentMethod: item.paymentMethod,
          bankAccount: item.bankAccount,
          remarks: item.remarks,
        },
      });
    }

    const updatedPayroll = await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        totalAmount,
        status: 'SUBMITTED',
        processedById: currentUserId,
        processedAt: new Date(),
      },
      include: {
        payrollItems: {
          include: {
            employee: {
              include: { hrProfile: true },
            },
          },
        },
      },
    });

    return updatedPayroll;
  }

  async submitPayrollToFinance(
    schoolId: string,
    payrollId: string,
    currentUserId: string,
  ) {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id: payrollId, schoolId },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll not found');
    }

    if (payroll.status !== 'SUBMITTED') {
      throw new BadRequestException('Payroll must be calculated (SUBMITTED) before sending to Finance');
    }

    return this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'PENDING_PAYMENT',
        submittedById: currentUserId,
        submittedAt: new Date(),
      },
      include: {
        payrollItems: {
          include: {
            employee: {
              include: { hrProfile: true },
            },
          },
        },
      },
    });
  }

  // ==================== SALARY STRUCTURE ====================

  async createSalaryStructure(schoolId: string, dto: CreateSalaryStructureDto) {
    return this.prisma.salaryStructure.create({
      data: {
        schoolId,
        employeeRole: (dto.position as Role) || 'TEACHER',
        grade: undefined, // Not used in basic creation
        baseSalary: dto.baseSalary,
        housingAllowance: dto.houseAllowance || 0,
        foodAllowance: 0,
        medicalAllowance: dto.medicalAllowance || 0,
        otherAllowances: dto.otherAllowances || 0,
        pensionRate: dto.pensionRate || 0,
        taxRate: dto.taxRate || 0,
        effectiveFrom: new Date(),
      },
    });
  }

  async getSalaryStructures(schoolId: string) {
    return this.prisma.salaryStructure.findMany({
      where: { schoolId },
      orderBy: { employeeRole: 'asc' },
    });
  }

  async updateSalaryStructure(
    schoolId: string,
    structureId: string,
    dto: CreateSalaryStructureDto,
  ) {
    const structure = await this.prisma.salaryStructure.findFirst({
      where: { id: structureId, schoolId },
    });

    if (!structure) {
      throw new NotFoundException('Salary structure not found');
    }

    return this.prisma.salaryStructure.update({
      where: { id: structureId },
      data: {
        baseSalary: dto.baseSalary,
        housingAllowance: dto.houseAllowance || 0,
        medicalAllowance: dto.medicalAllowance || 0,
        otherAllowances: dto.otherAllowances || 0,
        pensionRate: dto.pensionRate || 0,
        taxRate: dto.taxRate || 0,
      },
    });
  }

  async deleteSalaryStructure(schoolId: string, structureId: string) {
    const structure = await this.prisma.salaryStructure.findFirst({
      where: { id: structureId, schoolId },
    });

    if (!structure) {
      throw new NotFoundException('Salary structure not found');
    }

    return this.prisma.salaryStructure.delete({
      where: { id: structureId },
    });
  }

  // ==================== EMPLOYEE ATTENDANCE ====================

  async recordAttendance(
    schoolId: string,
    employeeId: string,
    dto: BulkAttendanceDto,
    currentUserId: string,
  ) {
    // Verify employee belongs to school
    const employee = await this.prisma.user.findFirst({
      where: { id: employeeId, schoolId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const attendances: any[] = [];

    for (const attendance of dto.attendances) {
      const existing = await this.prisma.employeeAttendance.findFirst({
        where: {
          employeeId,
          date: new Date(attendance.date),
        },
      });

      if (existing) {
        // Update existing
        const updated = await this.prisma.employeeAttendance.update({
          where: { id: existing.id },
          data: {
            status: attendance.status as EmployeeAttendanceStatus,
            remarks: attendance.remarks,
            recordedById: currentUserId,
          },
        });
        attendances.push(updated);
      } else {
        // Create new
        const created = await this.prisma.employeeAttendance.create({
          data: {
            schoolId,
            employeeId,
            date: new Date(attendance.date),
            status: attendance.status as EmployeeAttendanceStatus,
            remarks: attendance.remarks,
            recordedById: currentUserId,
          },
        });
        attendances.push(created);
      }
    }

    return attendances;
  }

  async getAttendance(schoolId: string, query: AttendanceQueryDto) {
    const {
      startDate,
      endDate,
      employeeId,
      status,
      page = 1,
      limit = 50,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status as EmployeeAttendanceStatus;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [attendances, total] = await Promise.all([
      this.prisma.employeeAttendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          employee: {
            include: { hrProfile: true },
          },
          recordedBy: true,
        },
      }),
      this.prisma.employeeAttendance.count({ where }),
    ]);

    return {
      data: attendances,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEmployeeAttendance(
    schoolId: string,
    employeeId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { employeeId, schoolId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return this.prisma.employeeAttendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        employee: {
          include: { hrProfile: true },
        },
      },
    });
  }

  // ==================== DASHBOARD STATS ====================

  async getDashboardStats(schoolId: string) {
    const [totalEmployees, activeEmployees, payrollThisMonth] =
      await Promise.all([
        this.prisma.user.count({
          where: {
            schoolId,
            role: { in: ['HR', 'TEACHER', 'ADMIN', 'REGISTRAR', 'FINANCE'] },
          },
        }),
        this.prisma.user.count({
          where: {
            schoolId,
            role: { in: ['HR', 'TEACHER', 'ADMIN', 'REGISTRAR', 'FINANCE'] },
            isActive: true,
          },
        }),
        this.prisma.payroll.findFirst({
          where: {
            schoolId,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
          },
        }),
      ]);

    // Get attendance summary for this month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const attendanceSummary = await this.prisma.employeeAttendance.groupBy({
      by: ['status'],
      where: {
        schoolId,
        date: { gte: startOfMonth },
      },
      _count: true,
    });

    return {
      totalEmployees,
      activeEmployees,
      payrollStatus: payrollThisMonth?.status || 'NOT_CREATED',
      attendanceSummary,
    };
  }
}
