import { NationalExamSource, NationalExamType } from '@prisma/client';
export declare class NationalExamSubjectResultDto {
    subjectName: string;
    score: number;
    gradeLetter?: string;
}
export declare class NationalExamResultImportRowDto {
    candidateNumber: string;
    studentName: string;
    grade: number;
    stream?: string;
    totalScore?: number;
    status?: string;
    remarks?: string;
    subjects: NationalExamSubjectResultDto[];
}
export declare class ImportNationalExamResultsDto {
    examType: NationalExamType;
    examYear: string;
    academicYearId?: string;
    source?: NationalExamSource;
    fileName?: string;
    cutoffScore?: number;
    rows: NationalExamResultImportRowDto[];
}
