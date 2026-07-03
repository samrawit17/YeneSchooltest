export interface ConditionGroup {
    operator: 'AND' | 'OR';
    conditions: Condition[];
}
export interface Condition {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains';
    value: any;
}
export interface ActionConfig {
    type: string;
    config: Record<string, any>;
}
export interface AutomationRuleData {
    name: string;
    description?: string;
    eventTrigger: string;
    conditions: ConditionGroup | null;
    actions: ActionConfig[];
    isActive: boolean;
}
