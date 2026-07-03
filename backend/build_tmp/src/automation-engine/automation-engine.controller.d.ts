import { AutomationEngineService } from './automation-engine.service';
import { CreateRuleDto, UpdateRuleDto, ToggleRuleDto, AutomationLogQueryDto } from './dto/automation-engine.dto';
export declare class AutomationEngineController {
    private readonly automationService;
    constructor(automationService: AutomationEngineService);
    listRules(req: any, query: any): Promise<{
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
    getRule(req: any, id: string): Promise<{
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
    createRule(req: any, dto: CreateRuleDto): Promise<{
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
    updateRule(req: any, id: string, dto: UpdateRuleDto): Promise<{
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
    deleteRule(req: any, id: string): Promise<{
        message: string;
    }>;
    toggleRule(req: any, id: string, dto: ToggleRuleDto): Promise<{
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
    getLogs(req: any, query: AutomationLogQueryDto): Promise<{
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
    getLog(req: any, id: string): Promise<{
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
    getEventTypes(): Promise<{
        value: string;
        label: string;
        description: string;
    }[]>;
    getActionTypes(): Promise<{
        value: string;
        label: string;
        description: string;
        fields: string[];
    }[]>;
}
