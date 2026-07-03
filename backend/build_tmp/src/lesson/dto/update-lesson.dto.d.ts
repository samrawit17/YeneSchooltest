import { LessonStatus, ContentType } from '@prisma/client';
export declare class UpdateLessonDto {
    type?: ContentType;
    title?: string;
    description?: string;
    instructions?: string;
    objective?: string;
    lessonContent?: string;
    grade?: number;
    section?: string;
    stream?: string;
    academicYearId?: string;
    semesterId?: string;
    subjectId?: string;
    lessonDate?: string;
    periodNumber?: number;
    dueDate?: string;
    totalPoints?: number;
    maxMarks?: number;
    attachments?: string;
    unitNumber?: number;
    topicName?: string;
    topicId?: string;
    competency?: string;
    syllabusMappingId?: string;
    status?: LessonStatus;
    isExamPrep?: boolean;
    isLocked?: boolean;
}
