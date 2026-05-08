import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/types/role.enum';

export interface SearchResult {
  type:
    | 'student'
    | 'teacher'
    | 'parent'
    | 'staff'
    | 'exam'
    | 'lesson'
    | 'announcement'
    | 'event'
    | 'class'
    | 'subject'
    | 'section'
    | 'grade'
    | 'attendance'
    | 'payment'
    | 'message';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export type SearchableEntity =
  | 'students'
  | 'teachers'
  | 'parents'
  | 'staff'
  | 'exams'
  | 'lessons'
  | 'announcements'
  | 'events'
  | 'classes'
  | 'sections'
  | 'subjects'
  | 'grades'
  | 'attendance'
  | 'payments'
  | 'messages'
  | 'finance';

// Role-based search permissions configuration
const SEARCH_PERMISSIONS: Record<Role, SearchableEntity[]> = {
  [Role.SUPER_ADMIN]: [
    'students',
    'teachers',
    'parents',
    'staff',
    'exams',
    'lessons',
    'announcements',
    'events',
    'classes',
    'sections',
    'subjects',
    'grades',
    'attendance',
    'payments',
    'messages',
    'finance',
  ],
  [Role.ADMIN]: [
    'students',
    'teachers',
    'parents',
    'staff',
    'exams',
    'lessons',
    'announcements',
    'events',
    'classes',
    'sections',
    'subjects',
    'grades',
    'attendance',
    'messages',
    'finance',
  ],
  [Role.REGISTRAR]: [
    'students',
    'teachers',
    'parents',
    'staff',
    'exams',
    'classes',
    'sections',
    'subjects',
    'grades',
    'attendance',
    'announcements',
  ],
  [Role.TEACHER]: [
    'students',
    'classes',
    'sections',
    'subjects',
    'exams',
    'lessons',
    'grades',
    'attendance',
  ],
  [Role.STUDENT]: [
    'classes',
    'subjects',
    'exams',
    'lessons',
    'grades',
    'announcements',
    'events',
  ],
  [Role.PARENT]: [
    'students',
    'grades',
    'attendance',
    'exams',
    'announcements',
    'events',
    'payments',
    'messages',
  ],
  [Role.FINANCE]: ['students', 'parents', 'payments', 'finance'],
};

const ENTITY_LABELS: Record<SearchableEntity, string> = {
  students: 'Students',
  teachers: 'Teachers',
  parents: 'Parents',
  staff: 'Staff',
  exams: 'Exams',
  lessons: 'Lessons',
  announcements: 'Announcements',
  events: 'Events',
  classes: 'Classes',
  sections: 'Sections',
  subjects: 'Subjects',
  grades: 'Grades',
  attendance: 'Attendance',
  payments: 'Payments',
  messages: 'Messages',
  finance: 'Finance',
};

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  private getSearchPermissions(role: string): SearchableEntity[] {
    const normalizedRole = role?.toUpperCase() as Role;
    return SEARCH_PERMISSIONS[normalizedRole] || SEARCH_PERMISSIONS[Role.ADMIN];
  }

