import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/types/role.enum';

@Injectable()
export class ClassService {
  constructor(private prisma: PrismaService) {}

  private async assertAcademicYearBelongsToSchool(
    schoolId: string,
    academicYearId: string,
  ) {
    if (!academicYearId) {
      throw new BadRequestException('Academic year is required');
    }

    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true },
    });

    if (!academicYear) {
      throw new BadRequestException('Academic year not found for this school');
    }
  }

  async create(data: {
    schoolId: string;
    academicYearId: string;
    grade: number;
    section: string;
    name?: string;
  }) {
    await this.assertAcademicYearBelongsToSchool(
      data.schoolId,
      data.academicYearId,
    );

    // Check if class already exists for this school, academic year, name, and section.
    const existingClass = await this.prisma.class.findFirst({
      where: {
        schoolId: data.schoolId,
        academicYearId: data.academicYearId,
        name: data.name || `Grade ${data.grade}`,
        section: data.section,
      },
    });

    if (existingClass) {
      throw new ConflictException(
        `Class for grade ${data.grade} section ${data.section} in academic year already exists`,
      );
    }

    return this.prisma.class.create({
      data: {
        schoolId: data.schoolId,
        academicYearId: data.academicYearId,
        grade: data.grade,
        section: data.section,
        name: data.name || `Grade ${data.grade}`,
      },
    });
  }

  async findAll(schoolId: string, academicYearId?: string) {
    return this.prisma.class.findMany({
      where: {
        schoolId,
        ...(academicYearId && { academicYearId }),
      },
      select: {
        id: true,
        schoolId: true,
        academicYearId: true,
        name: true,
        grade: true,
        section: true,
        academicYear: true,
        homeroomTeacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sections: {
          orderBy: { name: 'asc' },
          include: {
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { grade: 'asc' },
    });
  }

  async findOne(id: string, schoolId: string) {
    const classData = await this.prisma.class.findFirst({
      where: { id, schoolId },
      include: {
        sections: {
          orderBy: { name: 'asc' },
          include: {
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        school: true,
        homeroomTeacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    return classData;
  }

  async findByGradeAndYear(
    schoolId: string,
    academicYearId: string,
    grade: number,
  ) {
    return this.prisma.class.findFirst({
      where: {
        schoolId,
        academicYearId,
        grade,
      },
      include: {
        sections: {
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  async update(
    id: string,
    schoolId: string,
    data: {
      academicYearId?: string;
      grade?: number;
      name?: string;
      section?: string;
      homeroomTeacherId?: string | null;
    },
  ) {
    const currentClass = await this.findOne(id, schoolId);

    if (data.academicYearId !== undefined) {
      await this.assertAcademicYearBelongsToSchool(
        schoolId,
        data.academicYearId,
      );
    }

    // Check if updating would create a duplicate
    if (
      data.academicYearId !== undefined ||
      data.name !== undefined ||
      data.section !== undefined
    ) {
      const existingClass = await this.prisma.class.findFirst({
        where: {
          id: { not: id },
          schoolId,
          academicYearId: data.academicYearId ?? currentClass.academicYearId,
          name: data.name ?? currentClass.name,
          section: data.section ?? currentClass.section,
        },
      });

      if (existingClass) {
        throw new ConflictException(
          `Class ${data.name ?? currentClass.name} section ${data.section ?? currentClass.section} already exists in this academic year`,
        );
      }
    }

    // Validate homeroomTeacherId if provided
    if (data.homeroomTeacherId) {
      const teacher = await this.prisma.user.findUnique({
        where: { id: data.homeroomTeacherId },
      });
      if (!teacher || teacher.schoolId !== schoolId) {
        throw new NotFoundException('Teacher not found');
      }
      if (teacher.role !== Role.TEACHER) {
        throw new BadRequestException(
          'The selected user must be a teacher to be assigned as homeroom teacher',
        );
      }
    }

    // Build update data
    const updateData: any = {};
    if (data.academicYearId !== undefined)
      updateData.academicYearId = data.academicYearId;
    if (data.grade !== undefined) updateData.grade = data.grade;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.section !== undefined) updateData.section = data.section;
    if (data.homeroomTeacherId !== undefined)
      updateData.homeroomTeacherId = data.homeroomTeacherId || null;

    // Update class
    const updatedClass = await this.prisma.class.update({
      where: { id },
      data: updateData,
      include: {
        sections: {
          include: {
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return updatedClass;
  }

  async delete(id: string, schoolId: string) {
    await this.findOne(id, schoolId); // Validate exists

    return this.prisma.class.delete({
      where: { id },
    });
  }

  async getOrCreate(
    schoolId: string,
    academicYearId: string,
    grade: number,
    section: string,
  ) {
    let classData = await this.findByGradeAndYear(
      schoolId,
      academicYearId,
      grade,
    );

    if (!classData) {
      const created = await this.create({
        schoolId,
        academicYearId,
        grade,
        section,
      });
      classData = {
        ...created,
        sections: [],
        school: undefined,
        academicYear: undefined,
      } as any;
    }

    return classData;
  }

  async getGrades(schoolId?: string) {
    if (schoolId) {
      // Get unique grades from existing classes for the school
      const classes = await this.prisma.class.findMany({
        where: { schoolId },
        select: { grade: true },
        distinct: ['grade'],
      });

      // Return grades sorted
      return classes
        .map((c) => c.grade)
        .filter((g): g is number => g !== null)
        .sort((a, b) => a - b);
    } else {
      // For admin or when no schoolId, return all standard grades
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  }

  async search(schoolId: string, query: string, academicYearId?: string) {
    const searchTerm = query.toLowerCase();
    const gradeNum = parseInt(query);

    return this.prisma.class.findMany({
      where: {
        schoolId,
        ...(academicYearId && { academicYearId }),
        OR: [
          { name: { contains: searchTerm } },
          { grade: !isNaN(gradeNum) ? gradeNum : undefined },
          { section: { contains: searchTerm } },
        ],
      },
      select: {
        id: true,
        schoolId: true,
        academicYearId: true,
        name: true,
        grade: true,
        section: true,
        academicYear: true,
        homeroomTeacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sections: {
          orderBy: { name: 'asc' },
          include: {
            homeroomTeacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { grade: 'asc' },
      take: 50,
    });
  }

  async getStudentsByClass(
    schoolId: string,
    classId: string,
    sectionId?: string,
    search?: string,
    pagination?: { page: number; limit: number; orderBy?: string },
  ) {
    // First verify the class exists
    const classData = await this.findOne(classId, schoolId);

    // Calculate pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const skip = (page - 1) * limit;
    const orderByField = pagination?.orderBy || 'name';

    // First try to get students from StudentClass table
    const where: any = { schoolId, classId };
    if (sectionId) {
      where.sectionId = sectionId;
    }

    const studentClassCount = await this.prisma.studentClass.count({ where });

    let students: any[] = [];
    let total = 0;

    if (studentClassCount > 0) {
      // Students are linked via StudentClass table
      total = studentClassCount;
      const studentClasses = await this.prisma.studentClass.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              studentProfile: {
                select: {
                  studentCode: true,
                  academicYear: true,
                  rollNumber: true,
                  gender: true,
                  stream: true,
                  parents: {
                    take: 1,
                    select: {
                      parent: {
                        select: {
                          user: {
                            select: {
                              name: true,
                              phone: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          section: {
            select: {
              id: true,
              name: true,
              stream: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy:
          orderByField === 'rollNumber'
            ? [
                { student: { studentProfile: { rollNumber: 'asc' } } },
                { student: { name: 'asc' } },
              ]
            : { student: { name: 'asc' } },
      });

      students = studentClasses.map((sc) => ({
        id: sc.student.id,
        name: sc.student.name,
        email: sc.student.email,
        phone: sc.student.phone,
        gender: sc.student.studentProfile?.gender,
        avatarUrl: sc.student.avatarUrl,
        studentCode: sc.student.studentProfile?.studentCode,
        academicYear: sc.student.studentProfile?.academicYear,
        rollNumber: sc.student.studentProfile?.rollNumber,
        stream: sc.student.studentProfile?.stream || sc.section?.stream || null,
        parentName:
          sc.student.studentProfile?.parents?.[0]?.parent?.user?.name || null,
        parentPhone:
          sc.student.studentProfile?.parents?.[0]?.parent?.user?.phone || null,
        section: sc.section,
      }));
    } else {
      // Fall back to StudentProfile - match by className and section
      const className = classData.name || '';
      const sectionName = classData.section || '';

      // Try different class name formats to match StudentProfile.className
      const possibleClassNames = [
        className,
        className.replace('Grade ', ''),
        `Grade ${className.replace('Grade ', '')}`,
      ].filter((v, i, a) => a.indexOf(v) === i);

      // Build OR conditions for className and section matching
      const orConditions = possibleClassNames.flatMap((cn) => {
        if (sectionName) {
          return [
            { className: cn, section: sectionName },
            { className: cn, section: sectionName.toUpperCase() },
            { className: cn, section: sectionName.toLowerCase() },
          ];
        }
        return [{ className: cn }];
      });

      // Get total count
      total = await this.prisma.studentProfile.count({
        where: { schoolId, OR: orConditions },
      });

      // Get students
      const studentProfiles = await this.prisma.studentProfile.findMany({
        where: { schoolId, OR: orConditions },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
          parents: {
            take: 1,
            select: {
              parent: {
                select: {
                  user: {
                    select: {
                      name: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy:
          orderByField === 'rollNumber'
            ? [{ rollNumber: 'asc' }, { user: { name: 'asc' } }]
            : { user: { name: 'asc' } },
      });

      students = studentProfiles.map((sp) => ({
        id: sp.user.id,
        name: sp.user.name,
        email: sp.user.email,
        phone: sp.user.phone || sp.phone,
        gender: sp.gender,
        avatarUrl: sp.user.avatarUrl,
        studentCode: sp.studentCode,
        academicYear: sp.academicYear,
        rollNumber: sp.rollNumber,
        stream: sp.stream || null,
        parentName: sp.parents?.[0]?.parent?.user?.name || null,
        parentPhone: sp.parents?.[0]?.parent?.user?.phone || null,
        section: {
          id: sectionId || '',
          name: sp.section || sectionName,
        },
      }));
    }

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      students = students.filter(
        (s) =>
          s.name?.toLowerCase().includes(searchLower) ||
          s.email?.toLowerCase().includes(searchLower) ||
          s.studentCode?.toLowerCase().includes(searchLower) ||
          s.rollNumber?.toLowerCase().includes(searchLower),
      );
    }

    return {
      class: {
        id: classData.id,
        name: classData.name,
        grade: classData.grade,
        section: classData.section,
      },
      students,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getClassStats(schoolId: string, classId: string, sectionId?: string) {
    // First verify the class exists
    const classData = await this.findOne(classId, schoolId);

    // Try to get students from StudentClass table first
    const where: any = { schoolId, classId };
    if (sectionId) {
      where.sectionId = sectionId;
    }

    // Get total count
    const totalStudents = await this.prisma.studentClass.count({ where });

    let maleCount = 0;
    let femaleCount = 0;

    if (totalStudents > 0) {
      // Get gender breakdown from StudentClass -> User -> StudentProfile
      const studentClasses = await this.prisma.studentClass.findMany({
        where,
        include: {
          student: {
            include: {
              studentProfile: true,
            },
          },
        },
      });

      for (const sc of studentClasses) {
        const gender = sc.student.studentProfile?.gender;
        if (gender === 'MALE' || gender === 'Male' || gender === 'male') {
          maleCount++;
        } else if (
          gender === 'FEMALE' ||
          gender === 'Female' ||
          gender === 'female'
        ) {
          femaleCount++;
        }
      }
    } else {
      // Fall back to StudentProfile
      const className = classData.name || '';
      const sectionName = classData.section || '';

      const possibleClassNames = [
        className,
        className.replace('Grade ', ''),
        `Grade ${className.replace('Grade ', '')}`,
      ].filter((v, i, a) => a.indexOf(v) === i);

      const orConditions = possibleClassNames.flatMap((cn) => {
        if (sectionName) {
          return [
            { className: cn, section: sectionName },
            { className: cn, section: sectionName.toUpperCase() },
            { className: cn, section: sectionName.toLowerCase() },
          ];
        }
        return [{ className: cn }];
      });

      const profiles = await this.prisma.studentProfile.findMany({
        where: { schoolId, OR: orConditions },
      });

      for (const profile of profiles) {
        const gender = profile.gender;
        if (gender === 'MALE' || gender === 'Male' || gender === 'male') {
          maleCount++;
        } else if (
          gender === 'FEMALE' ||
          gender === 'Female' ||
          gender === 'female'
        ) {
          femaleCount++;
        }
      }
    }

    return {
      class: {
        id: classData.id,
        name: classData.name,
        grade: classData.grade,
        section: classData.section,
        homeroomTeacher: classData.homeroomTeacher || null,
        sections: classData.sections.map((s) => ({
          id: s.id,
          name: s.name,
          capacity: s.capacity,
          roomNumber: s.roomNumber,
          homeroomTeacher: s.homeroomTeacher,
        })),
      },
      stats: {
        totalStudents:
          totalStudents > 0 ? totalStudents : maleCount + femaleCount,
        maleCount,
        femaleCount,
      },
    };
  }
}
