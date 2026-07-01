import { EmailAction } from './email.action';

describe('EmailAction', () => {
  let action: EmailAction;

  beforeEach(() => {
    action = new EmailAction();
  });

  it('returns success with queued message', async () => {
    const result = await action.execute(
      { eventType: 'test', payload: { name: 'Bekele' }, schoolId: 's1', timestamp: new Date() },
      { to: 'admin@school.com', subject: 'Alert', body: 'Hello {{name}}' },
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('queued');
    expect(result.details.to).toBe('admin@school.com');
    expect(result.details.body).toBe('Hello Bekele');
  });

  it('fails when no recipient is configured', async () => {
    const result = await action.execute(
      { eventType: 'test', payload: {}, schoolId: 's1', timestamp: new Date() },
      { subject: 'Test', body: 'Body' },
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('No recipient');
  });
});
