import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SchoolSettingsService } from '../../school-settings/school-settings.service';
import {
  CreateAttendanceSessionDto,
  BulkMarkAttendanceDto,
  SubmitSessionDto,
  OverrideAttendanceDto,
  AttendanceQueryDto,
} from './dto';
import { Role } from '../../auth/types/role.enum';
import { AttendanceRecordStatus } from '@prisma/client';
import { NotificationService } from '../../notification/notification.service';
import {
  RequestUser,
  AttendanceRecordInput,
  SessionContext,
} from './interfaces/attendance.interfaces';
import {
  getEthiopianDate,
  formatEthiopianDate,
  getEthiopianYear,
} from './utils/date.utils';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private schoolSettings: SchoolSettingsService,
  ) {}

  private isAdmin(user: RequestUser): boolean {
    return user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private isSameCalendarDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private getDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get date info including both Gregorian and Ethiopian calendar dates
   */
  private getDateInfo(date: Date): {
    gregorian: string;
    ethiopian: string;
    ethiopianYear: number;
    ethiopianMonth: number;
    ethiopianDay: number;
    ethiopianMonthName: string;
  } {
    const gregorian = this.getDateString(date);
    const ethiopianDate = getEthiopianDate(date);
    return {
      gregorian,
      ethiopian: formatEthiopianDate(date),
      ethiopianYear: ethiopianDate.year,
      ethiopianMonth: ethiopianDate.month,
      ethiopianDay: ethiopianDate.day,
      ethiopianMonthName: ethiopianDate.monthName,
    };
  }

  private parseHomeroomSlotId(slotId: string): {
    classId: string;
    sectionId?: string;
  } {
    const parts = slotId.split('-');
    const classId = parts[1] || '';
    const sectionId = parts.length > 2 ? parts.slice(2).join('-') : undefined;
    return { classId, sectionId };
  }

  /**
   * Find an academic year for a given date.
   * Handles both Gregorian coverage and Ethiopian year matching.
   */
  private async findAcademicYearByDate(
    schoolId: string,
    date: Date,
  ): Promise<any> {
    // 1. Try to find an academic year whose Gregorian dates cover the target date
    const coveredYear = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        startDate: { lte: date },
        endDate: { gte: date },
      },
    });

    if (coveredYear) return coveredYear;

    // 2. If not found, and given the context of Ethiopian school system,
    // try to match by Ethiopian year in the name (e.g., "2016")
    const ethiopianYear = getEthiopianYear(date);
    const ethiopianYearStr = ethiopianYear.toString();

    const matchedByName = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        name: { contains: ethiopianYearStr },
      },
    });

    if (matchedByName) return matchedByName;

    // 3. Fallback to active academic year
    return this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true,
      },
    });
  }

  private async getSchoolAttendanceCutoff(
    schoolId: string,
  ): Promise<{ hour: number; minute: number; formatted: string }> {
    const cutoffSetting = await this.schoolSettings.getSetting(
      schoolId,
      'ATTENDANCE_CUTOFF_TIME',
    );
    let hour = 10;
    let minute = 0;

    if (typeof cutoffSetting === 'string') {
      const [hourPart, minutePart] = cutoffSetting.split(':').map(Number);
      if (Number.isInteger(hourPart) && Number.isInteger(minutePart)) {
        hour = hourPart;
        minute = minutePart;
      }
    }

    return {
      hour,
      minute,
      formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
  }

  private async enforceTeacherAttendanceWindow(
    user: RequestUser,
    attendanceDate: Date,
    mode: 'open' | 'edit' | 'submit' = 'edit',
  ): Promise<{ warning?: string }> {
    if (this.isAdmin(user) || user.role !== Role.TEACHER) {
      return {};
    }

    if (this.isWeekend(attendanceDate)) {
      throw new BadRequestException('Cannot submit attendance on weekends');
    }

    const now = new Date();
    if (!this.isSameCalendarDay(attendanceDate, now)) {
      return {};
    }

    // Opening/loading a session must remain possible after cutoff so the
    // attendance screen can still show the roster and any previously saved data.
    if (mode === 'open') {
      return {};
    }

    // Temporary switch to bypass cutoff-time enforcement (weekend enforcement still applies).
    // Prefer setting `ATTENDANCE_CUTOFF_DISABLED=true` in env for local/dev.
    const cutoffDisabledRaw =
      process.env.ATTENDANCE_CUTOFF_DISABLED ??
      process.env.DISABLE_ATTENDANCE_CUTOFF;

    if (
      typeof cutoffDisabledRaw === 'string' &&
      ['1', 'true', 'yes', 'on'].includes(cutoffDisabledRaw.toLowerCase())
    ) {
      return {};
    }

    const cutoff = await this.getSchoolAttendanceCutoff(user.schoolId);
    const cutoffTime = new Date(now);
    cutoffTime.setHours(cutoff.hour, cutoff.minute, 0, 0);

    if (now > cutoffTime) {
      return { warning: `Attendance cutoff time (${cutoff.formatted}) has passed - submission recorded with late flag.` };
    }

    return {};
  }

  // ==================== TEACHER METHODS ====================

  /**
   * Get today's attendance slots for a teacher (homeroom classes only)
   * Teachers can ONLY take attendance for classes where they are the homeroom teacher.
   * Checks both class-level and section-level homeroom teacher assignments.
   */
  async getTodayTimetable(user: RequestUser, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const jsDay = targetDate.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Get Ethiopian date info
    const dateInfo = this.getDateInfo(targetDate);

    if (this.isWeekend(targetDate)) {
      return { dateInfo, slots: [] };
    }

    // Get homeroom classes at class level
    const classLevelHomeroomClasses = await this.prisma.class.findMany({
      where: {
        homeroomTeacherId: user.id,
        academicYear: {
          isActive: true,
        },
      },
      include: {
        sections: true,
      },
    });

    // Get classes where teacher is homeroom at section level
    const sectionLevelHomeroom = await this.prisma.section.findMany({
      where: {
        homeroomTeacherId: user.id,
        class: {
          academicYear: {
            isActive: true,
          },
        },
      },
      include: {
        class: {
          include: {
            sections: true,
          },
        },
      },
    });

    // Get unique class IDs from section-level homeroom
    const sectionLevelClassIds = new Set(
      sectionLevelHomeroom.map((s) => s.classId),
    );

    // Filter out classes already included from class-level
    const sectionLevelClasses = sectionLevelHomeroom
      .filter((s) => !classLevelHomeroomClasses.some((c) => c.id === s.classId))
      .map((section) => ({
        ...section.class,
        sections: section.class.sections,
        _sectionId: section.id, // Track which section the teacher is homeroom for
      }));

    // Combine both class-level and section-level homeroom classes
    const homeroomClasses = [
      ...classLevelHomeroomClasses.map((cls) => ({ ...cls, _sectionId: null })),
      ...sectionLevelClasses,
    ];

    // Create virtual slots for homeroom classes (for morning attendance)
    // AttendanceSession is unique per class+date, so expose one homeroom slot per class.
    // Include section ID in slot ID so we can check section-level homeroom assignments
    const homeroomSlots = homeroomClasses.map((cls) => {
      const firstSection = cls.sections[0];
      // Include section ID in the slot ID when available for section-level homeroom teachers
      const slotId = cls._sectionId
        ? `homeroom-${cls.id}-${cls._sectionId}`
        : `homeroom-${cls.id}`;
      return {
        id: slotId,
        dayOfWeek,
        startTime: '08:00',
        endTime: '08:30',
        room: null,
        isHomeroom: true,
        class: {
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
        },
        section: {
          id: firstSection?.id || '',
          name: firstSection?.name || cls.section || 'A',
        },
        subject: {
          id: 'homeroom',
          name: 'Homeroom Attendance',
          code: 'HR',
        },
        teacher: {
          id: user.id,
          name: user.name,
        },
        session: null,
      };
    });

    // Get existing sessions for this date to merge status
    const dateStart = new Date(targetDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(targetDate);
    dateEnd.setHours(23, 59, 59, 999);

    const existingSessions = await this.prisma.attendanceSession.findMany({
      where: {
        classId: { in: homeroomClasses.map((cls) => cls.id) },
        date: {
          gte: dateStart,
          lt: dateEnd,
        },
      },
      include: {
        attendanceRecords: {
          include: {
            student: {
              include: {
                studentProfile: true,
              },
            },
          },
        },
      },
    });

    // Merge session data into homeroom slots
    const slotsWithSessions = homeroomSlots.map((slot) => {
      const { classId } = this.parseHomeroomSlotId(slot.id);
      const session =
        existingSessions.find((s) => s.classId === classId) || null;
      return {
        ...slot,
        session,
      };
    });

    return { dateInfo, slots: slotsWithSessions };
  }

  /**
   * Get a specific attendance session
   */
  async getSession(sessionId: string, user?: RequestUser) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        timetableSlot: {
          include: {
            class: true,
            section: true,
            subject: true,
            teacher: {
              select: { id: true, name: true },
            },
          },
        },
        attendanceRecords: {
          include: {
            student: {
              include: {
                studentProfile: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Attendance session not found');
    }

    if (user) {
      if (session.schoolId !== user.schoolId) {
        throw new ForbiddenException(
          'You do not have permission to view this session',
        );
      }

      const isAdmin =
        user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
      if (!isAdmin && session.takenById !== user.id) {
        const classId = session.classId || session.timetableSlot?.classId;
        const sectionId = session.timetableSlot?.sectionId || undefined;
        const isHomeroomTeacher = classId
          ? await this.isHomeroomTeacher(
              user.id,
              classId,
              sectionId || undefined,
            )
          : false;

        if (!isHomeroomTeacher) {
          throw new ForbiddenException(
            'You do not have permission to view this session',
          );
        }
      }
    }

    // Add Ethiopian date info to session
    const sessionDate = new Date(session.date);
    const dateInfo = this.getDateInfo(sessionDate);

    return {
      ...session,
      dateInfo,
    };
  }

  /**
   * Get students for a specific class/section (for attendance marking)
   */
  async getStudentsForAttendance(
    user: RequestUser,
    className?: string,
    section?: string,
    date?: string,
    classId?: string,
    sectionId?: string,
  ) {
    console.log('[DEBUG] getStudentsForAttendance params:', {
      userId: user.id,
      classId,
      className,
      section,
      sectionId,
      date,
    });
    console.log('[DEBUG] User schoolId:', user.schoolId);
    const targetDate = date ? new Date(date) : new Date();

    // Find the relevant academic year for this date
    const academicYear = await this.findAcademicYearByDate(
      user.schoolId,
      targetDate,
    );

    if (!academicYear) {
      throw new BadRequestException(
        'No suitable academic year found for this date',
      );
    }

    // If we have a classId, prefer ID-based lookup (more reliable than name matching)
    if (classId) {
      const possibleSections = [
        section,
        section?.toUpperCase?.(),
        section?.toLowerCase?.(),
      ].filter((v): v is string => typeof v === 'string' && v.length > 0);

      // Get the class and its academic year directly (not filtering by findAcademicYearByDate)
      const classDataById = await this.prisma.class.findFirst({
        where: {
          id: classId,
          schoolId: user.schoolId,
        },
        include: {
          sections: true,
          academicYear: true,
        },
      });
      console.log(
        '[DEBUG] classDataById:',
        classDataById
          ? {
              id: classDataById.id,
              name: classDataById.name,
              academicYear: classDataById.academicYear?.name,
            }
          : 'NOT FOUND',
      );

      if (classDataById && classDataById.academicYear) {
        // Use the academic year from the class record directly
        const classAcademicYearId = classDataById.academicYearId;
        const classAcademicYearName = classDataById.academicYear.name;

        let resolvedSectionId: string | undefined = sectionId || undefined;

        if (!resolvedSectionId && possibleSections.length > 0) {
          const sectionMatch = await this.prisma.section.findFirst({
            where: {
              classId: classDataById.id,
              name: { in: possibleSections },
            },
          });
          resolvedSectionId = sectionMatch?.id;
        }

        const studentClassWhere: any = {
          schoolId: user.schoolId,
          classId: classDataById.id,
          // FIXED: Remove strict academicYear filter (matches ClassService.getStudentsByClass)
        };
        console.log('[DEBUG] studentClassWhere:', studentClassWhere);
        console.log('[DEBUG] resolvedSectionId:', resolvedSectionId);

        if (resolvedSectionId) {
          studentClassWhere.sectionId = resolvedSectionId;
        }

        let studentClasses = await this.prisma.studentClass.findMany({
          where: studentClassWhere,
          include: {
            student: {
              include: {
                studentProfile: true,
              },
            },
          },
        });
        console.log('[DEBUG] studentClasses found:', studentClasses.length);

        if (studentClasses.length === 0) {
          const relaxedWhere: any = {
            schoolId: user.schoolId,
            classId: classDataById.id,
          };

          if (resolvedSectionId) {
            relaxedWhere.sectionId = resolvedSectionId;
          }

          studentClasses = await this.prisma.studentClass.findMany({
            where: relaxedWhere,
            include: {
              student: {
                include: {
                  studentProfile: true,
                },
              },
            },
          });
        }

        const studentIds = studentClasses.map((sc) => sc.studentId);
        // Note: Enrollment table stores academic year as ID string (e.g., "cmmv56pes0013yvrc1v7bog0g")
        const approvedEnrollments =
          studentIds.length > 0
            ? await this.prisma.enrollment.findMany({
                where: {
                  schoolId: user.schoolId,
                  academicYear: classAcademicYearId,
                  status: 'APPROVED',
                  studentId: { in: studentIds },
                },
                select: { studentId: true },
              })
            : [];
        const approvedStudentIds = new Set(
          approvedEnrollments.map((e) => e.studentId),
        );

        const students = studentClasses
          .filter((sc) => {
            if (approvedStudentIds.has(sc.studentId)) return true;
            return sc.student.studentProfile?.enrollmentStatus === 'APPROVED';
          })
          .map((sc) => ({
            id: sc.student.id,
            userId: sc.student.id,
            name: sc.student.name,
            gender: sc.student.studentProfile?.gender || 'MALE',
            studentCode: sc.student.studentProfile?.studentCode || '',
            rollNumber: sc.student.studentProfile?.rollNumber || '',
            className: classDataById.name,
            section: section || '',
          }))
          .sort((a, b) => {
            const aRoll = parseInt(a.rollNumber) || 999;
            const bRoll = parseInt(b.rollNumber) || 999;
            return aRoll - bRoll || a.name.localeCompare(b.name);
          });

        if (students.length > 0) {
          return students;
        }
      }
    }

    // If className wasn't provided, we can't do reliable name-based matching here.
    if (!className) {
      return [];
    }

    // Normalize the class name for matching (handle both "Grade 1" and "1" formats)
    const possibleClassNames = [
      className,
      className.replace('Grade ', ''),
      `Grade ${className.replace('Grade ', '')}`,
    ].filter((v, i, a) => a.indexOf(v) === i);

    // Also try different section formats
    const possibleSections = [
      section,
      section?.toUpperCase?.(),
      section?.toLowerCase?.(),
    ].filter((v): v is string => typeof v === 'string' && v.length > 0);

    // First, try to find the class by name for the current academic year
    let classData = await this.prisma.class.findFirst({
      where: {
        schoolId: user.schoolId,
        name: { in: possibleClassNames },
        academicYearId: academicYear.id,
        OR: [
          { section: { in: possibleSections } },
          { sections: { some: { name: { in: possibleSections } } } },
        ],
      },
      include: { sections: true },
    });

    if (!classData) {
      classData = await this.prisma.class.findFirst({
        where: {
          schoolId: user.schoolId,
          name: { in: possibleClassNames },
          academicYearId: academicYear.id,
        },
        include: { sections: true },
      });
    }

    // Get students through StudentClass table if class exists
    if (classData) {
      // Determine section id filter based on requested section
      const sectionMatch = await this.prisma.section.findFirst({
        where: {
          classId: classData.id,
          name: { in: possibleSections },
        },
      });

      const studentClassWhere: any = {
        schoolId: user.schoolId,
        classId: classData.id,
        // FIXED: Remove strict academicYear filter (matches ClassService.getStudentsByClass)
      };

      if (sectionMatch) {
        studentClassWhere.sectionId = sectionMatch.id;
      }

      // Find students enrolled in this class (relaxed academicYear filter)
      const studentClasses = await this.prisma.studentClass.findMany({
        where: studentClassWhere,
        include: {
          student: {
            include: {
              studentProfile: true,
            },
          },
        },
      });

      // Determine approval using Enrollment as the source of truth (StudentProfile.enrollmentStatus
      // is not always kept in sync with Enrollment.status in some datasets).
      const studentIds = studentClasses.map((sc) => sc.studentId);
      const approvedEnrollments =
        studentIds.length > 0
          ? await this.prisma.enrollment.findMany({
              where: {
                schoolId: user.schoolId,
                academicYear: academicYear.name,
                status: 'APPROVED',
                studentId: { in: studentIds },
              },
              select: { studentId: true },
            })
          : [];
      const approvedStudentIds = new Set(
        approvedEnrollments.map((e) => e.studentId),
      );

      const students = studentClasses
        .filter((sc) => {
          if (approvedStudentIds.has(sc.studentId)) return true;
          // Legacy/backfill compatibility
          return sc.student.studentProfile?.enrollmentStatus === 'APPROVED';
        })
        .map((sc) => ({
          id: sc.student.id,
          userId: sc.student.id,
          name: sc.student.name,
          gender: sc.student.studentProfile?.gender || 'MALE',
          studentCode: sc.student.studentProfile?.studentCode || '',
          rollNumber: sc.student.studentProfile?.rollNumber || '',
          className: classData.name,
          section: section || '',
        }))
        .sort((a, b) => {
          // Sort by roll number if available, otherwise by name
          const aRoll = parseInt(a.rollNumber) || 999;
          const bRoll = parseInt(b.rollNumber) || 999;
          return aRoll - bRoll || a.name.localeCompare(b.name);
        });

      if (students.length > 0) {
        return students;
      }
    }

    // Fallback: Try to get students directly from studentProfile (legacy method)
    // Get approved students in this class/section with flexible matching
    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId: user.schoolId,
        enrollmentStatus: 'APPROVED',
        academicYear: academicYear.name,
        className: { in: possibleClassNames },
        section: { in: possibleSections },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { rollNumber: 'asc' },
    });

    return students.map((profile) => ({
      id: profile.userId,
      userId: profile.userId,
      name: profile.user.name,
      gender: profile.gender || 'MALE',
      studentCode: profile.studentCode,
      rollNumber: profile.rollNumber || '',
      className: profile.className || '',
      section: profile.section || '',
    }));
  }

  /**
   * Teacher opens attendance for a timetable slot
   * Creates or finds an AttendanceSession for the given date
   */
  async openAttendanceSession(
    user: RequestUser,
    slotId: string,
    date?: string,
  ) {
    // Check if this is a homeroom slot
    const isHomeroomSlot = slotId.startsWith('homeroom-');

    let slot: any = null;
    let classId: string | null = null;
    let sectionId: string | null = null;
    let schoolId: string = user.schoolId;
    let academicYearId: string | null = null;
    let className: string = '';
    let sectionName: string = '';

    if (isHomeroomSlot) {
      // Parse homeroom slot ID safely.
      // Note: class IDs commonly contain '-' (UUIDs, slugs). The legacy parsing
      // `slotId.split('-')` breaks for IDs like `class-9-b` -> "class".
      // Supported formats:
      // - homeroom-{classId}
      // - homeroom-{classId}:{sectionId} (preferred if you need section)
      // - homeroom-{classId}-{sectionId} (legacy; split on last '-')
      const homeroomKey = slotId.slice('homeroom-'.length);

      const parseHomeroomKey = (key: string) => {
        // Prefer unambiguous separators first.
        if (key.includes(':')) {
          const [cls, sect] = key.split(':', 2);
          return { classId: cls, sectionId: sect || null };
        }
        if (key.includes('|')) {
          const [cls, sect] = key.split('|', 2);
          return { classId: cls, sectionId: sect || null };
        }
        if (key.includes('--')) {
          const [cls, sect] = key.split('--', 2);
          return { classId: cls, sectionId: sect || null };
        }
        return { classId: key, sectionId: null as string | null };
      };

      ({ classId, sectionId } = parseHomeroomKey(homeroomKey));

      const classSelect = {
        id: true,
        name: true,
        grade: true,
        section: true,
        schoolId: true,
        academicYearId: true,
        homeroomTeacherId: true, // Explicitly select homeroomTeacherId
        academicYear: true,
        sections: {
          select: {
            id: true,
            name: true,
            homeroomTeacherId: true,
          },
        },
      } as const;

      // Get class info
      let classData = await this.prisma.class.findUnique({
        where: { id: classId },
        select: classSelect,
      });

      // Backward compatibility: some clients historically built `homeroom-{classId}-{sectionId}`.
      // If the full key doesn't match a class, try splitting on the last '-' only.
      if (!classData && !sectionId) {
        const lastDash = homeroomKey.lastIndexOf('-');
        if (lastDash > 0) {
          const candidateClassId = homeroomKey.slice(0, lastDash);
          const candidateSectionId = homeroomKey.slice(lastDash + 1);
          const candidateClassData = await this.prisma.class.findUnique({
            where: { id: candidateClassId },
            select: classSelect,
          });
          if (candidateClassData) {
            classId = candidateClassId;
            sectionId = candidateSectionId || null;
            classData = candidateClassData;
          }
        }
      }

      if (!classData) {
        throw new NotFoundException('Class not found');
      }

      if (!classData.academicYear?.isActive) {
        throw new BadRequestException(
          'Academic year for this class is not active',
        );
      }

      // Verify teacher is homeroom teacher OR user is an admin
      // Admins can take attendance for any class
      // Check both class-level and section-level homeroom teacher
      const isAdmin =
        user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
      if (!isAdmin) {
        const isClassLevelHomeroom = classData.homeroomTeacherId === user.id;
        const isSectionLevelHomeroom = sectionId
          ? classData.sections.some(
              (s) => s.id === sectionId && s.homeroomTeacherId === user.id,
            )
          : classData.sections.some((s) => s.homeroomTeacherId === user.id);

        if (!isClassLevelHomeroom && !isSectionLevelHomeroom) {
          // If there are NO homeroom teachers assigned at all
          const hasAnyHomeroomTeacher =
            !!classData.homeroomTeacherId ||
            classData.sections.some((s) => !!s.homeroomTeacherId);
          if (!hasAnyHomeroomTeacher) {
            throw new ForbiddenException(
              'No homeroom teacher assigned for this class. Please contact an administrator to assign a homeroom teacher.',
            );
          }
          throw new ForbiddenException(
            'You are not the homeroom teacher for this class',
          );
        }
      }

      schoolId = classData.schoolId;
      academicYearId = classData.academicYearId;
      className = classData.name;
      sectionName = sectionId
        ? classData.sections.find((s) => s.id === sectionId)?.name ||
          classData.section
        : classData.section;
    } else {
      // Regular timetable slot — attendance is still restricted to homeroom teachers only
      slot = await this.prisma.timetableSlot.findUnique({
        where: { id: slotId },
        include: {
          class: true,
          section: true,
          subject: true,
          academicYear: true,
        },
      });

      if (!slot) {
        throw new NotFoundException('Timetable slot not found');
      }

      // STRICT: Only homeroom teachers can take attendance (admins are also allowed)
      const isAdmin =
        user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
      const isHomeroomTeacher = await this.isHomeroomTeacher(
        user.id,
        slot.classId,
        slot.sectionId,
      );
      if (!isAdmin && !isHomeroomTeacher) {
        throw new ForbiddenException(
          'Only homeroom teachers can take attendance. You are not the homeroom teacher for this class.',
        );
      }

      // Verify academic year is active
      if (slot.academicYearId) {
        const academicYear = await this.prisma.academicYear.findUnique({
          where: { id: slot.academicYearId },
        });
        if (!academicYear?.isActive) {
          throw new BadRequestException('Academic year is not active');
        }
      }

      schoolId = slot.schoolId;
      academicYearId = slot.academicYearId;
      className = slot.class.name;
      sectionName = slot.section.name;
    }

    // Check for existing session (prevent duplicates)
    const parsedDate = date ? new Date(date) : new Date();
    parsedDate.setHours(0, 0, 0, 0);

    // For homeroom slots, check by classId; for regular slots, check by timetableSlotId
    let existingSession;
    if (isHomeroomSlot && classId) {
      existingSession = await this.prisma.attendanceSession.findFirst({
        where: {
          classId: classId,
          date: parsedDate,
        },
        include: {
          attendanceRecords: {
            include: {
              student: {
                include: {
                  studentProfile: true,
                },
              },
            },
          },
        },
      });
    } else {
      existingSession = await this.prisma.attendanceSession.findFirst({
        where: {
          timetableSlotId: slotId,
          date: parsedDate,
        },
        include: {
          attendanceRecords: {
            include: {
              student: {
                include: {
                  studentProfile: true,
                },
              },
            },
          },
        },
      });
    }

    if (existingSession) {
      // Return existing session (whether DRAFT or SUBMITTED for viewing)
      return this.getSession(existingSession.id, user);
    }

    await this.enforceTeacherAttendanceWindow(user, parsedDate, 'open');

    // Create new session - for homeroom slots, use classId; for regular slots, use timetableSlotId.
    // New sessions remain editable until explicit submission.
    // Create new session - for homeroom slots, use classId; for regular slots, use timetableSlotId.
    // Store sectionId for homeroom sessions to track which section the teacher is homeroom for
    const session = await this.prisma.attendanceSession.create({
      data: {
        schoolId,
        timetableSlotId: isHomeroomSlot ? null : slotId,
        classId: isHomeroomSlot ? classId : null,
        date: parsedDate,
        status: 'NOT_SUBMITTED',
        takenById: user.id,
      },
    });

    // Get students for this class/section - use StudentClass table first
    let students: Array<{
      userId: string;
      name: string;
      studentCode: string;
      rollNumber: string;
      gender: string;
    }> = [];

    // Try to get students through StudentClass table
    if (classId && academicYearId) {
      const academicYear = await this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
      });

      if (academicYear) {
        const studentClasses = await this.prisma.studentClass.findMany({
          where: {
            schoolId,
            classId: classId,
            academicYear: academicYear.name,
          },
          include: {
            student: {
              include: {
                studentProfile: true,
              },
            },
          },
        });

        // Filter to approved students
        students = studentClasses
          .filter(
            (sc) => sc.student.studentProfile?.enrollmentStatus === 'APPROVED',
          )
          .map((sc) => ({
            userId: sc.student.id,
            name: sc.student.name,
            studentCode: sc.student.studentProfile?.studentCode || '',
            rollNumber: sc.student.studentProfile?.rollNumber || '',
            gender: sc.student.studentProfile?.gender || 'MALE',
          }));
      }
    }

    // Fallback: try studentProfile if no students found through StudentClass
    if (students.length === 0) {
      const possibleClassNames = [
        className,
        className.replace('Grade ', ''),
        `Grade ${className.replace('Grade ', '')}`,
      ].filter((v, i, a) => a.indexOf(v) === i);

      // Also try different section formats
      const possibleSections = [
        sectionName,
        sectionName.toUpperCase(),
        sectionName.toLowerCase(),
      ].filter((v, i, a) => a.indexOf(v) === i);

      const studentProfiles = await this.prisma.studentProfile.findMany({
        where: {
          schoolId,
          enrollmentStatus: 'APPROVED',
          className: { in: possibleClassNames },
          section: { in: possibleSections },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      students = studentProfiles.map((profile) => ({
        userId: profile.userId,
        name: profile.user.name,
        studentCode: profile.studentCode,
        rollNumber: profile.rollNumber || '',
        gender: profile.gender || 'MALE',
      }));
    }

    // Don't create records automatically - let the teacher mark them manually
    // This prevents all students from appearing as PRESENT by default

    // Return updated session with records (empty initially)
    return this.getSession(session.id, user);
  }

  /**
   * Get students eligible for attendance in a session
   */
  async getEligibleStudents(user: RequestUser, sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        timetableSlot: {
          include: {
            class: true,
            section: true,
            academicYear: true,
          },
        },
        class: {
          include: {
            sections: true,
            academicYear: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Attendance session not found');
    }

    // Determine the relevant academic year for the session date
    const sessionDate = new Date(session.date);
    const academicYear = await this.findAcademicYearByDate(
      session.schoolId,
      sessionDate,
    );
    const academicYearName = academicYear?.name;

    // Determine class and section info - handles both homeroom and regular sessions
    let classId: string;
    let sectionId: string | null;
    let className: string;
    let sectionName: string;

    if (session.classId && session.class) {
      // Homeroom session
      classId = session.classId;
      className = session.class.name;

      const teacherSection = await this.prisma.section.findFirst({
        where: {
          classId: classId,
          homeroomTeacherId: session.takenById,
        },
      });

      if (teacherSection) {
        sectionId = teacherSection.id;
        sectionName = teacherSection.name;
      } else {
        sectionId = null;
        sectionName = session.class.section;
      }
    } else if (session.timetableSlot) {
      // Regular timetable slot session
      classId = session.timetableSlot.classId;
      sectionId = session.timetableSlot.sectionId;
      className = session.timetableSlot.class.name;
      sectionName = session.timetableSlot.section.name;
    } else {
      throw new BadRequestException(
        'Session has neither class nor timetable slot',
      );
    }

    // Verify teacher owns this session or is homeroom teacher for the class
    const isHomeroomTeacher = await this.isHomeroomTeacher(
      user.id,
      classId,
      sectionId ?? undefined,
    );
    if (session.takenById !== user.id && !isHomeroomTeacher) {
      throw new ForbiddenException(
        'You do not have permission to view this session',
      );
    }

    // Fetch student roster primarily from StudentClass for accurate academic year/class mapping
    const studentClassWhere: any = {
      schoolId: session.schoolId,
      classId,
      academicYear: academicYearName,
    };

    if (sectionId) {
      studentClassWhere.sectionId = sectionId;
    }

    const studentClasses = await this.prisma.studentClass.findMany({
      where: studentClassWhere,
      include: {
        student: {
          include: {
            studentProfile: true,
          },
        },
      },
    });

    let studentEntries: { student: any }[] = [];

    if (studentClasses.length > 0) {
      studentEntries = studentClasses.map((sc) => ({
        student: sc.student,
      }));
    } else {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          schoolId: session.schoolId,
          status: 'APPROVED',
          academicYear: academicYearName,
          student: {
            studentProfile: {
              className: className,
              ...(sectionName ? { section: sectionName } : {}),
            },
          },
        },
        include: {
          student: {
            include: {
              studentProfile: true,
            },
          },
        },
      });

      studentEntries = enrollments.map((e) => ({ student: e.student }));
    }

    // Get existing records for this session
    const existingRecords = await this.prisma.attendanceRecord.findMany({
      where: { attendanceSessionId: sessionId },
    });

    const existingRecordMap = new Map(
      existingRecords.map((r) => [r.studentId, r]),
    );

    // Combine and format
    const students = studentEntries.map((entry) => {
      const student = entry.student;
      const profile = student.studentProfile;
      const existingRecord = existingRecordMap.get(student.id);

      return {
        studentId: student.id,
        studentName: student.name,
        studentCode: profile?.studentCode,
        rollNumber: profile?.rollNumber,
        status: existingRecord?.status || null,
        remark: existingRecord?.remark || null,
        recordId: existingRecord?.id || null,
      };
    });

    // Add Ethiopian date info
    const dateInfo = this.getDateInfo(sessionDate);

    return { dateInfo, students };
  }

  /**
   * Check if user is homeroom teacher for a class and section
   * Checks both class-level and section-level homeroom teacher assignments
   */
  private async isHomeroomTeacher(
    teacherId: string,
    classId: string,
    sectionId?: string,
  ): Promise<boolean> {
    // First check class-level homeroom teacher assignment
    const cls = await this.prisma.class.findFirst({
      where: {
        id: classId,
        homeroomTeacherId: teacherId,
      },
      include: {
        sections: true,
      },
    });

    if (cls) {
      // If no specific section is required, teacher is homeroom for the class
      if (!sectionId) return true;

      // Check if section is part of this class and teacher is homeroom
      return cls.sections.some((s) => s.id === sectionId);
    }

    // If not found at class level, check section-level assignment
    if (sectionId) {
      const section = await this.prisma.section.findFirst({
        where: {
          id: sectionId,
          classId: classId,
          homeroomTeacherId: teacherId,
        },
      });

      if (section) return true;
    } else {
      // If no specific sectionId, check if teacher is homeroom for ANY section in this class
      const section = await this.prisma.section.findFirst({
        where: {
          classId: classId,
          homeroomTeacherId: teacherId,
        },
      });

      if (section) return true;
    }

    return false;
  }

  /**
   * Mark attendance for multiple students in a session
   */
  async bulkMarkAttendance(
    user: RequestUser,
    sessionId: string,
    records: AttendanceRecordInput[],
  ) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new BadRequestException(
        'At least one attendance record is required',
      );
    }

    const duplicateStudentIds = records
      .map((record) => record.studentId)
      .filter((studentId, index, arr) => arr.indexOf(studentId) !== index);
    if (duplicateStudentIds.length > 0) {
      throw new BadRequestException(
        `Duplicate student IDs are not allowed: ${[...new Set(duplicateStudentIds)].join(', ')}`,
      );
    }

    // 1. Verify session exists and is still editable
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        timetableSlot: {
          include: {
            class: true,
            section: true,
          },
        },
        class: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Attendance session not found');
    }

    if (session.status === 'SUBMITTED') {
      throw new BadRequestException('Cannot modify submitted attendance');
    }

    await this.enforceTeacherAttendanceWindow(user, new Date(session.date));

    // 2. Determine class and section info - handle both homeroom and regular sessions
    let classId: string;
    let sectionId: string | undefined;
    let className: string;
    let sectionName: string;

    if (session.classId && session.class) {
      // Homeroom session
      classId = session.classId;
      sectionId = undefined;
      className = session.class.name;
      sectionName = session.class.section || 'A';
    } else if (session.timetableSlot) {
      // Regular timetable slot session
      classId = session.timetableSlot.classId;
      sectionId = session.timetableSlot.sectionId ?? undefined;
      className = session.timetableSlot.class.name;
      sectionName = session.timetableSlot.section?.name || 'A';
    } else {
      throw new BadRequestException(
        'Session has neither class nor timetable slot',
      );
    }

    // Verify teacher owns this session or is homeroom teacher
    const isHomeroomTeacher = await this.isHomeroomTeacher(
      user.id,
      classId,
      sectionId,
    );
    if (session.takenById !== user.id && !isHomeroomTeacher) {
      throw new ForbiddenException(
        'You do not have permission to modify this session',
      );
    }

    // 3. FIX: Validate students against class roster instead of existing attendance records
    // Since openAttendanceSession doesn't create records automatically, we need to
    // check against the actual enrolled students for this class/section
    const studentIds = records.map((r) => r.studentId);

    // Get students through StudentClass table for this class
    let eligibleStudentIds: string[] = [];

    if (classId) {
      const academicYear = await this.prisma.academicYear.findFirst({
        where: {
          schoolId: session.schoolId,
          isActive: true,
        },
      });

      if (academicYear) {
        const studentClasses = await this.prisma.studentClass.findMany({
          where: {
            schoolId: session.schoolId,
            classId: classId,
            academicYear: academicYear.name,
          },
          select: { studentId: true },
        });
        eligibleStudentIds = studentClasses.map((sc) => sc.studentId);
      }
    }

    // If no students from StudentClass, fall back to studentProfile (legacy)
    if (eligibleStudentIds.length === 0) {
      // Normalize class name for flexible matching
      const possibleClassNames = [
        className,
        className.replace('Grade ', ''),
        `Grade ${className.replace('Grade ', '')}`,
      ].filter((v, i, a) => a.indexOf(v) === i);

      // Normalize section for flexible matching
      const possibleSections = [
        sectionName,
        sectionName.toUpperCase(),
        sectionName.toLowerCase(),
      ].filter((v, i, a) => a.indexOf(v) === i);

      // Fetch enrolled students for this class/section
      const enrolledStudents = await this.prisma.studentProfile.findMany({
        where: {
          schoolId: session.schoolId,
          enrollmentStatus: 'APPROVED',
          className: { in: possibleClassNames },
          section: { in: possibleSections },
        },
        select: { userId: true },
      });

      eligibleStudentIds = enrolledStudents.map((s) => s.userId);
    }

    // Also include students who already have records in this session
    const existingRecords = await this.prisma.attendanceRecord.findMany({
      where: { attendanceSessionId: sessionId },
      select: { studentId: true },
    });
    const existingStudentIds = existingRecords.map((r) => r.studentId);

    // Combine eligible IDs (enrolled + already in session)
    const allEligibleIds = [
      ...new Set([...eligibleStudentIds, ...existingStudentIds]),
    ];

    const invalidStudents = studentIds.filter(
      (id) => !allEligibleIds.includes(id),
    );
    if (invalidStudents.length > 0) {
      throw new BadRequestException(
        `Invalid student IDs: ${invalidStudents.join(', ')}. Students must be enrolled in this class.`,
      );
    }

    // 4. OPTIMIZATION: Delete existing records and use createMany for better performance
    // First, delete all existing records for this session
    await this.prisma.attendanceRecord.deleteMany({
      where: { attendanceSessionId: sessionId },
    });

    // Then create all records in a single operation
    const recordsToCreate = records.map((record) => ({
      schoolId: session.schoolId,
      attendanceSessionId: sessionId,
      studentId: record.studentId,
      status: record.status as AttendanceRecordStatus,
      remark: record.remark || null,
    }));

    await this.prisma.attendanceRecord.createMany({
      data: recordsToCreate,
    });

    return { success: true, message: 'Attendance marked successfully' };
  }

  /**
   * Submit the attendance session (locks it)
   */
  async submitSession(user: RequestUser, sessionId: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        timetableSlot: {
          include: {
            class: true,
            section: true,
          },
        },
        class: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Attendance session not found');
    }

    await this.enforceTeacherAttendanceWindow(user, new Date(session.date));

    // Determine class and section info - handle both homeroom and regular sessions
    let classId: string;
    let sectionId: string | undefined;

    if (session.classId && session.class) {
      // Homeroom session
      classId = session.classId;
      sectionId = undefined;
    } else if (session.timetableSlot) {
      // Regular timetable slot session
      classId = session.timetableSlot.classId;
      sectionId = session.timetableSlot.sectionId ?? undefined;
    } else {
      throw new BadRequestException(
        'Session has neither class nor timetable slot',
      );
    }

    // For homeroom sessions, the teacher who created the session should be able to submit
    // For regular sessions, check if teacher is the one who created it or is homeroom teacher
    let canSubmit = false;

    // Check if user is the creator of the session
    if (session.takenById === user.id) {
      canSubmit = true;
    } else {
      // Check if user is homeroom teacher for this class
      const isHomeroomTeacher = await this.isHomeroomTeacher(
        user.id,
        classId,
        sectionId,
      );
      if (isHomeroomTeacher) {
        canSubmit = true;
      }
    }

    if (!canSubmit) {
      throw new ForbiddenException(
        'You do not have permission to submit this session',
      );
    }

    if (session.status === 'SUBMITTED') {
      // Already submitted - return success
      return session;
    }

    const recordsCount = await this.prisma.attendanceRecord.count({
      where: { attendanceSessionId: sessionId },
    });
    if (recordsCount === 0) {
      throw new BadRequestException(
        'Cannot submit an attendance session without records',
      );
    }

    // Submit and lock the session
    const updatedSession = await this.prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Send notifications to parents of absent/late students
    await this.sendAbsenceNotifications(sessionId, session);

    return updatedSession;
  }

  /**
   * Send notifications to parents of absent/late students
   * OPTIMIZED: Batch database queries and use Promise.all for concurrent notifications
   */
  private async sendAbsenceNotifications(
    sessionId: string,
    session: SessionContext,
  ) {
    try {
      // Get all attendance records with ABSENT or LATE status
      const absentRecords = await this.prisma.attendanceRecord.findMany({
        where: {
          attendanceSessionId: sessionId,
          status: { in: ['ABSENT', 'LATE'] },
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentProfile: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (absentRecords.length === 0) return;

      // Get class name for the notification
      let className = '';
      if (session.classId && session.class) {
        className = session.class.name || `Grade ${session.class.grade}`;
      } else if (session.timetableSlot) {
        className =
          session.timetableSlot.class?.name ||
          `Grade ${session.timetableSlot.class?.grade}`;
        if (session.timetableSlot.section) {
          className += ` - ${session.timetableSlot.section.name}`;
        }
      }

      // OPTIMIZATION: Batch fetch all parent-student relations in ONE query
      const absentStudentProfileIds = absentRecords
        .map((r) => r.student.studentProfile?.id)
        .filter((id): id is string => Boolean(id));

      const allParentRelations = await this.prisma.parentStudent.findMany({
        where: { studentId: { in: absentStudentProfileIds } },
        include: {
          parent: {
            include: {
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      // Create a map for quick lookup
      const parentRelationsByStudent = new Map<
        string,
        typeof allParentRelations
      >();
      for (const relation of allParentRelations) {
        const existing = parentRelationsByStudent.get(relation.studentId) || [];
        existing.push(relation);
        parentRelationsByStudent.set(relation.studentId, existing);
      }

      // Format date for display
      const dateStr =
        session.date instanceof Date
          ? session.date.toLocaleDateString()
          : new Date(session.date).toLocaleDateString();

      // Build notification promises
      const notificationPromises: Promise<unknown>[] = [];

      for (const record of absentRecords) {
        const studentName = record.student.name;
        const studentProfileId = record.student.studentProfile?.id;
        if (!studentProfileId) continue;

        // Get parents for this specific student from the batched result
        const parents = parentRelationsByStudent.get(studentProfileId) || [];

        for (const parentRelation of parents) {
          if (record.status === 'ABSENT') {
            notificationPromises.push(
              this.notificationService.notifyParentOfAbsence(
                session.schoolId,
                parentRelation.parent.user.id,
                studentName,
                dateStr,
                className,
              ),
            );
          } else if (record.status === 'LATE') {
            notificationPromises.push(
              this.notificationService.notifyParentOfLate(
                session.schoolId,
                parentRelation.parent.user.id,
                studentName,
                dateStr,
                className,
              ),
            );
          }
        }
      }

      // Execute all notifications concurrently
      if (notificationPromises.length > 0) {
        await Promise.allSettled(notificationPromises);
      }
    } catch (error) {
      // Log error but don't fail the submission
      // Logging removed for production
    }
  }

  /**
   * Get today's pending attendance sessions for a teacher
   */
  async getTodayPendingSessions(user: RequestUser) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.attendanceSession.findMany({
      where: {
        takenById: user.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: { not: 'SUBMITTED' },
      },
      include: {
        timetableSlot: {
          include: {
            class: true,
            section: true,
            subject: true,
          },
        },
      },
    });
  }

  // ==================== STUDENT/PARENT METHODS ====================

  /**
   * Student views their own attendance
   */
  async getMyAttendance(user: RequestUser, query: AttendanceQueryDto) {
    const { startDate, endDate } = query;

    const whereClause: any = {
      studentId: user.id,
    };

    if (startDate || endDate) {
      whereClause.session = {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    return this.prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        session: {
          include: {
            timetableSlot: {
              include: {
                class: true,
                section: true,
                subject: true,
              },
            },
          },
        },
      },
      orderBy: {
        session: {
          date: 'desc',
        },
      },
    });
  }

  /**
   * Get student attendance summary
   */
  async getStudentAttendanceSummary(
    user: RequestUser,
    studentId: string,
    startDate?: string,
    endDate?: string,
  ) {
    // Verify access: student viewing themselves, parent viewing their child, or admin
    if (user.role === Role.STUDENT && user.id !== studentId) {
      throw new ForbiddenException('You can only view your own attendance');
    }

    if (user.role === Role.PARENT) {
      const parentProfile = await this.prisma.parentProfile.findUnique({
        where: { userId: user.id },
        include: {
          children: {
            include: {
              student: {
                include: { user: true },
              },
            },
          },
        },
      });

      // Check if studentId matches either userId or studentProfile id
      const isLinkedChild = parentProfile?.children.some(
        (c) => c.student.user.id === studentId || c.studentId === studentId,
      );

      if (!isLinkedChild) {
        throw new ForbiddenException(
          "You can only view your linked children's attendance",
        );
      }
    }

    const whereClause: any = {
      studentId,
    };

    if (startDate || endDate) {
      whereClause.session = {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: whereClause,
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const lateDays = records.filter((r) => r.status === 'LATE').length;
    const excusedDays = records.filter((r) => r.status === 'EXCUSED').length;

    return {
      studentId,
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      excusedDays,
      attendancePercentage:
        totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
    };
  }

  /**
   * Get student attendance for viewing (student/parent)
   */
  async getStudentAttendance(
    user: RequestUser,
    studentId: string,
    query: AttendanceQueryDto,
  ) {
    const { startDate, endDate, month } = query;

    // Build date filter - try string format first for better compatibility
    let dateFilter: any = {};

    if (month) {
      try {
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr);
        const monthNum = parseInt(monthStr);

        // Create proper Date objects
        const startOfMonth = new Date(year, monthNum - 1, 1, 0, 0, 0);
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59);

        dateFilter = {
          gte: startOfMonth,
          lte: endOfMonth,
        };
      } catch (e) {
        // Logging removed for production
      }
    } else if (startDate || endDate) {
      dateFilter = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    // Build the where clause
    const whereClause: any = {
      studentId,
    };

    // Add date filter if present
    if (Object.keys(dateFilter).length > 0) {
      whereClause.session = {
        date: dateFilter,
      };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        session: {
          include: {
            timetableSlot: {
              include: {
                class: true,
                section: true,
                subject: true,
                teacher: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        session: {
          date: 'desc',
        },
      },
    });

    // Calculate summary
    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const lateDays = records.filter((r) => r.status === 'LATE').length;
    const excusedDays = records.filter((r) => r.status === 'EXCUSED').length;

    // Get student info - studentId here should be the userId
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        studentProfile: {
          select: {
            id: true,
            studentCode: true,
            className: true,
            section: true,
          },
        },
      },
    });

    // If student not found by userId, try finding by studentProfile id
    if (!student) {
      const studentProfile = await this.prisma.studentProfile.findUnique({
        where: { id: studentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (studentProfile) {
        return {
          records,
          student: {
            id: studentProfile.user.id,
            name: studentProfile.user.name,
            studentCode: studentProfile.studentCode,
            className: studentProfile.className,
            section: studentProfile.section,
          },
          summary: {
            totalDays,
            present: presentDays,
            absent: absentDays,
            late: lateDays,
            excused: excusedDays,
            attendancePercentage:
              totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
          },
        };
      }
    }

    return {
      records,
      student: student
        ? {
            id: student.id,
            name: student.name,
            studentCode: (student as any).studentProfile?.studentCode || '',
            className: (student as any).studentProfile?.className || '',
            section: (student as any).studentProfile?.section || '',
          }
        : null,
      summary: {
        totalDays,
        present: presentDays,
        absent: absentDays,
        late: lateDays,
        excused: excusedDays,
        attendancePercentage:
          totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      },
    };
  }

  /**
   * Get all sessions with filters (Admin)
   */
  async getAllSessions(user: RequestUser, query: AttendanceQueryDto) {
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can view all sessions');
    }

    const { startDate, endDate, classId, status, grade, section } = query;

    // First, get all classes that match the grade and section filters (if provided)
    let classIds: string[] | undefined;
    if (grade || section) {
      const classWhere: any = {
        schoolId: user.schoolId,
      };
      if (grade) {
        classWhere.grade = parseInt(grade);
      }
      if (section) {
        classWhere.section = section;
      }

      const classes = await this.prisma.class.findMany({
        where: classWhere,
        select: { id: true },
      });

      classIds = classes.map((c) => c.id);

      // If we have filter criteria but no matching classes, return empty
      if (classIds.length === 0 && (grade || section)) {
        return [];
      }
    }

    const whereClause: any = {
      schoolId: user.schoolId,
      ...(classId && { timetableSlot: { classId } }),
      ...(classIds &&
        classIds.length > 0 && {
          OR: [
            { timetableSlot: { classId: { in: classIds } } },
            { classId: { in: classIds } },
          ],
        }),
      ...(status && { status: status as any }),
    };

    // Apply date range filter
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      start.setHours(0, 0, 0, 0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      whereClause.date = {
        ...(startDate && { gte: start }),
        ...(endDate && { lte: end }),
      };
    }

    return this.prisma.attendanceSession.findMany({
      where: whereClause,
      include: {
        timetableSlot: {
          include: {
            class: true,
            section: true,
            subject: true,
            teacher: {
              select: { id: true, name: true },
            },
          },
        },
        class: {
          include: {
            sections: false,
          },
        },
        takenBy: {
          select: { id: true, name: true },
        },
        attendanceRecords: {
          include: {
            student: {
              include: {
                studentProfile: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  /**
   * Get attendance summary (Admin)
   */
  async getSummary(user: RequestUser, query: AttendanceQueryDto) {
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can view attendance summary');
    }

    const { startDate, endDate, classId } = query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get daily stats for the past week
    const stats: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const whereClause: any = {
        schoolId: user.schoolId,
        date: {
          gte: date,
          lt: nextDate,
        },
        ...(classId && { timetableSlot: { classId } }),
      };

      const sessions = await this.prisma.attendanceSession.findMany({
        where: whereClause,
        include: {
          attendanceRecords: true,
        },
      });

      let totalStudents = 0;
      let presentCount = 0;

      sessions.forEach((session) => {
        totalStudents += session.attendanceRecords.length;
        presentCount += session.attendanceRecords.filter(
          (r) => r.status === 'PRESENT',
        ).length;
      });

      stats.push({
        date: date.toISOString().split('T')[0],
        totalSessions: sessions.length,
        submittedSessions: sessions.filter((s) => s.status === 'SUBMITTED')
          .length,
        notSubmittedSessions: sessions.filter((s) => s.status !== 'SUBMITTED')
          .length,
        totalStudents,
        presentCount,
        attendanceRate:
          totalStudents > 0
            ? Math.round((presentCount / totalStudents) * 100)
            : 0,
      });
    }

    return stats;
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Admin views attendance report with various filters
   */
  async getAttendanceReport(user: RequestUser, query: AttendanceQueryDto) {
    // Only admins can access this
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can view attendance reports');
    }

    const {
      classId,
      sectionId,
      date,
      startDate,
      endDate,
      teacherId,
      studentId,
    } = query;

    const whereClause: any = {};

    if (classId)
      whereClause.session = {
        ...whereClause.session,
        timetableSlot: { classId },
      };
    if (sectionId)
      whereClause.session = {
        ...whereClause.session,
        timetableSlot: { sectionId },
      };
    if (teacherId)
      whereClause.session = {
        ...whereClause.session,
        timetableSlot: { teacherId },
      };
    if (studentId) whereClause.studentId = studentId;

    if (date) {
      const parsedDate = new Date(date);
      whereClause.session = {
        ...whereClause.session,
        date: parsedDate,
      };
    }

    if (startDate || endDate) {
      whereClause.session = {
        ...whereClause.session,
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    // Filter by school for admin
    if (user.schoolId) {
      whereClause.schoolId = user.schoolId;
    }

    return this.prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        session: {
          include: {
            timetableSlot: {
              include: {
                class: true,
                section: true,
                subject: true,
                teacher: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        student: {
          include: {
            studentProfile: true,
          },
        },
        overriddenBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        session: {
          date: 'desc',
        },
      },
    });
  }

  /**
   * Admin overrides an attendance record
   */
  async overrideAttendance(
    user: RequestUser,
    recordId: string,
    dto: OverrideAttendanceDto,
  ) {
    // Only admins can override
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can override attendance');
    }

    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    // Log original status for audit trail
    return this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        status: dto.status,
        remark: dto.remark,
        originalStatus: record.status, // Store original for audit
        overriddenById: user.id,
        overriddenAt: new Date(),
        overrideReason: dto.overrideReason,
      },
    });
  }

  /**
   * Get attendance by date for admin dashboard
   */
  async getAttendanceByDate(user: RequestUser, date: string) {
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can view attendance by date');
    }

    const parsedDate = new Date(date);

    return this.prisma.attendanceSession.findMany({
      where: {
        date: parsedDate,
        schoolId: user.schoolId,
      },
      include: {
        timetableSlot: {
          include: {
            class: true,
            section: true,
            subject: true,
          },
        },
        attendanceRecords: {
          include: {
            student: {
              include: {
                studentProfile: true,
              },
            },
          },
        },
      },
    });
  }

  // ==================== DASHBOARD METHODS ====================

  /**
   * Get teacher dashboard attendance data
   */
  async getTeacherDashboard(user: RequestUser) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's day of week
    const dayOfWeek = today.getDay() || 7;

    // Get today's timetable slots
    const todaySlots = await this.prisma.timetableSlot.findMany({
      where: {
        teacherId: user.id,
        dayOfWeek,
        academicYear: {
          isActive: true,
        },
      },
      include: {
        class: true,
        section: true,
        subject: true,
      },
    });

    // Get sessions for today
    const todaySessions = await this.prisma.attendanceSession.findMany({
      where: {
        takenById: user.id,
        date: today,
      },
      include: {
        timetableSlot: {
          include: {
            class: true,
            section: true,
            subject: true,
          },
        },
        attendanceRecords: true,
      },
    });

    const pendingSlots = todaySlots.filter(
      (slot) =>
        !todaySessions.some((session) => session.timetableSlotId === slot.id),
    );

    const completedSessions = todaySessions.filter(
      (s) => s.status === 'SUBMITTED',
    );
    const notSubmittedSessions = todaySessions.filter(
      (s) => s.status !== 'SUBMITTED',
    );

    // Get weekly stats
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weeklyRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        session: {
          takenById: user.id,
          date: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
      },
      include: {
        session: true,
      },
    });

    const weeklyStats: { date: string; percentage: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      const dayRecords = weeklyRecords.filter((r) => {
        const recordDate = new Date(r.session.date);
        return recordDate.toDateString() === day.toDateString();
      });

      const present = dayRecords.filter((r) => r.status === 'PRESENT').length;
      const total = dayRecords.length;

      weeklyStats.push({
        date: day.toISOString().split('T')[0],
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    }

    // Format pending sessions
    const pendingSessions = pendingSlots.map((s) => ({
      id: s.id,
      className: s.class.name,
      sectionName: s.section.name,
      subjectName: s.subject.name,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const parseMinutes = (value: string) => {
      const [hourStr, minuteStr] = value.split(':');
      return Number(hourStr) * 60 + Number(minuteStr);
    };

    const todaySchedule = todaySlots.map((slot) => {
      const slotStart = parseMinutes(slot.startTime);
      const slotEnd = parseMinutes(slot.endTime);
      const session = todaySessions.find((s) => s.timetableSlotId === slot.id);
      const isCompleted = session?.status === 'SUBMITTED';
      const isCurrent =
        nowMinutes >= slotStart && nowMinutes <= slotEnd && !isCompleted;
      const canTakeAttendance = slot.class?.homeroomTeacherId === user.id;

      return {
        id: slot.id,
        className: slot.class.name,
        sectionName: slot.section.name,
        subjectName: slot.subject.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room,
        isCompleted,
        isCurrent,
        canTakeAttendance,
      };
    });

    return {
      pendingSessions,
      todaySchedule,
      completedSessions: completedSessions.length,
      notSubmittedSessions: notSubmittedSessions.length,
      weeklyStats,
    };
  }

  /**
   * Get student dashboard attendance data
   */
  async getStudentDashboard(user: any) {
    const studentId = user.id;
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get attendance records for last 30 days
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        session: {
          date: {
            gte: thirtyDaysAgo,
            lte: today,
          },
        },
      },
      include: {
        session: {
          include: {
            timetableSlot: {
              include: {
                subject: true,
              },
            },
          },
        },
      },
      orderBy: {
        session: {
          date: 'desc',
        },
      },
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const lateDays = records.filter((r) => r.status === 'LATE').length;

    // Get recent absences
    const recentAbsences = records
      .filter((r) => r.status === 'ABSENT' || r.status === 'LATE')
      .slice(0, 5)
      .map((r) => ({
        date: r.session.date,
        status: r.status,
        subject: r.session.timetableSlot?.subject?.name || 'Homeroom',
      }));

    return {
      attendancePercentage:
        totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      recentAbsences,
    };
  }

  /**
   * Get parent dashboard attendance data for a child
   */
  async getParentDashboard(user: any, studentId: string) {
    // Verify parent is linked to this student
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId: user.id },
      include: {
        children: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
      },
    });

    const isLinkedChild = parentProfile?.children.some(
      (c) => c.student.user.id === studentId,
    );

    if (!isLinkedChild) {
      throw new ForbiddenException(
        "You can only view your linked children's attendance",
      );
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        session: {
          date: {
            gte: thirtyDaysAgo,
            lte: today,
          },
        },
      },
      include: {
        session: true,
      },
      orderBy: {
        session: {
          date: 'desc',
        },
      },
    });

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;

    // Alert if attendance is low
    const attendancePercentage =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    const needsAlert = attendancePercentage < 75 && absentDays > 3;

    const childData = parentProfile?.children.find(
      (c) => c.student.user.id === studentId,
    );

    return {
      studentName: childData?.student.user.name,
      attendancePercentage,
      totalDays,
      presentDays,
      absentDays,
      needsAlert,
      recentAbsences: records
        .filter((r) => r.status === 'ABSENT')
        .slice(0, 5)
        .map((r) => r.session.date),
    };
  }

  /**
   * Get admin dashboard attendance data
   */
  /**
   * Get classes with no attendance recorded for a given date
   */
  async getMissingClasses(
    user: any,
    date: string,
    grade?: string,
    section?: string,
  ) {
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can access this endpoint');
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Build where clause for class filter
    const classWhere: any = {
      schoolId: user.schoolId,
      academicYear: {
        isActive: true,
      },
    };

    if (grade) {
      classWhere.grade = parseInt(grade);
    }

    // Get ALL active classes for the school
    const allClasses = await this.prisma.class.findMany({
      where: classWhere,
      include: {
        sections: true,
        homeroomTeacher: true,
      },
    });

    // Get attendance sessions for the target date
    const targetSessions = await this.prisma.attendanceSession.findMany({
      where: {
        schoolId: user.schoolId,
        date: targetDate,
      },
      include: {
        timetableSlot: {
          include: {
            class: true,
          },
        },
      },
    });

    // Find classes with no SUBMITTED attendance for today
    const missingAttendance: any[] = [];

    for (const cls of allClasses) {
      // Check if there's a SUBMITTED session for this class today
      // Check both regular sessions (via timetableSlot) and homeroom sessions (via classId)
      const hasSubmittedSession = targetSessions.some(
        (session) =>
          (session.classId === cls.id ||
            session.timetableSlot?.classId === cls.id) &&
          session.status === 'SUBMITTED',
      );

      if (!hasSubmittedSession) {
        // Show ALL classes without attendance, not just homeroom classes
        const sections =
          cls.sections.length > 0
            ? cls.sections
            : [{ name: cls.section || 'A' }];

        for (const sec of sections) {
          missingAttendance.push({
            classId: cls.id,
            className: cls.name,
            grade: cls.grade,
            sectionName: sec.name,
            subjectName: cls.homeroomTeacherId ? 'Homeroom' : 'N/A',
            time: 'N/A',
            startTime: null,
            endTime: null,
            hasHomeroomTeacher: !!cls.homeroomTeacherId,
          });
        }
      }
    }

    return missingAttendance.map((item) => ({
      id: item.classId,
      name: item.className,
      grade: item.grade,
      section: item.sectionName,
    }));
  }

  /**
   * Notify homeroom teachers about missing attendance
   */
  async notifyMissingAttendance(user: any, date: string) {
    if (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can access this endpoint');
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    const dayOfWeek = targetDate.getDay() || 7;

    // Get all homeroom classes with no attendance
    const classes = await this.prisma.class.findMany({
      where: {
        schoolId: user.schoolId,
        homeroomTeacherId: { not: null },
        academicYear: {
          isActive: true,
        },
      },
      include: {
        homeroomTeacher: true,
      },
    });

    const targetSessions = await this.prisma.attendanceSession.findMany({
      where: {
        schoolId: user.schoolId,
        date: targetDate,
      },
    });

    // Find classes with no submitted attendance (check only SUBMITTED status)
    const missingClasses = classes.filter((cls) => {
      const hasSubmittedSession = targetSessions.some(
        (session) =>
          session.classId === cls.id &&
          session.status === 'SUBMITTED' &&
          session.date &&
          session.date.toISOString().split('T')[0] === targetDateStr,
      );
      return !hasSubmittedSession;
    });

    // Send notifications to homeroom teachers
    const notifications: Array<{
      teacherId: string;
      teacherName: string | undefined;
      className: string;
      grade: number;
      section: string;
    }> = [];
    for (const cls of missingClasses) {
      if (cls.homeroomTeacherId && cls.grade !== null) {
        await this.notificationService.notifyHomeroomMissingAttendance(
          user.schoolId,
          cls.homeroomTeacherId,
          cls.name,
          cls.grade,
          cls.section,
          targetDateStr,
        );
        notifications.push({
          teacherId: cls.homeroomTeacherId,
          teacherName: cls.homeroomTeacher?.name,
          className: cls.name,
          grade: cls.grade,
          section: cls.section,
        });
      }
    }

    return {
      message: `Sent ${notifications.length} notifications to homeroom teachers`,
      notifications,
    };
  }

  async getAdminDashboard(
    user: any,
    date?: string,
    grade?: string,
    section?: string,
    range?: string,
  ) {
    const targetDateStr = date || new Date().toISOString().split('T')[0];
    const targetDate = new Date(targetDateStr);
    targetDate.setHours(0, 0, 0, 0);

    // Determine the range (weekly or monthly)
    const dateRange = range === 'monthly' ? 30 : 7;

    // Check if the target date is today (to apply time-based filtering)
    const isToday = targetDateStr === new Date().toISOString().split('T')[0];

    // Build filter for grade and section (only apply when explicitly provided)
    const hasGradeFilter = grade && grade !== 'all';
    const hasSectionFilter = section && section !== 'all';

    const classFilter: any = {};
    if (hasGradeFilter) {
      classFilter.grade = parseInt(grade);
    }
    if (hasSectionFilter) {
      classFilter.section = section;
    }

    // Get attendance sessions for the target date
    // Only filter by class when grade/section is explicitly provided
    const targetDateStart = new Date(targetDateStr);
    targetDateStart.setHours(0, 0, 0, 0);
    const targetDateEnd = new Date(targetDateStr);
    targetDateEnd.setHours(23, 59, 59, 999);

    const targetSessions = await this.prisma.attendanceSession.findMany({
      where: {
        schoolId: user.schoolId,
        date: {
          gte: targetDateStart,
          lte: targetDateEnd,
        },
        ...(hasGradeFilter || hasSectionFilter
          ? {
              OR: [
                {
                  timetableSlot: {
                    class: classFilter,
                  },
                },
                {
                  class: classFilter,
                },
              ],
            }
          : {}),
      },
      include: {
        attendanceRecords: true,
        timetableSlot: {
          include: {
            class: true,
            section: true,
            subject: true,
          },
        },
      },
    });

    let totalStudents = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    // Only count attendance records from SUBMITTED sessions
    targetSessions.forEach((session) => {
      // Only include records from submitted sessions
      if (session.status === 'SUBMITTED') {
        totalStudents += session.attendanceRecords.length;
        session.attendanceRecords.forEach((record) => {
          if (record.status === 'PRESENT') presentCount++;
          else if (record.status === 'ABSENT') absentCount++;
          else if (record.status === 'LATE') lateCount++;
          else if (record.status === 'EXCUSED') excusedCount++;
        });
      }
    });

    const attendanceRate =
      totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    // Get attendance cutoff time from school settings
    const cutoff = await this.getSchoolAttendanceCutoff(user.schoolId);

    // Get all timetable slots for the target date's day of week
    // Only filter by grade/section when explicitly provided
    const dayOfWeek = targetDate.getDay() || 7;
    const targetSlots = await this.prisma.timetableSlot.findMany({
      where: {
        schoolId: user.schoolId,
        dayOfWeek,
        ...(hasGradeFilter ? { class: { grade: parseInt(grade) } } : {}),
        ...(hasSectionFilter ? { section: { name: section } } : {}),
        academicYear: {
          isActive: true,
        },
      },
      include: {
        class: true,
        section: true,
        subject: true,
      },
    });

    // Filter missing attendance - only show slots where the time has passed
    const targetDateStrForMissing = targetDate.toISOString().split('T')[0]; // For date comparison

    const missingAttendance = targetSlots
      .filter((slot) => {
        const hasRegularSession = targetSessions.some(
          (session) => session.timetableSlotId === slot.id,
        );
        const hasHomeroomSession = targetSessions.some(
          (session) =>
            session.classId === slot.classId &&
            session.date &&
            session.date.toISOString().split('T')[0] === targetDateStrForMissing,
        );

        if (hasRegularSession || hasHomeroomSession) return false;

        // Parse slot end time
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
        const slotEndTime = new Date(targetDate);
        slotEndTime.setHours(endHour, endMinute, 0, 0);

        // If it's today, always show as missing (regardless of current time) since we want to see what's pending
        // If it's a past date, use the configured cutoff time
        if (isToday) {
          return true; // Show all unrecorded slots as missing for today
        } else {
          // For past dates, use configured cutoff time
          const cutoffTime = new Date(targetDate);
          cutoffTime.setHours(cutoff.hour, cutoff.minute, 0, 0);
          return cutoffTime >= slotEndTime;
        }
      })
      .map((s) => ({
        className: s.class.name,
        sectionName: s.section.name,
        subjectName: s.subject.name,
        time: `${s.startTime} - ${s.endTime}`,
        endTime: s.endTime,
      }));

    // Get recent absences
    // Only filter by grade/section when explicitly provided
    const recentAbsences = await this.prisma.attendanceRecord.findMany({
      where: {
        schoolId: user.schoolId,
        status: 'ABSENT',
        session: {
          date: targetDate,
          ...(hasGradeFilter || hasSectionFilter
            ? {
                OR: [
                  {
                    timetableSlot: {
                      class: classFilter,
                    },
                  },
                  {
                    class: classFilter,
                  },
                ],
              }
            : {}),
        },
      },
      include: {
        student: {
          include: {
            studentProfile: true,
          },
        },
        session: {
          include: {
            timetableSlot: {
              include: {
                class: true,
                section: true,
              },
            },
            class: true,
          },
        },
      },
      take: 10,
    });

    // Format recent absences
    const formattedAbsences = recentAbsences.map((r) => ({
      studentName: r.student.name,
      studentCode: r.student.studentProfile?.studentCode,
      className:
        r.session.timetableSlot?.class?.name ||
        r.session.class?.name ||
        'Unknown',
      sectionName:
        r.session.timetableSlot?.section?.name ||
        r.session.class?.section ||
        'Unknown',
    }));

    const statsStart = new Date(targetDate);
    if (range === 'monthly') {
      statsStart.setDate(statsStart.getDate() - 30);
    } else {
      statsStart.setDate(statsStart.getDate() - statsStart.getDay()); // Start of week (Sunday)
    }

    // Only filter by grade/section when explicitly provided
    const weeklySessions = await this.prisma.attendanceSession.findMany({
      where: {
        schoolId: user.schoolId,
        date: {
          gte: statsStart,
          lte: targetDate,
        },
        ...(hasGradeFilter || hasSectionFilter
          ? {
              OR: [
                {
                  timetableSlot: {
                    class: classFilter,
                  },
                },
                {
                  class: classFilter,
                },
              ],
            }
          : {}),
      },
      include: {
        attendanceRecords: true,
      },
    });

    const weeklyStats: {
      date: string;
      attendanceRate: number;
      presentCount: number;
      totalStudentsMarked: number;
    }[] = [];
    const numDays = range === 'monthly' ? 30 : 7;
    for (let i = 0; i < numDays; i++) {
      const day = new Date(statsStart);
      day.setDate(day.getDate() + i);
      const daySessions = weeklySessions.filter((s) => {
        const sessionDate = new Date(s.date);
        return sessionDate.toDateString() === day.toDateString();
      });

      let dayPresent = 0;
      let dayTotal = 0;
      daySessions.forEach((s) => {
        dayTotal += s.attendanceRecords.length;
        dayPresent += s.attendanceRecords.filter(
          (r) => r.status === 'PRESENT',
        ).length;
      });

      weeklyStats.push({
        date: day.toISOString().split('T')[0],
        attendanceRate:
          dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : 0,
        presentCount: dayPresent,
        totalStudentsMarked: dayTotal,
      });
    }

    return {
      todayStats: {
        totalSessions: targetSessions.length,
        submittedSessions: targetSessions.filter(
          (s) => s.status === 'SUBMITTED',
        ).length,
        notSubmittedSessions: targetSessions.filter(
          (s) => s.status !== 'SUBMITTED',
        ).length,
        attendanceRate,
        totalStudentsMarked: totalStudents,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
      },
      missingAttendance,
      recentAbsences: formattedAbsences,
      weeklyStats,
    };
  }

  // ==================== SCHEDULED TASKS ====================

  /**
   * Scheduled task to check for missed attendance and send notifications
   * Runs every hour to check for classes where attendance time has expired
   * Can also be called manually via POST /attendance/check-reminders
   */
  @Cron(CronExpression.EVERY_HOUR)
  public async handleAttendanceReminder() {
    console.log(
      '[Attendance] Running scheduled task to check for missed attendance...',
    );

    try {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentDayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

      // Skip weekends
      if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
        console.log('[Attendance] Skipping - it is weekend');
        return;
      }

      // Get all schools with active academic years
      const schools = await this.prisma.school.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      console.log(
        `[Attendance] Found ${schools.length} active schools to check`,
      );

      // Process each school separately
      for (const school of schools) {
        await this.processSchoolAttendanceReminder(
          school.id,
          school.name,
          now,
          today,
        );
      }

      console.log(
        '[Attendance] Completed scheduled attendance check for all schools',
      );
    } catch (error) {
      console.error('[Attendance] Error in scheduled attendance check:', error);
    }
  }

  /**
   * Process attendance reminders for a specific school
   * This ensures proper school context for notifications
   */
  private async processSchoolAttendanceReminder(
    schoolId: string,
    schoolName: string,
    now: Date,
    today: Date,
  ) {
    console.log(`[Attendance] Processing school: ${schoolName} (${schoolId})`);

    try {
      // Get active academic year for this school
      const activeAcademicYear = await this.prisma.academicYear.findFirst({
        where: {
          schoolId: schoolId,
          isActive: true,
        },
      });

      if (!activeAcademicYear) {
        console.log(
          `[Attendance] No active academic year found for school: ${schoolName}`,
        );
        return;
      }

      const cutoff = await this.getSchoolAttendanceCutoff(schoolId);

      const cutoffTime = new Date(today);
      cutoffTime.setHours(cutoff.hour, cutoff.minute, 0, 0);

      // Only send reminders if the cutoff time has passed
      if (now < cutoffTime) {
        console.log(
          `[Attendance] Cutoff time (${cutoff.formatted}) not reached yet for school: ${schoolName}`,
        );
        return;
      }

      console.log(
        `[Attendance] Cutoff time passed for school: ${schoolName}. Checking homeroom attendance...`,
      );

      // Get all homeroom classes for this school
      const homeroomClasses = await this.prisma.class.findMany({
        where: {
          schoolId: schoolId,
          academicYearId: activeAcademicYear.id,
          homeroomTeacherId: { not: null },
        },
        include: {
          homeroomTeacher: true,
        },
      });

      console.log(
        `[Attendance] Checking ${homeroomClasses.length} homeroom classes for school: ${schoolName}`,
      );

      const todayStart = new Date(today);
      const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const todayDateStr = this.getDateString(today);
      let notificationCount = 0;
      const missingClassesForAdmins: Array<{
        id: string;
        name: string;
        section: string;
      }> = [];

      for (const cls of homeroomClasses) {
        if (!cls.homeroomTeacherId) continue;

        // Check if attendance was submitted for this class today
        const existingSession = await this.prisma.attendanceSession.findFirst({
          where: {
            schoolId: schoolId,
            classId: cls.id,
            date: {
              gte: todayStart,
              lt: todayEnd,
            },
            status: 'SUBMITTED',
          },
        });

        // If no submitted session exists, notify the homeroom teacher (only once per class/day)
        if (!existingSession) {
          missingClassesForAdmins.push({
            id: cls.id,
            name: cls.name,
            section: cls.section || 'A',
          });

          try {
            // Check if notification was already sent today for this class
            // Use a more robust query that searches in metadata JSON
            const existingReminder = await this.prisma.notification.findFirst({
              where: {
                schoolId,
                userId: cls.homeroomTeacherId,
                type: 'ATTENDANCE_SESSION_OPENED',
                title: 'Attendance Cutoff Reached',
                createdAt: {
                  gte: todayStart,
                  lt: todayEnd,
                },
              },
            });

            // Additional check: if notification exists, verify it's for this specific class
            if (existingReminder) {
              const metadata =
                typeof existingReminder.metadata === 'string'
                  ? JSON.parse(existingReminder.metadata)
                  : existingReminder.metadata;
              if (metadata?.classId === cls.id) {
                continue;
              }
            }

            await this.notificationService.createNotification({
              schoolId: schoolId,
              userId: cls.homeroomTeacherId,
              title: 'Attendance Cutoff Reached',
              message: `The attendance cutoff time (${cutoff.formatted}) has passed. Please submit attendance for ${cls.name} (Section ${cls.section || 'A'}) immediately.`,
              type: 'ATTENDANCE_SESSION_OPENED' as any,
              actionUrl: '/teacher/attendance',
              metadata: {
                classId: cls.id,
                date: todayDateStr,
                isHomeroom: true,
                schoolId: schoolId,
                cutoffTime: cutoff.formatted,
              },
            });

            notificationCount++;
            console.log(
              `[Attendance] Sent cutoff notification to teacher ${cls.homeroomTeacher?.name || cls.homeroomTeacherId} for class ${cls.name}`,
            );
          } catch (error) {
            console.error(
              `[Attendance] Failed to send notification for class ${cls.name}:`,
              error,
            );
          }
        }
      }

      await this.notifyAdminsOfMissingAttendance(
        schoolId,
        todayStart,
        todayEnd,
        todayDateStr,
        cutoff.formatted,
        missingClassesForAdmins,
      );

      console.log(
        `[Attendance] Sent ${notificationCount} cutoff notifications for school: ${schoolName}`,
      );
    } catch (error) {
      console.error(
        `[Attendance] Error processing school ${schoolName}:`,
        error,
      );
    }
  }

  private async notifyAdminsOfMissingAttendance(
    schoolId: string,
    todayStart: Date,
    todayEnd: Date,
    date: string,
    cutoffTime: string,
    missingClasses: Array<{ id: string; name: string; section: string }>,
  ) {
    if (missingClasses.length === 0) return;

    const admins = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: Role.ADMIN,
      },
      select: { id: true },
    });

    if (admins.length === 0) return;

    const classPreview = missingClasses
      .slice(0, 4)
      .map((c) => `${c.name} (${c.section})`)
      .join(', ');

    const message =
      missingClasses.length > 4
        ? `${missingClasses.length} classes missed attendance after cutoff (${cutoffTime}). Examples: ${classPreview}.`
        : `${missingClasses.length} classes missed attendance after cutoff (${cutoffTime}): ${classPreview}.`;

    for (const admin of admins) {
      // Check if notification was already sent today for this date
      const existingAdminAlert = await this.prisma.notification.findFirst({
        where: {
          schoolId,
          userId: admin.id,
          title: 'Missing Attendance Alert',
          type: 'WARNING',
          createdAt: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
      });

      // Additional check: if notification exists, verify it's for this specific date
      if (existingAdminAlert) {
        const metadata =
          typeof existingAdminAlert.metadata === 'string'
            ? JSON.parse(existingAdminAlert.metadata)
            : existingAdminAlert.metadata;
        if (metadata?.date === date) {
          continue;
        }
      }

      await this.notificationService.createNotification({
        schoolId,
        userId: admin.id,
        title: 'Missing Attendance Alert',
        message,
        type: 'WARNING',
        actionUrl: '/admin/attendance',
        metadata: {
          date,
          cutoffTime,
          missingClassCount: missingClasses.length,
          classes: missingClasses,
        },
      });
    }
  }
}
