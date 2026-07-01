import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AutomationEngineService } from './automation-engine.service';

describe('AutomationEngineService', () => {
  let service: AutomationEngineService;
  let prisma: any;

  const makeService = () => {
    prisma = {
      automationRule: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      automationExecutionLog: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new AutomationEngineService(prisma);
    return { service, prisma };
  };

  const mockRule = (overrides: any = {}) => ({
    id: 'rule-1',
    schoolId: 'school-1',
    name: 'Test Rule',
    description: null,
    eventTrigger: 'attendance.marked',
    conditions: null,
    actions: [{ type: 'send_sms', config: { message: 'Hello' } }],
    isActive: true,
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('listRules', () => {
    it('returns paginated rules', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findMany.mockResolvedValue([mockRule()]);
      prisma.automationRule.count.mockResolvedValue(1);

      const result = await service.listRules('school-1', {});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(prisma.automationRule.findMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1' },
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('filters by eventTrigger', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findMany.mockResolvedValue([]);
      prisma.automationRule.count.mockResolvedValue(0);

      await service.listRules('school-1', { eventTrigger: 'fee.paid' });

      expect(prisma.automationRule.findMany).toHaveBeenCalledWith({
        where: { schoolId: 'school-1', eventTrigger: 'fee.paid' },
        orderBy: { updatedAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('supports custom pagination', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findMany.mockResolvedValue([]);
      prisma.automationRule.count.mockResolvedValue(30);

      const result = await service.listRules('school-1', { page: 2, limit: 10 });

      expect(prisma.automationRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('getRule', () => {
    it('returns rule when found', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findFirst.mockResolvedValue(mockRule());

      const result = await service.getRule('school-1', 'rule-1');
      expect(result.id).toBe('rule-1');
    });

    it('throws NotFoundException when not found', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findFirst.mockResolvedValue(null);

      await expect(service.getRule('school-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('scopes query by schoolId', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findFirst.mockResolvedValue(null);

      await service.getRule('school-1', 'rule-1').catch(() => {});

      expect(prisma.automationRule.findFirst).toHaveBeenCalledWith({
        where: { id: 'rule-1', schoolId: 'school-1' },
      });
    });
  });

  describe('createRule', () => {
    it('creates a rule successfully', async () => {
      const { service, prisma } = makeService();
      const dto = {
        name: 'New Rule',
        eventTrigger: 'grade.published',
        actions: [{ type: 'push_notification', config: { message: 'Grades out' } }],
      };
      prisma.automationRule.create.mockResolvedValue(mockRule({ name: 'New Rule' }));

      const result = await service.createRule('school-1', 'user-1', dto as any);

      expect(prisma.automationRule.create).toHaveBeenCalledWith({
        data: {
          schoolId: 'school-1',
          name: 'New Rule',
          description: undefined,
          eventTrigger: 'grade.published',
          conditions: null,
          actions: [{ type: 'push_notification', config: { message: 'Grades out' } }],
          isActive: true,
          createdById: 'user-1',
        },
      });
      expect(result.name).toBe('New Rule');
    });

    it('rejects invalid eventTrigger format', async () => {
      const { service } = makeService();
      const dto = {
        name: 'Bad Rule',
        eventTrigger: 'invalid',
        actions: [{ type: 'send_sms', config: {} }],
      };

      await expect(service.createRule('school-1', 'user-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('rejects empty actions', async () => {
      const { service } = makeService();
      const dto = {
        name: 'No Actions',
        eventTrigger: 'test.event',
        actions: [],
      };

      await expect(service.createRule('school-1', 'user-1', dto as any)).rejects.toThrow(BadRequestException);
    });

    it('accepts custom isActive value', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.create.mockResolvedValue(mockRule());

      await service.createRule('school-1', 'user-1', {
        name: 'Disabled',
        eventTrigger: 'test.event',
        actions: [{ type: 'send_sms', config: {} }],
        isActive: false,
      } as any);

      expect(prisma.automationRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  describe('updateRule', () => {
    it('updates rule fields', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findFirst.mockResolvedValue(mockRule());
      prisma.automationRule.update.mockResolvedValue(mockRule({ name: 'Updated' }));

      const result = await service.updateRule('school-1', 'rule-1', { name: 'Updated' } as any);

      expect(prisma.automationRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: { name: 'Updated' },
      });
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException when rule does not exist', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findFirst.mockResolvedValue(null);

      await expect(service.updateRule('school-1', 'nonexistent', { name: 'X' } as any)).rejects.toThrow(NotFoundException);
    });

    it('validates eventTrigger on update', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findFirst.mockResolvedValue(mockRule());

      await expect(service.updateRule('school-1', 'rule-1', { eventTrigger: 'bad' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteRule', () => {
    it('deletes existing rule', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findFirst.mockResolvedValue(mockRule());
      prisma.automationRule.delete.mockResolvedValue(mockRule());

      const result = await service.deleteRule('school-1', 'rule-1');

      expect(prisma.automationRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
      expect(result).toEqual({ message: 'Rule deleted' });
    });

    it('throws when rule not found', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findFirst.mockResolvedValue(null);

      await expect(service.deleteRule('school-1', 'nonexistent')).rejects.toThrow(NotFoundException);
      expect(prisma.automationRule.delete).not.toHaveBeenCalled();
    });
  });

  describe('toggleRule', () => {
    it('toggles isActive to false', async () => {
      const { service, prisma } = makeService();
      prisma.automationRule.findFirst.mockResolvedValue(mockRule({ isActive: true }));
      prisma.automationRule.update.mockResolvedValue(mockRule({ isActive: false }));

      await service.toggleRule('school-1', 'rule-1', false);

      expect(prisma.automationRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
        data: { isActive: false },
      });
    });
  });

  describe('getLogs', () => {
    it('returns paginated logs with filters', async () => {
      const { service, prisma } = makeService();
      const mockLog = {
        id: 'log-1',
        schoolId: 'school-1',
        ruleId: 'rule-1',
        status: 'success',
        eventType: 'test.event',
        triggeredAt: new Date(),
      };
      prisma.automationExecutionLog.findMany.mockResolvedValue([mockLog]);
      prisma.automationExecutionLog.count.mockResolvedValue(1);

      const result = await service.getLogs('school-1', { status: 'success' });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by ruleId, status, eventType', async () => {
      const { service, prisma } = makeService();
      prisma.automationExecutionLog.findMany.mockResolvedValue([]);
      prisma.automationExecutionLog.count.mockResolvedValue(0);

      await service.getLogs('school-1', { ruleId: 'r1', status: 'failed', eventType: 'test.event' });

      expect(prisma.automationExecutionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: 'school-1', ruleId: 'r1', status: 'failed', eventType: 'test.event' },
        }),
      );
    });
  });

  describe('getLog', () => {
    it('returns log when found', async () => {
      const { service, prisma } = makeService();
      prisma.automationExecutionLog.findFirst.mockResolvedValue({ id: 'log-1' });

      const result = await service.getLog('school-1', 'log-1');
      expect(result.id).toBe('log-1');
    });

    it('throws when not found', async () => {
      const { service, prisma } = makeService();
      prisma.automationExecutionLog.findFirst.mockResolvedValue(null);

      await expect(service.getLog('school-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailableEventTypes', () => {
    it('returns event type list', async () => {
      const { service } = makeService();
      const types = await service.getAvailableEventTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(types[0]).toHaveProperty('value');
      expect(types[0]).toHaveProperty('label');
    });
  });

  describe('getAvailableActionTypes', () => {
    it('returns action type list', async () => {
      const { service } = makeService();
      const types = await service.getAvailableActionTypes();
      expect(types.length).toBeGreaterThan(0);
      expect(types[0]).toHaveProperty('value');
      expect(types[0]).toHaveProperty('label');
      expect(types[0]).toHaveProperty('fields');
    });
  });
});
