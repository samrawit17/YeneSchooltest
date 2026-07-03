import { PrismaService } from '../prisma/prisma.service';
import { AutomationEvent } from './interfaces/event.interface';
import { ConditionGroup } from './interfaces/rule.interface';
export declare class RuleEngineService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    evaluateEvent(event: AutomationEvent): Promise<any[]>;
    evaluateConditions(conditionGroup: ConditionGroup, payload: Record<string, any>): boolean;
    private evaluateSingleCondition;
    private resolveField;
}
