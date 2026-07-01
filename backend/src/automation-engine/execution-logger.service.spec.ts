import { ExecutionLoggerService } from './execution-logger.service';
import { AutomationEvent } from './interfaces/event.interface';
import { ActionResult } from './interfaces/action.interface';

describe('ExecutionLoggerService', () => {
  let service: ExecutionLoggerService;
  let prisma: any;

  const makeEvent = (): AutomationEvent => ({
    eventType: 'test.event',
    payload: { studentId: 's1' },
    schoolId: 'school-1',
    timestamp: new Date(),
  });

  beforeEach(() => {
    prisma = {
      automationExecutionLog: { create: jest.fn() },
    };
    service = new ExecutionLoggerService(prisma);
  });

  it('creates a success log when all actions succeed', async () => {
    const results: ActionResult[] = [
      { actionType: 'send_sms', success: true, message: 'Sent' },
    ];

    await service.logExecution({
      schoolId: 'school-1',
      ruleId: 'rule-1',
      ruleName: 'Test Rule',
      event: makeEvent(),
      results,
      executionTimeMs: 150,
    });

    expect(prisma.automationExecutionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        schoolId: 'school-1',
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        eventType: 'test.event',
        status: 'success',
        errorMessage: null,
        executionTimeMs: 150,
      }),
    });
  });

  it('creates a failed log when any action fails', async () => {
    const results: ActionResult[] = [
      { actionType: 'send_sms', success: true, message: 'Sent' },
      { actionType: 'send_email', success: false, message: 'Email provider error' },
    ];

    await service.logExecution({
      schoolId: 'school-1',
      ruleId: 'rule-1',
      ruleName: 'Test Rule',
      event: makeEvent(),
      results,
      executionTimeMs: 300,
    });

    expect(prisma.automationExecutionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'failed',
        errorMessage: 'Email provider error',
        executionTimeMs: 300,
      }),
    });
  });

  it('concatenates multiple failure messages', async () => {
    const results: ActionResult[] = [
      { actionType: 'a', success: false, message: 'Error A' },
      { actionType: 'b', success: false, message: 'Error B' },
    ];

    await service.logExecution({
      schoolId: 'school-1',
      ruleId: 'rule-1',
      event: makeEvent(),
      results,
      executionTimeMs: 100,
    });

    expect(prisma.automationExecutionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'failed',
        errorMessage: 'Error A; Error B',
      }),
    });
  });

  it('passes event payload to log', async () => {
    await service.logExecution({
      schoolId: 'school-1',
      ruleId: 'rule-1',
      event: makeEvent(),
      results: [{ actionType: 'a', success: true }],
      executionTimeMs: 50,
    });

    expect(prisma.automationExecutionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventPayload: { studentId: 's1' },
      }),
    });
  });
});
