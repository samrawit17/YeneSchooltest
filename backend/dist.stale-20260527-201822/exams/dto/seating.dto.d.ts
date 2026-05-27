import { SeatingMode as PrismaSeatingMode } from '@prisma/client';
export { PrismaSeatingMode as SeatingMode };
export declare class CreateSeatingPlanDto {
    mode: PrismaSeatingMode;
    fromGrade: number;
    toGrade: number;
    examCapacity?: number;
    shuffle: boolean;
    useScoreThresholdFilter?: boolean;
    scoreThreshold?: number;
}
export declare class SeatingPlanResponseDto {
    id: string;
    examId: string | null;
    examType: string;
    schoolId: string;
    mode: PrismaSeatingMode;
    fromGrade: number;
    toGrade: number;
    examCapacity: number;
    shuffle: boolean;
    useScoreThresholdFilter: boolean;
    scoreThreshold: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    exam?: {
        id: string;
        title: string;
        date: Date;
        subject: {
            name: string;
        };
    };
    assignments?: SectionAssignmentResponseDto[];
}
export declare class GenerateSeatingDto {
    planId: string;
}
export declare class SectionAssignmentResponseDto {
    id: string;
    seatingPlanId: string;
    sectionId: string;
    section?: {
        id: string;
        name: string;
        capacity: number;
        class?: {
            id: string;
            name: string;
            grade: number | null;
        };
    };
    students?: StudentAssignmentResponseDto[];
}
export declare class StudentAssignmentResponseDto {
    id: string;
    assignmentId: string;
    studentId: string;
    orderIndex: number;
    student?: {
        id: string;
        name: string;
        email: string | null;
        studentProfile?: {
            studentCode: string;
            gender: string | null;
        };
    };
}
export declare class SeatingOverviewResponseDto {
    plan: SeatingPlanResponseDto;
    totalStudents: number;
    totalSections: number;
    totalCapacity: number;
    sections: SectionWithStudentsDto[];
}
export declare class SectionWithStudentsDto {
    sectionId: string;
    sectionName: string;
    className: string;
    grade: number | null;
    capacity: number;
    examCapacity: number;
    assignedStudents: number;
    students: StudentInSectionDto[];
}
export declare class StudentInSectionDto {
    orderIndex: number;
    studentId: string;
    studentName: string;
    studentEmail: string | null;
    originalSection: string | null;
    originalGrade: number | null;
}
