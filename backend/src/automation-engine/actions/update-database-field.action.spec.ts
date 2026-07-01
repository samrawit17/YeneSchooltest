import { UpdateDatabaseFieldAction } from './update-database-field.action';

describe('UpdateDatabaseFieldAction', () => {
  let action: UpdateDatabaseFieldAction;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        updateMany: jest.fn(),
      },
    };
    action = new UpdateDatabaseFieldAction(prisma);
  });

  it('updates records and returns count', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 3 });

    const result = await action.execute(
      { eventType: 'test', payload: {}, schoolId: 's1', timestamp: new Date() },
      { model: 'user', where: { role: 'student' }, data: { isActive: false } },
    );

    expect(result.success).toBe(true);
    expect(result.details.count).toBe(3);
    expect(result.details.model).toBe('user');
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { role: 'student' },
      data: { isActive: false },
    });
  });

  it('compiles template variables in where and data', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const result = await action.execute(
      { eventType: 'test', payload: { schoolId: 'school-42' }, schoolId: 's1', timestamp: new Date() },
      { model: 'user', where: { schoolId: '{{schoolId}}' }, data: { grade: 'A' } },
    );

    expect(result.success).toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { schoolId: 'school-42' },
      data: { grade: 'A' },
    });
  });

  it('fails when model, where, or data is missing', async () => {
    const result = await action.execute(
      { eventType: 'test', payload: {}, schoolId: 's1', timestamp: new Date() },
      { model: 'user', where: {} },
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('requires model, where, and data');
  });

  it('fails when prisma model does not exist', async () => {
    const result = await action.execute(
      { eventType: 'test', payload: {}, schoolId: 's1', timestamp: new Date() },
      { model: 'nonexistent', where: { id: '1' }, data: { name: 'X' } },
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('fails when prisma model has no updateMany', async () => {
    prisma.readonlyModel = {};
    const result = await action.execute(
      { eventType: 'test', payload: {}, schoolId: 's1', timestamp: new Date() },
      { model: 'readonlyModel', where: { id: '1' }, data: { name: 'X' } },
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('not updatable');
  });
});
