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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationEngineService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const prisma_service_1 = require("../prisma/prisma.service");
let AutomationEngineService = class AutomationEngineService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listRules(schoolId, query) {
        const where = { schoolId };
        if (query.eventTrigger)
            where.eventTrigger = query.eventTrigger;
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
    async getRule(schoolId, ruleId) {
        const rule = await this.prisma.automationRule.findFirst({
            where: { id: ruleId, schoolId },
        });
        throw new localization_1.LocalizedException('automation_engine.automation_rule_not_found_1d10b924', undefined, common_1.HttpStatus.NOT_FOUND, 'Automation rule not found');
        return rule;
    }
    async createRule(schoolId, userId, dto) {
        const triggerPattern = /^[a-z]+\.[a-z]+$/;
        if (!triggerPattern.test(dto.eventTrigger)) {
            throw new localization_1.LocalizedException('automation_engine.eventtrigger_must_be_in_format_domain_event_e_g_attendance_m_bfc94b9f', undefined, undefined, 'eventTrigger must be in format "domain.event" (e.g. attendance.marked)');
        }
        if (!dto.actions || dto.actions.length === 0) {
            throw new localization_1.LocalizedException('automation_engine.at_least_one_action_is_required_dbc73aa2', undefined, undefined, 'At least one action is required');
        }
        return this.prisma.automationRule.create({
            data: {
                schoolId,
                name: dto.name,
                description: dto.description,
                eventTrigger: dto.eventTrigger,
                conditions: dto.conditions || null,
                actions: dto.actions,
                isActive: dto.isActive ?? true,
                createdById: userId,
            },
        });
    }
    async updateRule(schoolId, ruleId, dto) {
        const existing = await this.getRule(schoolId, ruleId);
        if (dto.eventTrigger) {
            const triggerPattern = /^[a-z]+\.[a-z]+$/;
            if (!triggerPattern.test(dto.eventTrigger)) {
                throw new localization_1.LocalizedException('automation_engine.eventtrigger_must_be_in_format_domain_event_502f05e3', undefined, undefined, 'eventTrigger must be in format "domain.event"');
            }
        }
        return this.prisma.automationRule.update({
            where: { id: ruleId },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.description !== undefined ? { description: dto.description } : {}),
                ...(dto.eventTrigger !== undefined ? { eventTrigger: dto.eventTrigger } : {}),
                ...(dto.conditions !== undefined ? { conditions: dto.conditions } : {}),
                ...(dto.actions !== undefined ? { actions: dto.actions } : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            },
        });
    }
    async deleteRule(schoolId, ruleId) {
        await this.getRule(schoolId, ruleId);
        await this.prisma.automationRule.delete({ where: { id: ruleId } });
        return { message: 'Rule deleted' };
    }
    async toggleRule(schoolId, ruleId, isActive) {
        await this.getRule(schoolId, ruleId);
        return this.prisma.automationRule.update({
            where: { id: ruleId },
            data: { isActive },
        });
    }
    async getLogs(schoolId, query) {
        const where = { schoolId };
        if (query.ruleId)
            where.ruleId = query.ruleId;
        if (query.status)
            where.status = query.status;
        if (query.eventType)
            where.eventType = query.eventType;
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
    async getLog(schoolId, logId) {
        const log = await this.prisma.automationExecutionLog.findFirst({
            where: { id: logId, schoolId },
        });
        throw new localization_1.LocalizedException('automation_engine.execution_log_not_found_194354b9', undefined, common_1.HttpStatus.NOT_FOUND, 'Execution log not found');
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
            { value: 'school.created', label: 'School Created', description: 'When a new school is created by superadmin' },
            { value: 'school.updated', label: 'School Updated', description: 'When a school is updated' },
            { value: 'school.deleted', label: 'School Deleted', description: 'When a school is deleted/deactivated' },
            { value: 'subscription.plan.created', label: 'Plan Created', description: 'When a subscription plan is created' },
            { value: 'subscription.plan.updated', label: 'Plan Updated', description: 'When a subscription plan is updated' },
            { value: 'subscription.plan.deleted', label: 'Plan Deleted', description: 'When a subscription plan is deleted' },
            { value: 'subscription.assigned', label: 'Plan Assigned', description: 'When a plan is assigned to a school' },
            { value: 'admin.created', label: 'Admin Created', description: 'When a superadmin creates an admin user' },
            { value: 'admin.deleted', label: 'Admin Deleted', description: 'When an admin user is deleted' },
            { value: 'it-manager.created', label: 'IT Manager Created', description: 'When a superadmin creates an IT manager' },
            { value: 'platform.settings.updated', label: 'Platform Settings Updated', description: 'When platform settings are changed' },
            { value: 'backup.downloaded', label: 'Backup Downloaded', description: 'When a platform or school backup is downloaded' },
            { value: 'permission.created', label: 'Permission Created', description: 'When a new permission is created' },
            { value: 'permission.updated', label: 'Permission Updated', description: 'When a permission is updated' },
            { value: 'permission.deleted', label: 'Permission Deleted', description: 'When a permission is deleted' },
            { value: 'role.permission.assigned', label: 'Role Permission Assigned', description: 'When a permission is assigned to a role' },
            { value: 'role.permission.removed', label: 'Role Permission Removed', description: 'When a permission is removed from a role' },
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
};
exports.AutomationEngineService = AutomationEngineService;
exports.AutomationEngineService = AutomationEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AutomationEngineService);
//# sourceMappingURL=automation-engine.service.js.map