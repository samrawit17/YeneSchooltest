import { ExamType } from '@prisma/client';
export declare class CreateExamDto {
    classId: string;
    sectionId?: string;
    subjectId: string;
    type: ExamType;
    title: string;
    date: string;
    maxMarks: number;
    weightage?: number;
    description?: string;
}
export declare class UpdateExamDto {
    title?: string;
    date?: string;
    maxMarks?: number;
    weightage?: number;
    description?: string;
}
export declare class ExamResultEntryDto {
    studentId: string;
    marks: number;
    grade?: string;
    remarks?: string;
}
export declare class BulkExamResultDto {
    results: ExamResultEntryDto[];
}
export declare class GetExamsFilterDto {
    classId?: string;
    sectionId?: string;
    subjectId?: string;
    type?: ExamType;
    academicYearId?: string;
}
