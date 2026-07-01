import { ActionExecutorService } from './action-executor.service';
import { IAutomationAction, ActionResult } from './interfaces/action.interface';
import { AutomationEvent } from './interfaces/event.interface';

describe('ActionExecutorService', () => {
  let service: ActionExecutorService;
  let moduleRef: any;

  const makeEvent = (overrides: Partial<AutomationEvent> = {}): AutomationEvent => ({
    eventType: 'test.event',
    payload: {},
    schoolId: 'school-1',
    timestamp: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    moduleRef = {};
    service = new ActionExecutorService(moduleRef);
  });

  it('executes a registered action successfully', async () => {
    const action: IAutomationAction = {
      type: 'send_sms',
      execute: jest.fn().mockResolvedValue({ actionType: 'send_sms', success: true, message: 'Sent' }),
    };
    service.registerAction(action);

    const results = await service.executeActions([{ type: 'send_sms', config: { to: '+123' } }], makeEvent());

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].actionType).toBe('send_sms');
    expect(action.execute).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'test.event' }),
      { to: '+123' },
    );
  });

  it('returns failure for unknown action type', async () => {
    const results = await service.executeActions([{ type: 'nonexistent', config: {} }], makeEvent());

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].message).toContain('Unknown action type');
  });

  it('catches action execution errors', async () => {
    const action: IAutomationAction = {
      type: 'failing_action',
      execute: jest.fn().mockRejectedValue(new Error('Something broke')),
    };
    service.registerAction(action);

    const results = await service.executeActions([{ type: 'failing_action', config: {} }], makeEvent());

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].message).toBe('Something broke');
  });

  it('executes multiple actions in order', async () => {
    const order: string[] = [];
    const smsAction: IAutomationAction = {
      type: 'send_sms',
      execute: jest.fn().mockImplementation(async () => {
        order.push('sms');
        return { actionType: 'send_sms', success: true };
      }),
    };
    const emailAction: IAutomationAction = {
      type: 'send_email',
      execute: jest.fn().mockImplementation(async () => {
        order.push('email');
        return { actionType: 'send_email', success: true };
      }),
    };
    service.registerAction(smsAction);
    service.registerAction(emailAction);

    const results = await service.executeActions([
      { type: 'send_sms', config: {} },
      { type: 'send_email', config: {} },
    ], makeEvent());

    expect(results).toHaveLength(2);
    expect(order).toEqual(['sms', 'email']);
  });

  it('continues executing remaining actions after one fails', async () => {
    const failingAction: IAutomationAction = {
      type: 'failing',
      execute: jest.fn().mockRejectedValue(new Error('Fail')),
    };
    const goodAction: IAutomationAction = {
      type: 'good',
      execute: jest.fn().mockResolvedValue({ actionType: 'good', success: true }),
    };
    service.registerAction(failingAction);
    service.registerAction(goodAction);

    const results = await service.executeActions([
      { type: 'failing', config: {} },
      { type: 'good', config: {} },
    ], makeEvent());

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
  });
});
