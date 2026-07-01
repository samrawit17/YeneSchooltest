import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto, UpdateRuleDto, AutomationLogQueryDto } from './dto/automation-engine.dto';

@Injectable()
export class AutomationEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async listRules(schoolId: string, query: { page?: number; limit?: number; eventTrigger?: string }) {
    const where: any = { schoolId };
    if (query.eventTrigger) where.eventTrigger = query.eventTrigger;

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [rules, total] = await Promise.all([
      this.prisma.automationRule.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.automationRule.count({ where }),
    ]);

    return { data: rules, total, page, limit };
  }

  async getRule(schoolId: string, ruleId: string) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id: ruleId, schoolId },
    });
    if (!rule) throw new NotFoundException('Automation rule not found');
    return rule;
  }

  async createRule(schoolId: string, userId: string, dto: CreateRuleDto) {
    const triggerPattern = /^[a-z]+\.[a-z]+$/;
    if (!triggerPattern.test(dto.eventTrigger)) {
      throw new BadRequestException('eventTrigger must be in format "domain.event" (e.g. attendance.marked)');
    }
    if (!dto.actions || dto.actions.length === 0) {
      throw new BadRequestException('At least one action is required');
    }

    return this.prisma.automationRule.create({
      data: {
        schoolId,
        name: dto.name,
        description: dto.description,
        eventTrigger: dto.eventTrigger,
        conditions: (dto.conditions as any) || null,
        actions: dto.actions as any,
        isActive: dto.isActive ?? true,
        createdById: userId,
      },
    });
  }

  async updateRule(schoolId: string, ruleId: string, dto: UpdateRuleDto) {
    const existing = await this.getRule(schoolId, ruleId);

    if (dto.eventTrigger) {
      const triggerPattern = /^[a-z]+\.[a-z]+$/;
      if (!triggerPattern.test(dto.eventTrigger)) {
        throw new BadRequestException('eventTrigger must be in format "domain.event"');
      }
    }

    return this.prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.eventTrigger !== undefined ? { eventTrigger: dto.eventTrigger } : {}),
        ...(dto.conditions !== undefined ? { conditions: dto.conditions as any } : {}),
        ...(dto.actions !== undefined ? { actions: dto.actions as any } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteRule(schoolId: string, ruleId: string) {
    await this.getRule(schoolId, ruleId);
    await this.prisma.automationRule.delete({ where: { id: ruleId } });
    return { message: 'Rule deleted' };
  }

  async toggleRule(schoolId: string, ruleId: string, isActive: boolean) {
    await this.getRule(schoolId, ruleId);
    return this.prisma.automationRule.update({
      where: { id: ruleId },
      data: { isActive },
    });
  }

  async getLogs(schoolId: string, query: AutomationLogQueryDto) {
    const where: any = { schoolId };
    if (query.ruleId) where.ruleId = query.ruleId;
    if (query.status) where.status = query.status;
    if (query.eventType) where.eventType = query.eventType;

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.automationExecutionLog.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.automationExecutionLog.count({ where }),
    ]);

    return { data: logs, total, page, limit };
  }

  async getLog(schoolId: string, logId: string) {
    const log = await this.prisma.automationExecutionLog.findFirst({
      where: { id: logId, schoolId },
    });
    if (!log) throw new NotFoundException('Execution log not found');
    return log;
  }

  async getAvailableEventTypes() {
    return [
      { value: 'attendance.marked', label: 'Attendance Marked', description: 'When student attendance is recorded' },
      { value: 'attendance.bulk', label: 'Bulk Attendance', description: 'When bulk attendance is recorded' },
      { value: 'fee.overdue', label: 'Fee Overdue', description: 'When a fee payment becomes overdue' },
      { value: 'fee.paid', label: 'Fee Paid', description: 'When a fee payment is received' },
      { value: 'grade.published', label: 'Grade Published', description: 'When grades are published' },
      { value: 'student.created', label: 'Student Created', description: 'When a new student is enrolled' },
      { value: 'student.updated', label: 'Student Updated', description: 'When student profile is updated' },
      { value: 'exam.created', label: 'Exam Created', description: 'When a new exam is scheduled' },
      { value: 'exam.result', label: 'Exam Result Published', description: 'When exam results are published' },
      { value: 'discipline.created', label: 'Discipline Incident', description: 'When a discipline incident is recorded' },
      { value: 'enrollment.pending', label: 'Enrollment Pending', description: 'When a new enrollment request is submitted' },
      { value: 'enrollment.approved', label: 'Enrollment Approved', description: 'When an enrollment is approved' },
    ];
  }

  async getAvailableActionTypes() {
    return [
      { value: 'send_sms', label: 'Send SMS', description: 'Send an SMS notification to a phone number', fields: ['to', 'message'] },
      { value: 'send_email', label: 'Send Email', description: 'Send an email notification', fields: ['to', 'subject', 'body'] },
      { value: 'push_notification', label: 'Push Notification', description: 'Send in-app push notification', fields: ['title', 'message', 'userIds', 'role'] },
      { value: 'create_alert', label: 'Create Alert', description: 'Create a dashboard alert', fields: ['message', 'type', 'priority'] },
      { value: 'update_database_field', label: 'Update Database Field', description: 'Update a field in the database', fields: ['model', 'where', 'data'] },
    ];
  }
}
