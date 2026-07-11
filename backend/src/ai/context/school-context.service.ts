import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SchoolContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getBasicInfo(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, code: true, email: true, phone: true, timezone: true, address: true },
    });
    if (!school) return null;

    return {
      id: school.id,
      name: school.name,
      code: school.code,
      email: school.email,
      phone: school.phone,
      timezone: school.timezone,
      address: school.address,
    };
  }

  async getOverview(schoolId: string) {
    const [studentCount, teacherCount, classCount] = await Promise.all([
      this.prisma.studentProfile.count({ where: { schoolId } }),
      this.prisma.teacherProfile.count({ where: { schoolId } }),
      this.prisma.class.count({ where: { schoolId } }),
    ]);

    return {
      schoolId,
      totalStudents: studentCount,
      totalTeachers: teacherCount,
      totalClasses: classCount,
    };
  }
}
