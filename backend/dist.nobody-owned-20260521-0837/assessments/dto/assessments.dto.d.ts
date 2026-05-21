import { AssessmentScoreStatus, AssessmentStatus } from '@prisma/client';
export declare class CreateAssessmentSubjectDto {
    subjectId: string;
    classId: string;
    sectionId?: string;
    gradeLevelId?: string;
    teacherId?: string;
    maxScore: number;
    passMark?: number;
}
export declare class CreateAssessmentDto {
    title: string;
    type: string;
    academicYearId: string;
    termId?: string;
    startDate: string;
    endDate: string;
    addToCalendar?: boolean;
    subjects?: CreateAssessmentSubjectDto[];
}
export declare class AddAssessmentSubjectsDto {
    subjects: CreateAssessmentSubjectDto[];
}
export declare class UpsertStudentAssessmentScoreDto {
    studentId: string;
    score?: number;
    isAbsent?: boolean;
    remarks?: string;
}
export declare class SaveAssessmentScoresDto {
    scores: UpsertStudentAssessmentScoreDto[];
    status?: AssessmentScoreStatus;
    registrarOverride?: boolean;
}
export declare class AssessmentWeightDto {
    type: string;
    percentage: number;
}
export declare class UpdateAssessmentWeightsDto {
    weights: AssessmentWeightDto[];
}
export declare class ListAssessmentsFilterDto {
    academicYearId?: string;
    termId?: string;
    type?: string;
    status?: AssessmentStatus;
    page?: number;
    limit?: number;
}
