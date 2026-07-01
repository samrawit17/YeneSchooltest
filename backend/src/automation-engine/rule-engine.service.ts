import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationEvent } from './interfaces/event.interface';
import { ConditionGroup, Condition } from './interfaces/rule.interface';

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateEvent(event: AutomationEvent): Promise<any[]> {
    const rules = await this.prisma.automationRule.findMany({
      where: {
        schoolId: event.schoolId,
        eventTrigger: event.eventType,
        isActive: true,
      },
    });

    const matched: any[] = [];
    for (const rule of rules) {
      try {
        const conditions = rule.conditions as ConditionGroup | null;
        const passed = conditions ? this.evaluateConditions(conditions, event.payload) : true;

        if (passed) {
          matched.push(rule);
        }
      } catch (err: any) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${err.message}`);
      }
    }
    return matched;
  }

  evaluateConditions(conditionGroup: ConditionGroup, payload: Record<string, any>): boolean {
    if (!conditionGroup || !conditionGroup.conditions || conditionGroup.conditions.length === 0) {
      return true;
    }

    const operator = conditionGroup.operator || 'AND';
    const results = conditionGroup.conditions.map((condition) => {
      if ('operator' in condition && 'conditions' in condition) {
        return this.evaluateConditions(condition as any as ConditionGroup, payload);
      }
      return this.evaluateSingleCondition(condition as Condition, payload);
    });

    return operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  private evaluateSingleCondition(condition: Condition, payload: Record<string, any>): boolean {
    const actualValue = this.resolveField(condition.field, payload);

    switch (condition.operator) {
      case 'eq':
        return actualValue == condition.value;
      case 'neq':
        return actualValue != condition.value;
      case 'gt':
        return Number(actualValue) > Number(condition.value);
      case 'gte':
        return Number(actualValue) >= Number(condition.value);
      case 'lt':
        return Number(actualValue) < Number(condition.value);
      case 'lte':
        return Number(actualValue) <= Number(condition.value);
      case 'contains':
        return String(actualValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'not_contains':
        return !String(actualValue).toLowerCase().includes(String(condition.value).toLowerCase());
      default:
        return false;
    }
  }

  private resolveField(field: string, payload: Record<string, any>): any {
    return field.split('.').reduce((obj, key) => (obj != null ? obj[key] : undefined), payload);
  }
}
