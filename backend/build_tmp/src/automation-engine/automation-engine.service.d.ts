import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto, UpdateRuleDto, AutomationLogQueryDto } from './dto/automation-engine.dto';
export declare class AutomationEngineService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listRules(schoolId: string, query: {
        page?: number;
        limit?: number;
        eventTrigger?: string;
    }): Promise<{
        data: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            createdById: string | null;
            eventTrigger: string;
            conditions: import("@prisma/client/runtime/client").JsonValue | null;
            actions: import("@prisma/client/runtime/client").JsonValue;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getRule(schoolId: string, ruleId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        eventTrigger: string;
        conditions: import("@prisma/client/runtime/client").JsonValue | null;
        actions: import("@prisma/client/runtime/client").JsonValue;
    } | null>;
    createRule(schoolId: string, userId: string, dto: CreateRuleDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        eventTrigger: string;
        conditions: import("@prisma/client/runtime/client").JsonValue | null;
        actions: import("@prisma/client/runtime/client").JsonValue;
    }>;
    updateRule(schoolId: string, ruleId: string, dto: UpdateRuleDto): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        eventTrigger: string;
        conditions: import("@prisma/client/runtime/client").JsonValue | null;
        actions: import("@prisma/client/runtime/client").JsonValue;
    }>;
    deleteRule(schoolId: string, ruleId: string): Promise<{
        message: string;
    }>;
    toggleRule(schoolId: string, ruleId: string, isActive: boolean): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        createdById: string | null;
        eventTrigger: string;
        conditions: import("@prisma/client/runtime/client").JsonValue | null;
        actions: import("@prisma/client/runtime/client").JsonValue;
    }>;
    getLogs(schoolId: string, query: AutomationLogQueryDto): Promise<{
        data: {
            id: string;
            schoolId: string;
            status: string;
            eventType: string;
            errorMessage: string | null;
            ruleId: string;
            ruleName: string | null;
            eventPayload: import("@prisma/client/runtime/client").JsonValue | null;
            executedActions: import("@prisma/client/runtime/client").JsonValue | null;
            executionTimeMs: number | null;
            triggeredAt: Date;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getLog(schoolId: string, logId: string): Promise<{
        id: string;
        schoolId: string;
        status: string;
        eventType: string;
        errorMessage: string | null;
        ruleId: string;
        ruleName: string | null;
        eventPayload: import("@prisma/client/runtime/client").JsonValue | null;
        executedActions: import("@prisma/client/runtime/client").JsonValue | null;
        executionTimeMs: number | null;
        triggeredAt: Date;
    } | null>;
    getAvailableEventTypes(): Promise<{
        value: string;
        label: string;
        description: string;
    }[]>;
    getAvailableActionTypes(): Promise<{
        value: string;
        label: string;
        description: string;
        fields: string[];
    }[]>;
}
