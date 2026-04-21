import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  LeaveRequestQueryDto,
  LeaveType,
  LeaveStatus,
} from './dto/leave-request.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class LeaveRequestService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(schoolId: string, employeeId: string, dto: CreateLeaveRequestDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const totalDays = this.calculateWorkingDays(startDate, endDate);

    if (totalDays <= 0) {
      throw new BadRequestException('Leave request must include at least 1 working day');
    }

    const leaveTypeStr = String(dto.leaveType);
    
    // Check leave balance for paid leave types
    if (leaveTypeStr !== 'WITHOUT_PAY') {
      let hasBalance = await this.checkLeaveBalance(employeeId, dto.leaveType, totalDays);
      
      // If no HrProfile exists or insufficient balance, create/update with default balance
      if (!hasBalance) {
        const hrProfile = await this.prisma.hrProfile.findUnique({
          where: { userId: employeeId },
        });
        
        if (!hrProfile) {
          // Create HrProfile with default leave balance
          await this.prisma.hrProfile.create({
            data: {
              userId: employeeId,
              schoolId,
              employeeId: `EMP${Date.now()}`,
              annualLeave: 12,
              sickLeave: 10,
              casualLeave: 5,
              usedAnnualLeave: 0,
              usedSickLeave: 0,
              usedCasualLeave: 0,
            },
          });
        } else {
          // Update with default balance if it's zero
          await this.prisma.hrProfile.update({
            where: { userId: employeeId },
            data: {
              annualLeave: hrProfile.annualLeave || 12,
              sickLeave: hrProfile.sickLeave || 10,
              casualLeave: hrProfile.casualLeave || 5,
            },
          });
        }
        
        // Check balance again after setting defaults
        hasBalance = await this.checkLeaveBalance(employeeId, dto.leaveType, totalDays);
      }
      
      if (!hasBalance) {
        throw new BadRequestException(`Insufficient ${leaveTypeStr} leave balance`);
      }
    }

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        schoolId,
        employeeId,
        leaveType: dto.leaveType as any,
        startDate,
        endDate,
        totalDays,
        reason: dto.reason,
        contactDuringLeave: dto.contactDuringLeave,
        status: LeaveStatus.PENDING,
      },
    });

    // Get employee name for notification
    const employee = await this.prisma.user.findUnique({
      where: { id: employeeId },
      select: { name: true },
    });

    // Notify HR of new leave request
    await this.notificationService.notifyHROfNewLeaveRequest(
      schoolId,
      employee?.name || 'Employee',
      leaveTypeStr,
      startDate.toISOString().split('T')[0],
      totalDays,
    );

    return leaveRequest;
  }

  async findAll(schoolId: string, query: LeaveRequestQueryDto) {
    const { status, leaveType, employeeId, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { schoolId };

    if (status) {
      where.status = status;
    }

    if (leaveType) {
      where.leaveType = leaveType;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (search) {
      where.OR = [
        { employee: { name: { contains: search } } },
        { employee: { email: { contains: search } } },
        { reason: { contains: search } },
      ];
    }

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { id: true, name: true, email: true, phone: true, role: true },
          },
          approvedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyRequests(schoolId: string, employeeId: string, query: LeaveRequestQueryDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { schoolId, employeeId };

    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          approvedBy: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(schoolId: string, requestId: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, schoolId },
      include: {
        employee: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    return request;
  }

  async approve(schoolId: string, requestId: string, approverId: string, dto: ApproveLeaveRequestDto) {
    const request = await this.findById(schoolId, requestId);

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    // Update leave balance if paid leave
    const leaveType = String(request.leaveType);
    if (leaveType !== 'WITHOUT_PAY') {
      await this.decrementLeaveBalance(request.employeeId, request.leaveType as any, request.totalDays);
    }

    // Deactivate employee account during leave
    await this.prisma.user.update({
      where: { id: request.employeeId },
      data: { isActive: false },
    });

    // Send notification to employee
    await this.notificationService.notifyAccountDeactivated(
      request.employeeId,
      schoolId,
      `Your leave request for ${request.totalDays} day(s) of ${leaveType} has been approved. Your account has been deactivated for the leave period.`,
    );

    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveStatus.APPROVED,
        approvedById: approverId,
        rejectionReason: dto.comments,
      },
    });

    return updated;
  }

  async reject(schoolId: string, requestId: string, approverId: string, dto: RejectLeaveRequestDto) {
    const request = await this.findById(schoolId, requestId);

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveStatus.REJECTED,
        approvedById: approverId,
        rejectionReason: dto.rejectionReason,
      },
    });

    return updated;
  }

  async cancel(schoolId: string, employeeId: string, requestId: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, employeeId: employeeId, schoolId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveStatus.CANCELLED,
      },
    });

    return updated;
  }

  async getLeaveBalance(schoolId: string, employeeId: string) {
    const hrProfile = await this.prisma.hrProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!hrProfile) {
      return {
        annual: 12,
        sick: 10,
        casual: 5,
        used: { annual: 0, sick: 0, casual: 0 },
        available: { annual: 12, sick: 10, casual: 5 },
      };
    }

    return {
      annual: hrProfile.annualLeave,
      sick: hrProfile.sickLeave,
      casual: hrProfile.casualLeave,
      used: {
        annual: hrProfile.usedAnnualLeave,
        sick: hrProfile.usedSickLeave,
        casual: hrProfile.usedCasualLeave,
      },
      available: {
        annual: hrProfile.annualLeave - hrProfile.usedAnnualLeave,
        sick: hrProfile.sickLeave - hrProfile.usedSickLeave,
        casual: hrProfile.casualLeave - hrProfile.usedCasualLeave,
      },
    };
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let days = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  private async checkLeaveBalance(
    employeeId: string,
    leaveType: LeaveType,
    days: number,
  ): Promise<boolean> {
    const hrProfile = await this.prisma.hrProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!hrProfile) {
      return false;
    }

    switch (leaveType) {
      case LeaveType.ANNUAL:
        return hrProfile.annualLeave - hrProfile.usedAnnualLeave >= days;
      case LeaveType.SICK:
        return hrProfile.sickLeave - hrProfile.usedSickLeave >= days;
      case LeaveType.CASUAL:
        return hrProfile.casualLeave - hrProfile.usedCasualLeave >= days;
      default:
        return true;
    }
  }

  private async decrementLeaveBalance(
    employeeId: string,
    leaveType: LeaveType,
    days: number,
  ) {
    const hrProfile = await this.prisma.hrProfile.findUnique({
      where: { userId: employeeId },
    });

    if (!hrProfile) {
      return;
    }

    const updateData: any = {};

    switch (leaveType) {
      case LeaveType.ANNUAL:
        updateData.usedAnnualLeave = { increment: days };
        break;
      case LeaveType.SICK:
        updateData.usedSickLeave = { increment: days };
        break;
      case LeaveType.CASUAL:
        updateData.usedCasualLeave = { increment: days };
        break;
    }

    await this.prisma.hrProfile.update({
      where: { userId: employeeId },
      data: updateData,
    });
  }
}