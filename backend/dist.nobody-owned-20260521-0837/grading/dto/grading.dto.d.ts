export declare enum GradeStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED"
}
export declare class CreateGradeDto {
    studentId: string;
    subjectId: string;
    classId: string;
    sectionId: string;
    academicYear: string;
    termId: string;
    caScore?: number;
    midScore?: number;
    finalScore?: number;
    remark?: string;
    componentScores?: GradeComponentScoreDto[];
}
export declare class UpdateGradeDto {
    caScore?: number;
    midScore?: number;
    finalScore?: number;
    remark?: string;
}
export declare class BulkGradeEntryDto {
    grades: CreateGradeDto[];
}
export declare class GradeComponentScoreDto {
    code: string;
    assessmentSubjectId?: string;
    score?: number | null;
}
export declare class GradeFilterDto {
    academicYear?: string;
    termId?: string;
    classId?: string;
    sectionId?: string;
    subjectId?: string;
    teacherId?: string;
    status?: string;
    studentId?: string;
}
export declare class ApproveGradeDto {
    status: GradeStatus;
    registrarComment?: string;
}
export declare class GradingComponentDto {
    name: string;
    code: string;
    percentage: number;
}
export declare class GradeScaleDto {
    gradeLetter: string;
    minScore: number;
    maxScore: number;
    gradePoint: number;
    description?: string;
}
export declare class TeacherAssignmentDto {
    teacherId: string;
    subjectId: string;
    classId: string;
    sectionId: string;
    academicYear: string;
}
