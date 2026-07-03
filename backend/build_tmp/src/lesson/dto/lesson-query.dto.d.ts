import { LessonStatus, ContentType } from '@prisma/client';
export declare class LessonQueryDto {
    type?: ContentType;
    grade?: number;
    section?: string;
    semesterId?: string;
    subjectId?: string;
    startDate?: string;
    endDate?: string;
    status?: LessonStatus;
    academicYearId?: string;
    studentId?: string;
    page?: number;
    limit?: number;
}