  async globalSearch(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<{ data: SearchResult[]; permissions: SearchableEntity[] }> {
    const lowerQuery = query.toLowerCase();
    const permissions = this.getSearchPermissions(userRole);

    const searchPromises: Promise<SearchResult[]>[] = [];

    // Only search entities the user has permission for
    if (
      permissions.includes('students') ||
      permissions.includes('teachers') ||
      permissions.includes('parents') ||
      permissions.includes('staff')
    ) {
      searchPromises.push(this.searchUsers(query, schoolId, userRole));
    }
    if (permissions.includes('exams')) {
      searchPromises.push(this.searchExams(query, schoolId, userRole));
    }
    if (permissions.includes('lessons')) {
      searchPromises.push(this.searchLessons(query, schoolId, userRole));
    }
    if (permissions.includes('announcements')) {
      searchPromises.push(this.searchAnnouncements(query, schoolId));
    }
    if (permissions.includes('events')) {
      searchPromises.push(this.searchEvents(query, schoolId));
    }
    if (permissions.includes('classes') || permissions.includes('sections')) {
      searchPromises.push(this.searchClasses(query, schoolId, userRole));
    }
    if (permissions.includes('subjects')) {
      searchPromises.push(this.searchSubjects(query, schoolId));
    }
    if (permissions.includes('grades')) {
      searchPromises.push(this.searchGrades(query, schoolId, userRole));
    }
    if (permissions.includes('attendance')) {
      searchPromises.push(this.searchAttendance(query, schoolId, userRole));
    }
    if (permissions.includes('payments')) {
      searchPromises.push(this.searchPayments(query, schoolId, userRole));
    }

    let results: SearchResult[] = [];
    try {
      results = (await Promise.all(searchPromises)).flat().filter(Boolean);
    } catch (error) {
      console.error('Global search data fetching error:', error);
      // Continue with empty results or whatever we have partially
    }

    // Sort by relevance (title starts with query first)
    results.sort((a, b) => {
      const aStartsWith = a.title.toLowerCase().startsWith(lowerQuery);
      const bStartsWith = b.title.toLowerCase().startsWith(lowerQuery);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.title.localeCompare(b.title);
    });

    // Limit results
    return { data: results.slice(0, 25), permissions };
  }

  private async searchUsers(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    // Only super_admin can search across all schools
    if (userRole !== Role.SUPER_ADMIN && !schoolId) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        schoolId: true,
      },
    });

    const results: SearchResult[] = [];
    const permissions = this.getSearchPermissions(userRole);

    for (const user of users) {
      const roleKey = user.role?.toLowerCase() || 'staff';
      const isOwnSchool = user.schoolId === schoolId;

      let type: SearchResult['type'] = 'staff';
      let href = '';
      let showInSearch = false;

      switch (roleKey) {
        case 'student':
          type = 'student';
          href = `/list/students/${user.id}`;
          showInSearch = permissions.includes('students');
          break;
        case 'teacher':
          type = 'teacher';
          href = `/list/teachers/${user.id}`;
          showInSearch = permissions.includes('teachers');
          break;
        case 'parent':
          type = 'parent';
          href = `/list/parents/${user.id}`;
          showInSearch = permissions.includes('parents');
          break;
        default:
          type = 'staff';
          href = `/list/staff/${user.id}`;
          showInSearch = permissions.includes('staff');
      }

      // Only show users from own school unless super admin
      if (!showInSearch) continue;
      if (userRole !== Role.SUPER_ADMIN && !isOwnSchool) continue;

      results.push({
        type,
        id: user.id,
        title: user.name || 'Unnamed User',
        subtitle: `${roleKey.charAt(0).toUpperCase() + roleKey.slice(1)} • ${user.email || ''}`,
        href,
      });
    }

    return results;
  }

  private async searchExams(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      OR: [{ title: { contains: query, mode: 'insensitive' } }],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const exams = await this.prisma.exam.findMany({
      where: whereClause,
      take: 3,
      select: {
        id: true,
        title: true,
        date: true,
        type: true,
      },
    });

    const results: SearchResult[] = [];

    for (const exam of exams) {
      // Determine href based on role
      let href = '/admin/exams';
      if (userRole === Role.TEACHER) {
        href = '/teacher/exams';
      } else if (userRole === Role.STUDENT) {
        href = '/student/exams';
      }

      results.push({
        type: 'exam',
        id: exam.id,
        title: exam.title,
        subtitle: `${exam.type || 'Exam'} • ${new Date(exam.date).toLocaleDateString()}`,
        href,
      });
    }

    return results;
  }

  private async searchLessons(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { objective: { contains: query, mode: 'insensitive' } },
        { topicName: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const lessons = await this.prisma.content.findMany({
      where: whereClause,
      take: 3,
      select: {
        id: true,
        title: true,
        topicName: true,
      },
    });

    const results: SearchResult[] = [];

    for (const lesson of lessons) {
      results.push({
        type: 'lesson',
        id: lesson.id,
        title: lesson.title,
        subtitle: lesson.topicName || 'Lesson',
        href: '/teacher/lessons',
      });
    }

    return results;
  }

  private async searchAnnouncements(
    query: string,
    schoolId: string | null,
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const announcements = await this.prisma.announcement.findMany({
      where: whereClause,
      take: 3,
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    const results: SearchResult[] = [];

    for (const announcement of announcements) {
      results.push({
        type: 'announcement',
        id: announcement.id,
        title: announcement.title,
        subtitle: new Date(announcement.createdAt).toLocaleDateString(),
        href: '/list/announcements',
      });
    }

    return results;
  }

  private async searchEvents(
    query: string,
    schoolId: string | null,
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const events = await this.prisma.schoolEvent.findMany({
      where: whereClause,
      take: 3,
      select: {
        id: true,
        title: true,
        startDate: true,
      },
    });

    const results: SearchResult[] = [];

    for (const event of events) {
      results.push({
        type: 'event',
        id: event.id,
        title: event.title,
        subtitle: new Date(event.startDate).toLocaleDateString(),
        href: '/list/events',
      });
    }

    return results;
  }

  private async searchClasses(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<SearchResult[]> {
    try {
      const whereClause: any = {
        OR: [{ name: { contains: query, mode: 'insensitive' } }],
      };

      if (schoolId) {
        whereClause.schoolId = schoolId;
      }

      const classes = await this.prisma.class.findMany({
        where: whereClause,
        take: 3,
        select: {
          id: true,
          name: true,
          grade: true,
        },
      });

      // Get class IDs to fetch their sections
      const classIds = classes.map((cls) => cls.id);

      const sectionsMap = new Map<string, any[]>();
      if (classIds.length > 0) {
        const sections = await this.prisma.section.findMany({
          where: {
            classId: { in: classIds },
          },
          select: {
            id: true,
            name: true,
            classId: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        });

        for (const section of sections) {
          const existing = sectionsMap.get(section.classId) || [];
          existing.push(section);
          sectionsMap.set(section.classId, existing);
        }
      }

      const results: SearchResult[] = [];

      // Determine href based on role
      let baseHref = '/admin/class-sections';
      if (userRole === Role.TEACHER) {
        baseHref = '/teacher/my-class';
      }

      for (const cls of classes) {
        const sections = sectionsMap.get(cls.id) || [];

        if (sections.length > 0) {
          for (const section of sections) {
            results.push({
              type: 'section',
              id: section.id,
              title: `Section ${section.name}`,
              subtitle: section.class?.name || cls.name,
              href: `${baseHref}/${cls.id}`,
            });
          }
        } else {
          results.push({
            type: 'class',
            id: cls.id,
            title: cls.name,
            subtitle: cls.grade ? `Grade ${cls.grade}` : undefined,
            href: `${baseHref}/${cls.id}`,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Search classes error:', error);
      return [];
    }
  }

  private async searchSubjects(
    query: string,
    schoolId: string | null,
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const subjects = await this.prisma.subject.findMany({
      where: whereClause,
      take: 3,
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    const results: SearchResult[] = [];

    for (const subject of subjects) {
      results.push({
        type: 'subject',
        id: subject.id,
        title: subject.name,
        subtitle: subject.code || undefined,
        href: '/admin/subjects',
      });
    }

    return results;
  }

  private async searchGrades(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      OR: [{ student: { name: { contains: query, mode: 'insensitive' } } }],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const grades = await this.prisma.grade.findMany({
      where: whereClause,
      take: 3,
      include: {
        student: {
          select: { name: true, id: true },
        },
        subject: {
          select: { name: true },
        },
      },
    });

    const results: SearchResult[] = [];

    for (const grade of grades) {
      // Determine href based on role
      let href = '/registrar/grading';
      if (userRole === Role.TEACHER) {
        href = '/teacher/grading';
      } else if (userRole === Role.STUDENT || userRole === Role.PARENT) {
        href = '/student/grades';
      }

      results.push({
        type: 'grade',
        id: grade.id,
        title: `Grade: ${grade.subject?.name || 'Subject'}`,
        subtitle: `Student: ${grade.student?.name || 'Unknown'}`,
        href,
      });
    }

    return results;
  }

  private async searchAttendance(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      OR: [{ student: { name: { contains: query, mode: 'insensitive' } } }],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const attendance = await this.prisma.attendance.findMany({
      where: whereClause,
      take: 3,
      include: {
        student: {
          select: { name: true },
        },
      },
    });

    const results: SearchResult[] = [];

    for (const record of attendance) {
      // Determine href based on role
      let href = '/admin/attendance';
      if (userRole === Role.TEACHER) {
        href = '/teacher/attendance';
      } else if (userRole === Role.PARENT) {
        href = '/parent/children';
      }

      results.push({
        type: 'attendance',
        id: record.id,
        title: `Attendance Record`,
        subtitle: `Student: ${record.student?.name || 'Unknown'} • ${new Date(record.date).toLocaleDateString()}`,
        href,
      });
    }

    return results;
  }

  private async searchPayments(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      OR: [
        { student: { name: { contains: query, mode: 'insensitive' } } },
        { receiptNumber: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const payments = await this.prisma.payment.findMany({
      where: whereClause,
      take: 3,
      include: {
        student: {
          select: { name: true },
        },
      },
    });

    const results: SearchResult[] = [];

    for (const payment of payments) {
      results.push({
        type: 'payment',
        id: payment.id,
        title: `Payment: $${payment.amountPaid.toFixed(2)}`,
        subtitle: `Student: ${payment.student?.name || 'Unknown'} • ${payment.receiptNumber || ''}`,
        href: '/list/finance',
      });
    }

    return results;
  }

  // Get available search categories for the frontend
  async getSearchCategories(
    schoolId: string | null,
    userRole: string,
  ): Promise<{
    categories: SearchableEntity[];
    labels: Record<string, string>;
  }> {
    const permissions = this.getSearchPermissions(userRole);

    // Only super_admin can search across all schools
    if (userRole !== Role.SUPER_ADMIN && !schoolId) {
      return { categories: [], labels: ENTITY_LABELS };
    }

    return { categories: permissions, labels: ENTITY_LABELS };
  }
}
