import { AutoAssignmentService, AutoAssignmentResult } from './auto-assignment.service';
export declare class AutoAssignmentController {
    private readonly autoAssignmentService;
    constructor(autoAssignmentService: AutoAssignmentService);
    autoAssignEnrollment(enrollmentId: string, req: any): Promise<AutoAssignmentResult>;
    bulkAutoAssign(body: {
        enrollmentIds: string[];
    }, req: any): Promise<AutoAssignmentResult[]>;
    reassignEnrollment(enrollmentId: string, req: any): Promise<AutoAssignmentResult>;
    getStudentAssignment(studentId: string, req: any): Promise<{
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
    getClassCapacity(academicYear: string, grade: string, req: any): Promise<{
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
    }[] | {
        error: string;
    }>;
    approveAndAssign(body: {
        enrollmentId: string;
    }, req: any): Promise<AutoAssignmentResult>;
}
