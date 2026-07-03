"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rule_engine_service_1 = require("./rule-engine.service");
describe('RuleEngineService', () => {
    let service;
    let prisma;
    const makeService = () => {
        prisma = {
            automationRule: {
                findMany: jest.fn(),
            },
        };
        service = new rule_engine_service_1.RuleEngineService(prisma);
        return { service, prisma };
    };
    describe('evaluateSingleCondition', () => {
        beforeEach(() => {
            makeService();
        });
        it('evaluates eq operator correctly', () => {
            const cond = { field: 'status', operator: 'eq', value: 'active' };
            expect(service.evaluateSingleCondition(cond, { status: 'active' })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { status: 'inactive' })).toBe(false);
        });
        it('evaluates neq operator correctly', () => {
            const cond = { field: 'status', operator: 'neq', value: 'active' };
            expect(service.evaluateSingleCondition(cond, { status: 'inactive' })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { status: 'active' })).toBe(false);
        });
        it('evaluates gt operator correctly', () => {
            const cond = { field: 'score', operator: 'gt', value: 75 };
            expect(service.evaluateSingleCondition(cond, { score: 80 })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { score: 75 })).toBe(false);
            expect(service.evaluateSingleCondition(cond, { score: 70 })).toBe(false);
        });
        it('evaluates gte operator correctly', () => {
            const cond = { field: 'score', operator: 'gte', value: 75 };
            expect(service.evaluateSingleCondition(cond, { score: 80 })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { score: 75 })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { score: 70 })).toBe(false);
        });
        it('evaluates lt operator correctly', () => {
            const cond = { field: 'score', operator: 'lt', value: 75 };
            expect(service.evaluateSingleCondition(cond, { score: 70 })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { score: 75 })).toBe(false);
        });
        it('evaluates lte operator correctly', () => {
            const cond = { field: 'score', operator: 'lte', value: 75 };
            expect(service.evaluateSingleCondition(cond, { score: 75 })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { score: 70 })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { score: 80 })).toBe(false);
        });
        it('evaluates contains operator case-insensitively', () => {
            const cond = { field: 'name', operator: 'contains', value: 'john' };
            expect(service.evaluateSingleCondition(cond, { name: 'John Doe' })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { name: 'johnny' })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { name: 'Jane' })).toBe(false);
        });
        it('evaluates not_contains operator case-insensitively', () => {
            const cond = { field: 'name', operator: 'not_contains', value: 'john' };
            expect(service.evaluateSingleCondition(cond, { name: 'Jane' })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { name: 'John Doe' })).toBe(false);
        });
        it('defaults to false for unknown operator', () => {
            const cond = { field: 'status', operator: 'unknown', value: 'x' };
            expect(service.evaluateSingleCondition(cond, { status: 'x' })).toBe(false);
        });
        it('resolves nested dot-notation fields', () => {
            const cond = { field: 'student.grade', operator: 'eq', value: 'A' };
            expect(service.evaluateSingleCondition(cond, { student: { grade: 'A' } })).toBe(true);
            expect(service.evaluateSingleCondition(cond, { student: { grade: 'B' } })).toBe(false);
        });
        it('returns undefined for missing field', () => {
            const cond = { field: 'nonexistent', operator: 'eq', value: 'x' };
            expect(service.evaluateSingleCondition(cond, {})).toBe(false);
        });
    });
    describe('evaluateConditions', () => {
        beforeEach(() => {
            makeService();
        });
        it('returns true for null/undefined group', () => {
            expect(service.evaluateConditions(null, {})).toBe(true);
            expect(service.evaluateConditions(undefined, {})).toBe(true);
        });
        it('returns true for group with empty conditions', () => {
            expect(service.evaluateConditions({ operator: 'AND', conditions: [] }, {})).toBe(true);
        });
        it('evaluates AND group correctly (all pass)', () => {
            const group = {
                operator: 'AND',
                conditions: [
                    { field: 'status', operator: 'eq', value: 'active' },
                    { field: 'score', operator: 'gte', value: 50 },
                ],
            };
            expect(service.evaluateConditions(group, { status: 'active', score: 75 })).toBe(true);
        });
        it('evaluates AND group correctly (one fails)', () => {
            const group = {
                operator: 'AND',
                conditions: [
                    { field: 'status', operator: 'eq', value: 'active' },
                    { field: 'score', operator: 'gte', value: 50 },
                ],
            };
            expect(service.evaluateConditions(group, { status: 'active', score: 30 })).toBe(false);
        });
        it('evaluates OR group correctly (one passes)', () => {
            const group = {
                operator: 'OR',
                conditions: [
                    { field: 'status', operator: 'eq', value: 'active' },
                    { field: 'score', operator: 'gte', value: 50 },
                ],
            };
            expect(service.evaluateConditions(group, { status: 'inactive', score: 75 })).toBe(true);
        });
        it('evaluates OR group correctly (all fail)', () => {
            const group = {
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
                    { field: 'status', operator: 'eq', value: 'active' },
                ],
            };
            expect(service.evaluateConditions(group, { status: 'active' })).toBe(true);
        });
        it('handles nested condition groups', () => {
            const group = {
                operator: 'AND',
                conditions: [
                    { field: 'status', operator: 'eq', value: 'active' },
                    {
                        operator: 'OR',
                        conditions: [
                            { field: 'score', operator: 'gte', value: 90 },
                            { field: 'bonus', operator: 'eq', value: true },
                        ],
                    },
                ],
            };
            expect(service.evaluateConditions(group, { status: 'active', score: 95, bonus: false })).toBe(true);
            expect(service.evaluateConditions(group, { status: 'active', score: 80, bonus: true })).toBe(true);
            expect(service.evaluateConditions(group, { status: 'active', score: 80, bonus: false })).toBe(false);
        });
        it('handles deeply nested groups', () => {
            const group = {
                operator: 'OR',
                conditions: [
                    {
                        operator: 'AND',
                        conditions: [
                            { field: 'a', operator: 'eq', value: 1 },
                            { field: 'b', operator: 'eq', value: 2 },
                        ],
                    },
                    {
                        operator: 'AND',
                        conditions: [
                            { field: 'c', operator: 'eq', value: 3 },
                            { field: 'd', operator: 'eq', value: 4 },
                        ],
                    },
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
//# sourceMappingURL=rule-engine.service.spec.js.map