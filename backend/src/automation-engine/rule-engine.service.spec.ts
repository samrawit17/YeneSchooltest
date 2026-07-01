import { RuleEngineService } from './rule-engine.service';
import { ConditionGroup, Condition } from './interfaces/rule.interface';

describe('RuleEngineService', () => {
  let service: RuleEngineService;
  let prisma: any;

  const makeService = () => {
    prisma = {
      automationRule: {
        findMany: jest.fn(),
      },
    };
    service = new RuleEngineService(prisma);
    return { service, prisma };
  };

  describe('evaluateSingleCondition', () => {
    beforeEach(() => {
      makeService();
    });

    it('evaluates eq operator correctly', () => {
      const cond: Condition = { field: 'status', operator: 'eq', value: 'active' };
      expect((service as any).evaluateSingleCondition(cond, { status: 'active' })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { status: 'inactive' })).toBe(false);
    });

    it('evaluates neq operator correctly', () => {
      const cond: Condition = { field: 'status', operator: 'neq', value: 'active' };
      expect((service as any).evaluateSingleCondition(cond, { status: 'inactive' })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { status: 'active' })).toBe(false);
    });

    it('evaluates gt operator correctly', () => {
      const cond: Condition = { field: 'score', operator: 'gt', value: 75 };
      expect((service as any).evaluateSingleCondition(cond, { score: 80 })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { score: 75 })).toBe(false);
      expect((service as any).evaluateSingleCondition(cond, { score: 70 })).toBe(false);
    });

    it('evaluates gte operator correctly', () => {
      const cond: Condition = { field: 'score', operator: 'gte', value: 75 };
      expect((service as any).evaluateSingleCondition(cond, { score: 80 })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { score: 75 })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { score: 70 })).toBe(false);
    });

    it('evaluates lt operator correctly', () => {
      const cond: Condition = { field: 'score', operator: 'lt', value: 75 };
      expect((service as any).evaluateSingleCondition(cond, { score: 70 })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { score: 75 })).toBe(false);
    });

    it('evaluates lte operator correctly', () => {
      const cond: Condition = { field: 'score', operator: 'lte', value: 75 };
      expect((service as any).evaluateSingleCondition(cond, { score: 75 })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { score: 70 })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { score: 80 })).toBe(false);
    });

    it('evaluates contains operator case-insensitively', () => {
      const cond: Condition = { field: 'name', operator: 'contains', value: 'john' };
      expect((service as any).evaluateSingleCondition(cond, { name: 'John Doe' })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { name: 'johnny' })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { name: 'Jane' })).toBe(false);
    });

    it('evaluates not_contains operator case-insensitively', () => {
      const cond: Condition = { field: 'name', operator: 'not_contains', value: 'john' };
      expect((service as any).evaluateSingleCondition(cond, { name: 'Jane' })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { name: 'John Doe' })).toBe(false);
    });

    it('defaults to false for unknown operator', () => {
      const cond = { field: 'status', operator: 'unknown', value: 'x' } as any;
      expect((service as any).evaluateSingleCondition(cond, { status: 'x' })).toBe(false);
    });

    it('resolves nested dot-notation fields', () => {
      const cond: Condition = { field: 'student.grade', operator: 'eq', value: 'A' };
      expect((service as any).evaluateSingleCondition(cond, { student: { grade: 'A' } })).toBe(true);
      expect((service as any).evaluateSingleCondition(cond, { student: { grade: 'B' } })).toBe(false);
    });

    it('returns undefined for missing field', () => {
      const cond: Condition = { field: 'nonexistent', operator: 'eq', value: 'x' };
      expect((service as any).evaluateSingleCondition(cond, {})).toBe(false);
    });
  });

  describe('evaluateConditions', () => {
    beforeEach(() => {
      makeService();
    });

    it('returns true for null/undefined group', () => {
      expect(service.evaluateConditions(null as any, {})).toBe(true);
      expect(service.evaluateConditions(undefined as any, {})).toBe(true);
    });

    it('returns true for group with empty conditions', () => {
      expect(service.evaluateConditions({ operator: 'AND', conditions: [] }, {})).toBe(true);
    });

    it('evaluates AND group correctly (all pass)', () => {
      const group: ConditionGroup = {
        operator: 'AND',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'score', operator: 'gte', value: 50 },
        ],
      };
      expect(service.evaluateConditions(group, { status: 'active', score: 75 })).toBe(true);
    });

    it('evaluates AND group correctly (one fails)', () => {
      const group: ConditionGroup = {
        operator: 'AND',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'score', operator: 'gte', value: 50 },
        ],
      };
      expect(service.evaluateConditions(group, { status: 'active', score: 30 })).toBe(false);
    });

    it('evaluates OR group correctly (one passes)', () => {
      const group: ConditionGroup = {
        operator: 'OR',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'score', operator: 'gte', value: 50 },
        ],
      };
      expect(service.evaluateConditions(group, { status: 'inactive', score: 75 })).toBe(true);
    });

    it('evaluates OR group correctly (all fail)', () => {
      const group: ConditionGroup = {
        operator: 'OR',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          { field: 'score', operator: 'gte', value: 50 },
        ],
      };
      expect(service.evaluateConditions(group, { status: 'inactive', score: 30 })).toBe(false);
    });

    it('defaults to AND when operator is missing', () => {
      const group = {
        conditions: [
          { field: 'status', operator: 'eq' as const, value: 'active' },
        ],
      } as ConditionGroup;
      expect(service.evaluateConditions(group, { status: 'active' })).toBe(true);
    });

    it('handles nested condition groups', () => {
      const group: ConditionGroup = {
        operator: 'AND',
        conditions: [
          { field: 'status', operator: 'eq', value: 'active' },
          {
            operator: 'OR',
            conditions: [
              { field: 'score', operator: 'gte', value: 90 },
              { field: 'bonus', operator: 'eq', value: true },
            ],
          } as any,
        ],
      };
      expect(service.evaluateConditions(group, { status: 'active', score: 95, bonus: false })).toBe(true);
      expect(service.evaluateConditions(group, { status: 'active', score: 80, bonus: true })).toBe(true);
      expect(service.evaluateConditions(group, { status: 'active', score: 80, bonus: false })).toBe(false);
    });

    it('handles deeply nested groups', () => {
      const group: ConditionGroup = {
        operator: 'OR',
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { field: 'a', operator: 'eq', value: 1 },
              { field: 'b', operator: 'eq', value: 2 },
            ],
          } as any,
          {
            operator: 'AND',
            conditions: [
              { field: 'c', operator: 'eq', value: 3 },
              { field: 'd', operator: 'eq', value: 4 },
            ],
          } as any,
        ],
      };
      expect(service.evaluateConditions(group, { a: 1, b: 2, c: 99, d: 99 })).toBe(true);
      expect(service.evaluateConditions(group, { a: 0, b: 0, c: 3, d: 4 })).toBe(true);
      expect(service.evaluateConditions(group, { a: 0, b: 0, c: 0, d: 0 })).toBe(false);
    });
  });

  describe('evaluateEvent', () => {
    beforeEach(() => {
      makeService();
    });

    it('returns matched rules for an event', async () => {
      const rules = [
        { id: 'rule-1', conditions: { operator: 'AND', conditions: [{ field: 'status', operator: 'eq', value: 'pass' }] }, isActive: true },
        { id: 'rule-2', conditions: null, isActive: true },
      ];
      prisma.automationRule.findMany.mockResolvedValue(rules);

      const result = await service.evaluateEvent({
        eventType: 'grade.published',
        payload: { status: 'pass' },
        schoolId: 'school-1',
        timestamp: new Date(),
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('rule-1');
      expect(result[1].id).toBe('rule-2');
    });

    it('filters rules whose conditions fail', async () => {
      const rules = [
        { id: 'rule-1', conditions: { operator: 'AND', conditions: [{ field: 'status', operator: 'eq', value: 'pass' }] }, isActive: true },
        { id: 'rule-2', conditions: { operator: 'AND', conditions: [{ field: 'status', operator: 'eq', value: 'fail' }] }, isActive: true },
      ];
      prisma.automationRule.findMany.mockResolvedValue(rules);

      const result = await service.evaluateEvent({
        eventType: 'grade.published',
        payload: { status: 'pass' },
        schoolId: 'school-1',
        timestamp: new Date(),
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rule-1');
    });

    it('queries with correct schoolId, eventTrigger, and isActive', async () => {
      prisma.automationRule.findMany.mockResolvedValue([]);

      await service.evaluateEvent({
        eventType: 'attendance.marked',
        payload: {},
        schoolId: 'school-42',
        timestamp: new Date(),
      });

      expect(prisma.automationRule.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-42',
          eventTrigger: 'attendance.marked',
          isActive: true,
        },
      });
    });
  });
});
