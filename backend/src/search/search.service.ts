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
    | 'grade';
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
  | 'grades';

// Role-based search permissions configuration
const SEARCH_PERMISSIONS: Record<Role, SearchableEntity[]> = {
  [Role.SUPER_ADMIN]: [],
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
  ],
  [Role.IT_MANAGER]: [
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
  ],
  [Role.REGISTRAR]: [
    'students',
    'exams',
    'classes',
    'sections',
    'subjects',
    'grades',
    'announcements',
  ],
  [Role.TEACHER]: ['students', 'classes', 'sections', 'subjects', 'exams', 'lessons', 'grades'],
  [Role.STUDENT]: ['classes', 'subjects', 'exams', 'lessons', 'announcements', 'events', 'grades'],
  [Role.PARENT]: ['announcements', 'events', 'exams'],
  [Role.FINANCE]: ['students'],
};

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  private getSearchPermissions(role: string): SearchableEntity[] {
    const normalizedRole = role?.toUpperCase() as Role;
    return SEARCH_PERMISSIONS[normalizedRole] || SEARCH_PERMISSIONS[Role.IT_MANAGER];
  }

  private getLessonsHref(userRole: string, lessonId: string): string {
    switch (userRole) {
      case Role.TEACHER:
        return `/teacher/lessons/${lessonId}`;
      case Role.STUDENT:
        return '/student/lessons';
      case Role.PARENT:
        return '/parent/lessons';
      default:
        return '/teacher/lessons';
    }
  }

  private getSubjectsHref(userRole: string): string {
    switch (userRole) {
      case Role.TEACHER:
        return '/teacher/my-class';
      case Role.STUDENT:
        return '/student/lessons';
      default:
        return '/admin/class-sections';
    }
  }

  async globalSearch(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<{ data: SearchResult[]; permissions: SearchableEntity[] }> {
    const lowerQuery = query.toLowerCase();
    const permissions = this.getSearchPermissions(userRole);
    if (userRole === Role.SUPER_ADMIN || !schoolId) {
      return { data: [], permissions: [] };
    }

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
      searchPromises.push(this.searchClassesAndSections(query, schoolId, userRole));
    }
    if (permissions.includes('subjects')) {
      searchPromises.push(this.searchSubjects(query, schoolId, userRole));
    }
    if (permissions.includes('grades')) {
      searchPromises.push(this.searchGrades(query, schoolId, userRole));
    }

    const settledResults = await Promise.allSettled(searchPromises);
    const results = settledResults.flatMap((result) => {
      if (result.status === 'fulfilled') {
        return result.value.filter(Boolean);
      }
      console.error('Global search data fetching error:', result.reason);
      return [];
    });

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

    if (!schoolId) {
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
          href = `/list/staff/${user.id}`;
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

      if (!showInSearch) continue;
      if (!isOwnSchool) continue;

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
        href: this.getLessonsHref(userRole, lesson.id),
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
        href: `/list/announcements/${announcement.id}`,
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
        href: '/list/calendar',
      });
    }

    return results;
  }

  private async searchClassesAndSections(
    query: string,
    schoolId: string | null,
    userRole: string,
  ): Promise<SearchResult[]> {
    try {
      const classWhereClause: any = {
        OR: [{ name: { contains: query, mode: 'insensitive' } }],
      };

      if (schoolId) {
        classWhereClause.schoolId = schoolId;
      }

      const classes = await this.prisma.class.findMany({
        where: classWhereClause,
        take: 3,
        select: {
          id: true,
          name: true,
          grade: true,
          sections: {
            select: {
              name: true,
            },
            orderBy: {
              name: 'asc',
            },
            take: 6,
          },
        },
      });

      const sectionWhereClause: any = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { roomNumber: { contains: query, mode: 'insensitive' } },
          { class: { name: { contains: query, mode: 'insensitive' } } },
        ],
      };

      if (schoolId) {
        sectionWhereClause.class = {
          ...(sectionWhereClause.class || {}),
          schoolId,
        };
      }

      const sections = await this.prisma.section.findMany({
        where: sectionWhereClause,
        take: 5,
        select: {
          id: true,
          name: true,
          roomNumber: true,
          classId: true,
          class: {
            select: {
              name: true,
            },
          },
        },
      });

      const results: SearchResult[] = [];
      const seen = new Set<string>();

      let baseHref = '/admin/class-sections';
      if (userRole === Role.TEACHER) {
        baseHref = '/teacher/my-class';
      }

      for (const cls of classes) {
        const sectionLetters = cls.sections
          .map((section) => section.name?.trim())
          .filter(Boolean);
        const subtitleParts: string[] = [];
        if (cls.grade) {
          subtitleParts.push(`Grade ${cls.grade}`);
        }
        if (sectionLetters.length > 0) {
          subtitleParts.push(`Sections: ${sectionLetters.join(', ')}`);
        }

        results.push({
          type: 'class',
          id: cls.id,
          title: cls.name,
          subtitle: subtitleParts.join(' • ') || undefined,
          href: `${baseHref}/${cls.id}`,
        });
        seen.add(`class:${cls.id}`);
      }

      for (const section of sections) {
        const key = `section:${section.id}`;
        if (seen.has(key)) continue;
        if (seen.has(`class:${section.classId}`)) continue;

        const subtitleParts = [section.class?.name];
        if (section.roomNumber) {
          subtitleParts.push(`Room ${section.roomNumber}`);
        }

        results.push({
          type: 'section',
          id: section.id,
          title: `Section ${section.name}`,
          subtitle: subtitleParts.filter(Boolean).join(' • '),
          href: `${baseHref}/${section.classId}`,
        });
        seen.add(key);
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
    userRole: string,
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
        href: this.getSubjectsHref(userRole),
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
      OR: [
        { student: { name: { contains: query, mode: 'insensitive' } } },
        { subject: { name: { contains: query, mode: 'insensitive' } } },
      ],
    };

    if (schoolId) {
      whereClause.schoolId = schoolId;
    }

    const grades = await this.prisma.grade.findMany({
      where: whereClause,
      take: 5,
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
      let href = '/registrar/grading';
      if (userRole === Role.TEACHER) {
        href = '/teacher/grading';
      } else if (userRole === Role.STUDENT) {
        href = '/student/grades';
      } else if (userRole === Role.PARENT) {
        href = '/parent/grades';
      }

      results.push({
        type: 'grade',
        id: grade.id,
        title: grade.subject?.name
          ? `Grade: ${grade.subject.name}`
          : 'Grade Record',
        subtitle: `Student: ${grade.student?.name || 'Unknown'}`,
        href,
      });
    }

    return results;
  }

  getSearchCategories(
    schoolId: string | null,
    userRole: string,
  ): SearchableEntity[] {
    const permissions = this.getSearchPermissions(userRole);

    if (userRole === Role.SUPER_ADMIN || !schoolId) {
      return [];
    }

    return permissions;
  }
}
