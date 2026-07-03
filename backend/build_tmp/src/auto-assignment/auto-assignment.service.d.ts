import { PrismaService } from '../prisma/prisma.service';
export interface AutoAssignmentResult {
    success: boolean;
    message: string;
    studentName?: string;
    classId?: string;
    sectionId?: string;
    rollNumber?: string;
}
export declare class AutoAssignmentService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private normalizeStudentStream;
    private getDefaultSectionCapacity;
    autoAssignStudent(enrollmentId: string, schoolId: string): Promise<AutoAssignmentResult>;
    bulkAutoAssign(enrollmentIds: string[], schoolId: string): Promise<AutoAssignmentResult[]>;
    reAssignStudent(enrollmentId: string, schoolId: string): Promise<AutoAssignmentResult>;
    getStudentAssignment(studentId: string, schoolId: string): Promise<{
        hasAssignment: boolean;
        message: string;
        assignment?: undefined;
    } | {
        hasAssignment: boolean;
        assignment: {
            classId: string;
            className: string;
            sectionId: string;
            sectionName: string;
            academicYear: string;
        };
        message?: undefined;
    }>;
    findAcademicYearByName(schoolId: string, academicYearName: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        calendarType: import("@prisma/client").$Enums.CalendarType;
        startDate: Date;
        endDate: Date;
        ethiopianYear: number | null;
        curriculumType: import("@prisma/client").$Enums.CurriculumType;
    } | null>;
    getClassCapacityInfo(schoolId: string, academicYearId: string, grade: number): Promise<{
        classId: string;
        className: string;
        totalSections: number;
        sections: {
            sectionId: string;
            sectionName: string;
            capacity: number;
            currentCount: number;
            available: number;
        }[];
    }[]>;
    completeAutoAssignment(studentId: string | null, schoolId: string, enrollmentId: string): Promise<AutoAssignmentResult>;
    private findOrCreateClassSection;
    private generateRollNumber;
    private getNextSectionLetter;
}
