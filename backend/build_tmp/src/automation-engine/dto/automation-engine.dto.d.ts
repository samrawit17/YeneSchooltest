export declare class CreateRuleDto {
    name: string;
    description?: string;
    eventTrigger: string;
    conditions?: Record<string, any>;
    actions: Record<string, any>[];
    isActive?: boolean;
}
export declare class UpdateRuleDto {
    name?: string;
    description?: string;
    eventTrigger?: string;
    conditions?: Record<string, any>;
    actions?: Record<string, any>[];
    isActive?: boolean;
}
export declare class ToggleRuleDto {
    isActive: boolean;
}
export declare class AutomationLogQueryDto {
    ruleId?: string;
    status?: string;
    eventType?: string;
    page?: number;
    limit?: number;
}
