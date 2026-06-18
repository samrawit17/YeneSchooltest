import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  async getTeachers(
    schoolId: string,
    filters?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      classId?: string;
      sectionId?: string;
      subject?: string;
    },
  ) {
    const andConditions: any[] = [];
    const where: any = {
      schoolId,
      role: 'TEACHER',
    };

    if (filters?.search) {
      andConditions.push({
        OR: [
          { name: { contains: filters.search } },
          { email: { contains: filters.search } },
        ],
      });
    }

    // Filter by active status if provided
    if (filters?.status === 'Active') {
      where.isActive = true;
    } else if (filters?.status === 'Inactive') {
      where.isActive = false;
    }

    // Filter by class (teacher who teaches in a class or is homeroom of a section in that class)
    if (filters?.classId) {
      andConditions.push({
        OR: [
          {
            homeroomSections: {
              some: { classId: filters.classId },
            },
          },
          {
            teacherAssignments: {
              some: { classId: filters.classId },
            },
          },
        ],
      });
    }

    // Filter by section (homeroom teacher of a section)
    if (filters?.sectionId) {
      where.homeroomSections = {
        some: {
          id: filters.sectionId,
        },
      };
    }

    // Filter by subject (teacher who teaches a specific subject)
    if (filters?.subject) {
      where.teacherProfile = {
        specialization: { contains: filters.subject },
      };
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 10));
    const skip = (page - 1) * limit;

    const total = await this.prisma.user.count({ where });

    const teachers = await this.prisma.user.findMany({
      where,
      include: {
        teacherProfile: true,
        homeroomSections: {
          include: {
            class: true,
          },
        },
        classSubjects: {
          include: {
            subject: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Transform the data to include teacher-specific fields
    const transformedTeachers = teachers.map((teacher) => {
      // Get unique subjects taught by this teacher
      const subjects = [...new Set(teacher.classSubjects?.map(cs => cs.subject?.name).filter(Boolean) || [])];
      
      return {
        id: teacher.id,
        userId: teacher.id,
        email: teacher.email,
        name: teacher.name,
        staffId:
          teacher.teacherProfile?.employeeId ||
          `TCH-${teacher.id.slice(0, 6).toUpperCase()}`,
        phone: teacher.phone || '',
        isActive: teacher.isActive,
        employmentStatus: teacher.isActive ? 'Active' : 'Inactive',
        designation: teacher.teacherProfile?.designation || 'Teacher',
        specialization: teacher.teacherProfile?.specialization || '',
        subjects: subjects,
        hireDate: teacher.teacherProfile?.hireDate,
        createdAt: teacher.createdAt,
        avatarUrl: teacher.avatarUrl || '',
        assignedClasses:
          teacher.homeroomSections?.map((section) => {
            const gradeStr = section.class?.grade
              ? `Grade ${section.class.grade}`
              : section.class?.name || 'Unknown';
            return `${gradeStr} - ${section.name}`;
          }) || [],
      };
    });

    return {
      data: transformedTeachers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTeacherById(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: teacherId,
        schoolId,
        role: 'TEACHER',
      },
      include: {
        teacherProfile: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!teacher) {
      return null;
    }

    return {
      id: teacher.id,
      userId: teacher.id,
      email: teacher.email,
      username: teacher.username,
      name: teacher.name,
      staffId: teacher.teacherProfile?.employeeId || '',
      phone: teacher.phone || '',
      isActive: teacher.isActive,
      employmentStatus: teacher.isActive ? 'Active' : 'Inactive',
      designation: teacher.teacherProfile?.designation || 'Teacher',
      specialization: teacher.teacherProfile?.specialization || '',
      hireDate: teacher.teacherProfile?.hireDate,
      department: teacher.teacherProfile?.department?.name || '',
      createdAt: teacher.createdAt,
      lastLoginAt: teacher.lastLoginAt,
      avatarUrl: teacher.avatarUrl || '',
    };
  }

  /**
   * Get assigned classes and sections for a teacher (homeroom assignments)
   */
  async getMyAssignments(teacherId: string, schoolId: string, academicYear?: string) {
    const teacher = await this.prisma.user.findFirst({
      where: {
        id: teacherId,
        schoolId,
        role: 'TEACHER',
      },
      select: { id: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Resolve academic year ID — accepts either name or ID
    let resolvedAcademicYear: any;
    if (academicYear) {
      resolvedAcademicYear = await this.prisma.academicYear.findFirst({
        where: {
          schoolId,
          OR: [
            { id: academicYear },
            { name: academicYear },
          ],
        },
      });
      
      if (!resolvedAcademicYear && academicYear) {
        // If it looks like a CUID but wasn't found, we should still try to use it as an ID
        // or return empty if we want to be strict. Let's return empty result.
        return {
          homeroomClasses: [],
          homeroomSections: [],
          teachingAssignments: [],
          teachingClasses: [],
        };
      }
    }

    // Default to active year ONLY if no academicYear was provided at all
    if (!resolvedAcademicYear && !academicYear) {
      resolvedAcademicYear = await this.prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
      });
    }

    const academicYearId = resolvedAcademicYear?.id;
    const academicYearName = resolvedAcademicYear?.name;

    // Homeroom classes are no longer directly linked, we get them via sections
    const homeroomSections = await this.prisma.section.findMany({
      where: {
        homeroomTeacherId: teacherId,
        class: {
          schoolId,
          ...(academicYearId ? { academicYearId } : {}),
        },
      },
      select: {
        id: true,
        name: true,
        capacity: true,
        roomNumber: true,
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    // Derived homeroom classes (distinct)
    const homeroomClasses = Array.from(
      new Map(homeroomSections.map((s) => [s.class.id, s.class])).values(),
    );

    // Get teacher's timetable slots (subjects they teach)
    // Also include slots where teacher is assigned via ClassSubject
    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        teacherId,
        class: {
          schoolId,
          ...(academicYearId ? { academicYearId } : {}),
        },
        ...(academicYearId ? { academicYear: academicYearId } : {}),
      },
      select: {
        id: true,
        classId: true,
        sectionId: true,
        subjectId: true,
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            roomNumber: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
    
    const classIds = classSubjects.map(cs => cs.classId);
    const sectionIds = classSubjects.map(cs => cs.sectionId);
    
    const timetableSlots = await this.prisma.timetableSlot.findMany({
      where: {
        schoolId,
        ...(academicYearId ? { academicYearId } : {}),
        OR: [
          { teacherId },
          { classId: { in: classIds }, sectionId: { in: sectionIds } },
        ],
      },
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        room: true,
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    const homeroomSectionStudentCounts = await Promise.all(
      homeroomSections.map(async (section) => {
        const studentCount = await this.prisma.studentClass.count({
          where: {
            schoolId,
            classId: section.class.id,
            sectionId: section.id,
            ...(academicYearName ? { academicYear: academicYearName } : {}),
          },
        });

        return {
          ...section,
          studentCount,
        };
      }),
    );

    const classStudentCountMap = new Map<string, number>();
    for (const section of homeroomSectionStudentCounts) {
      const existing = classStudentCountMap.get(section.class.id) || 0;
      classStudentCountMap.set(
        section.class.id,
        existing + section.studentCount,
      );
    }

    const teachingAssignmentMap = new Map<
      string,
      {
        id: string;
        class: {
          id: string;
          name: string;
          grade: number | null;
          section: string | null;
        };
        section: {
          id: string;
          name: string;
          roomNumber: string | null;
        } | null;
        subject: {
          id: string;
          name: string;
          code: string | null;
        } | null;
        room: string | null;
        schedules: string[];
        studentCount: number;
      }
    >();

    const studentCounts = await Promise.all(
      classSubjects.map(async (assignment) => {
        const studentCount = await this.prisma.studentClass.count({
          where: {
            schoolId,
            classId: assignment.classId,
            sectionId: assignment.sectionId,
            ...(academicYearName ? { academicYear: academicYearName } : {}),
          },
        });

        return {
          key: `${assignment.classId}:${assignment.sectionId}:${assignment.subjectId}`,
          studentCount,
        };
      }),
    );

    const studentCountMap = new Map(
      studentCounts.map((item) => [item.key, item.studentCount]),
    );

    for (const assignment of classSubjects) {
      const key = `${assignment.classId}:${assignment.sectionId}:${assignment.subjectId}`;
      teachingAssignmentMap.set(key, {
        id: assignment.id,
        class: assignment.class,
        section: assignment.section,
        subject: assignment.subject,
        room: assignment.section?.roomNumber || null,
        schedules: [],
        studentCount: studentCountMap.get(key) || 0,
      });
    }

    const formatSchedule = (slot: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
    }) => `${slot.dayOfWeek}|${slot.startTime}-${slot.endTime}`;

    for (const slot of timetableSlots) {
      const key = `${slot.class.id}:${slot.section?.id || ""}:${slot.subject?.id || ""}`;
      const existing = teachingAssignmentMap.get(key);

      if (existing) {
        existing.room = slot.room || existing.room;
        existing.schedules.push(formatSchedule(slot));
        continue;
      }

      const studentCount = slot.section?.id
        ? await this.prisma.studentClass.count({
            where: {
              schoolId,
              classId: slot.class.id,
              sectionId: slot.section.id,
              ...(academicYearName ? { academicYear: academicYearName } : {}),
            },
          })
        : 0;

      teachingAssignmentMap.set(key, {
        id: slot.id,
        class: slot.class,
        section: slot.section
          ? {
              ...slot.section,
              roomNumber: null,
            }
          : null,
        subject: slot.subject,
        room: slot.room || null,
        schedules: [formatSchedule(slot)],
        studentCount,
      });
    }

    const teachingClasses = Array.from(teachingAssignmentMap.values()).map(
      (item) => ({
        id: item.id,
        class: item.class,
        section: item.section,
        subject: item.subject,
        room: item.room,
        studentCount: item.studentCount,
        schedules: Array.from(new Set(item.schedules)).sort(),
      }),
    );

    return {
      homeroomClasses: homeroomClasses.map((cls) => ({
        ...cls,
        studentCount: classStudentCountMap.get(cls.id) || 0,
      })),
      homeroomSections: homeroomSectionStudentCounts,
      teachingAssignments: timetableSlots,
      teachingClasses,
    };
  }
}
