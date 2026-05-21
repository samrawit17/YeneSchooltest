import { PrismaService } from '../prisma/prisma.service';
export interface SearchResult {
    type: 'student' | 'teacher' | 'parent' | 'staff' | 'exam' | 'lesson' | 'announcement' | 'event' | 'class' | 'subject' | 'section' | 'grade';
    id: string;
    title: string;
    subtitle?: string;
    href: string;
}
export type SearchableEntity = 'students' | 'teachers' | 'parents' | 'staff' | 'exams' | 'lessons' | 'announcements' | 'events' | 'classes' | 'sections' | 'subjects' | 'grades';
export declare class SearchService {
    private prisma;
    constructor(prisma: PrismaService);
    private getSearchPermissions;
    private getLessonsHref;
    private getSubjectsHref;
    globalSearch(query: string, schoolId: string | null, userRole: string): Promise<{
        data: SearchResult[];
        permissions: SearchableEntity[];
    }>;
    private searchUsers;
    private searchExams;
    private searchLessons;
    private searchAnnouncements;
    private searchEvents;
    private searchClassesAndSections;
    private searchSubjects;
    private searchGrades;
    getSearchCategories(schoolId: string | null, userRole: string): SearchableEntity[];
}
