export declare class GenerateStudentFeesDto {
    schoolId: string;
    academicYearId: string;
    termId?: string;
    grade?: number;
}
export declare class StudentFeesQueryDto {
    schoolId: string;
    academicYearId?: string;
    termId?: string;
    studentId?: string;
    search?: string;
    grade?: number;
    sectionId?: string;
    status?: 'PAID' | 'PARTIAL' | 'PENDING';
    page?: number;
    limit?: number;
}
