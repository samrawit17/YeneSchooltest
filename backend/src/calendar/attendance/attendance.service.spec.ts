import { ForbiddenException } from '@nestjs/common';
import { Role } from '../../auth/types/role.enum';
import { AttendanceService } from './attendance.service';

describe('AttendanceService ownership guards', () => {
  const createService = (
    prisma: Record<string, any>,
    schoolSettings: Record<string, any> = {},
  ) =>
    new AttendanceService(
      prisma as any,
      {} as any,
      { getSetting: jest.fn().mockResolvedValue(null), ...schoolSettings } as any,
    );

  it('requires parent-child attendance access to stay inside the parent school', async () => {
    const prisma = {
      parentProfile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'parent-profile-1' }),
      },
      studentProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'student-profile-1',
          userId: 'student-user-1',
        }),
      },
      parentStudent: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = createService(prisma);

    await expect(
      service.getStudentAttendanceSummary(
        { id: 'parent-user-1', role: Role.PARENT, schoolId: 'school-1', name: 'Parent User' },
        'student-user-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.parentProfile.findFirst).toHaveBeenCalledWith({
      where: { userId: 'parent-user-1', schoolId: 'school-1' },
      select: { id: true },
    });
    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith({
      where: {
        schoolId: 'school-1',
        OR: [{ id: 'student-user-1' }, { userId: 'student-user-1' }],
      },
      select: { id: true, userId: true },
    });
    expect(prisma.parentStudent.findFirst).toHaveBeenCalledWith({
      where: {
        parentId: 'parent-profile-1',
        studentId: 'student-profile-1',
      },
      select: { id: true },
    });
  });

  it('filters student self attendance through same-school sessions', async () => {
    const prisma = {
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = createService(prisma);

    await service.getMyAttendance(
      { id: 'student-user-1', role: Role.STUDENT, schoolId: 'school-1', name: 'Student User' },
      {},
    );

    expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId: 'student-user-1',
          session: { schoolId: 'school-1' },
        },
      }),
    );
  });

  it('uses local-day ranges for admin dashboard stats and recent absences', async () => {
    const prisma = {
      attendanceSession: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'session-1',
              status: 'SUBMITTED',
              attendanceRecords: [
                { status: 'PRESENT' },
                { status: 'ABSENT' },
                { status: 'LATE' },
              ],
            },
          ])
          .mockResolvedValueOnce([]),
      },
      timetableSlot: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          {
            student: {
              name: 'Student One',
              studentProfile: { studentCode: 'STU-004' },
            },
            session: {
              timetableSlot: {
                class: { name: 'Grade 1' },
                section: { name: 'A' },
              },
              class: null,
            },
          },
        ]),
      },
    };
    const service = createService(prisma);

    const result = await service.getAdminDashboard(
      { id: 'admin-user-1', role: Role.ADMIN, schoolId: 'school-1' },
      '2026-05-15',
    );

    expect(prisma.attendanceSession.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: new Date(2026, 4, 15, 0, 0, 0, 0),
            lte: new Date(2026, 4, 15, 23, 59, 59, 999),
          },
        }),
      }),
    );
    expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          session: expect.objectContaining({
            date: {
              gte: new Date(2026, 4, 15, 0, 0, 0, 0),
              lte: new Date(2026, 4, 15, 23, 59, 59, 999),
            },
          }),
        }),
      }),
    );
    expect(result.todayStats).toMatchObject({
      totalStudentsMarked: 3,
      presentCount: 1,
      absentCount: 1,
      lateCount: 1,
      attendanceRate: 33,
    });
    expect(result.recentAbsences).toEqual([
      {
        studentName: 'Student One',
        studentCode: 'STU-004',
        className: 'Grade 1',
        sectionName: 'A',
      },
    ]);
  });
});
