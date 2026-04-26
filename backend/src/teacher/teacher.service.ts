import { Injectable } from '@nestjs/common';
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
      avatarUrl: teacher.avatarUrl || '',
    };
  }

  /**
   * Get assigned classes and sections for a teacher (homeroom assignments)
   */
  async getMyAssignments(teacherId: string, schoolId: string) {
    // Homeroom classes are no longer directly linked, we get them via sections
    const homeroomSections = await this.prisma.section.findMany({
      where: {
        homeroomTeacherId: teacherId,
        class: {
          schoolId,
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
      where: { teacherId },
      select: { classId: true, sectionId: true },
    });
    
    const classIds = classSubjects.map(cs => cs.classId);
    const sectionIds = classSubjects.map(cs => cs.sectionId);
    
    const timetableSlots = await this.prisma.timetableSlot.findMany({
      where: {
        schoolId,
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
        const className = section.class.name || `Grade ${section.class.grade}`;
        const possibleClassNames = [
          className,
          className.replace('Grade ', ''),
          `Grade ${className.replace('Grade ', '')}`,
        ].filter((v, i, arr) => arr.indexOf(v) === i);

        const possibleSections = [
          section.name,
          section.name.toUpperCase(),
          section.name.toLowerCase(),
        ].filter((v, i, arr) => arr.indexOf(v) === i);

        const studentCount = await this.prisma.studentProfile.count({
          where: {
            schoolId,
            enrollmentStatus: 'APPROVED',
            className: { in: possibleClassNames },
            section: { in: possibleSections },
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

    return {
      homeroomClasses: homeroomClasses.map((cls) => ({
        ...cls,
        studentCount: classStudentCountMap.get(cls.id) || 0,
      })),
      homeroomSections: homeroomSectionStudentCounts,
      teachingAssignments: timetableSlots,
    };
  }
}
