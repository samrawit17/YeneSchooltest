import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from './types/role.enum';
import { NotificationType } from '../notification/notification.service';

describe('AuthService password reset workflow', () => {
  const makeService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    const credentialService = {
      generateTemporaryPassword: jest.fn(() => 'TempPass123!'),
      validatePasswordStrength: jest.fn(() => ({ isValid: true, errors: [] })),
      hashPassword: jest.fn(async () => 'hashed-password'),
    };
    const notificationService = {
      createBulkNotifications: jest.fn(async () => ({ count: 2 })),
    };

    const service = new AuthService(
      prisma as any,
      {} as any,
      credentialService as any,
      notificationService as any,
    );

    return { service, prisma, credentialService, notificationService };
  };

  it('notifies active school admins and IT managers for a username reset request', async () => {
    const { service, prisma, notificationService } = makeService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'student-user-1',
      schoolId: 'school-1',
      name: 'Student One',
      username: 'STU-004',
      email: 'student@example.com',
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 'admin-user-1', schoolId: 'school-1' },
      { id: 'it-user-1', schoolId: 'school-1' },
    ]);

    await expect(service.requestPasswordReset(' STU-004 ')).resolves.toEqual({
      notified: true,
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        username: {
          equals: 'STU-004',
          mode: 'insensitive',
        },
      },
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        schoolId: 'school-1',
        role: { in: [Role.ADMIN, Role.IT_MANAGER] },
        isActive: true,
      },
      select: { id: true, schoolId: true },
    });
    expect(notificationService.createBulkNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        schoolId: 'school-1',
        userIds: ['admin-user-1', 'it-user-1'],
        type: NotificationType.PASSWORD_RESET,
        metadata: expect.objectContaining({
          userId: 'student-user-1',
          userUsername: 'STU-004',
        }),
      }),
    );
  });

  it('lets an IT manager reset a same-school user password', async () => {
    const { service, prisma, credentialService } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-user-1',
      schoolId: 'school-1',
      role: Role.STUDENT,
      email: 'student@example.com',
      username: 'STU-004',
    });
    prisma.user.update.mockResolvedValue({});

    const result = await service.adminResetUserPassword(
      'student-user-1',
      'it-user-1',
      'school-1',
      Role.IT_MANAGER,
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'student-user-1' },
      data: {
        password: 'hashed-password',
        mustChangePassword: true,
      },
    });
    expect(credentialService.hashPassword).toHaveBeenCalledWith('TempPass123!');
    expect(result).toMatchObject({
      userId: 'student-user-1',
      username: 'STU-004',
      temporaryPassword: 'TempPass123!',
    });
  });

  it('accepts a simple admin-entered temporary password and forces reset', async () => {
    const { service, prisma, credentialService } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-user-1',
      schoolId: 'school-1',
      role: Role.STUDENT,
      email: 'student@example.com',
      username: 'STU-004',
    });
    prisma.user.update.mockResolvedValue({});

    const result = await service.adminResetUserPassword(
      'student-user-1',
      'admin-user-1',
      'school-1',
      Role.ADMIN,
      '12345678',
    );

    expect(credentialService.validatePasswordStrength).not.toHaveBeenCalled();
    expect(credentialService.generateTemporaryPassword).not.toHaveBeenCalled();
    expect(credentialService.hashPassword).toHaveBeenCalledWith(
      '12345678',
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'student-user-1' },
      data: {
        password: 'hashed-password',
        mustChangePassword: true,
      },
    });
    expect(result).toMatchObject({
      temporaryPassword: '12345678',
    });
  });

  it('rejects admin-entered temporary passwords shorter than 8 characters', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-user-1',
      schoolId: 'school-1',
      role: Role.STUDENT,
      email: 'student@example.com',
      username: 'STU-004',
    });

    await expect(
      service.adminResetUserPassword(
        'student-user-1',
        'admin-user-1',
        'school-1',
        Role.ADMIN,
        '1234567',
      ),
    ).rejects.toThrow('Temporary password must be at least 8 characters');

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks cross-school password resets', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-user-1',
      schoolId: 'school-2',
      role: Role.STUDENT,
    });

    await expect(
      service.adminResetUserPassword(
        'student-user-1',
        'admin-user-1',
        'school-1',
        Role.ADMIN,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
