import { ReportCardService } from './report-card.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class PromotionController {
    private readonly reportCardService;
    private readonly prisma;
    constructor(reportCardService: ReportCardService, prisma: PrismaService);
    getPromotionCandidates(req: any, classId: string, query: {
        academicYear?: string;
    }): Promise<{
        className: string;
        academicYear: string;
        totalStudents: number;
        candidates: {
            student: any;
            status: string;
            reason?: string;
            reasons?: string[];
            averageGrade: number;
            attendance: number;
            overallGrade?: string | null;
            reportCardId?: string;
        }[];
    }>;
    getNextClassOptions(classId: string, query: {
        toAcademicYear?: string;
    }): Promise<{
        currentClass: {
            id: string;
            name: string;
            grade: number | null;
        };
        nextClasses: {
            id: string;
            name: string;
            grade: number | null;
        }[];
        isLastGrade: boolean;
        graduationEnabled: boolean;
    }>;
    promoteStudent(req: any, body: {
        studentId: string;
        fromClassId: string;
        toClassId?: string | null;
        fromAcademicYear: string;
        toAcademicYear: string;
    }): Promise<{
        studentId: string;
        fromClassId: string;
        toClassId: null;
        status: string;
        promotedAt: Date;
    } | {
        studentId: string;
        fromClassId: string;
        toClassId: string;
        status: "PROMOTED" | "RETAINED";
        promotedAt: Date;
    }>;
    bulkPromote(req: any, body: {
        fromClassId: string;
        toClassId?: string | null;
        fromAcademicYear: string;
        toAcademicYear: string;
        studentIds: string[];
        promoteAll: boolean;
        minAverageGrade?: number;
        minAttendance?: number;
    }): Promise<{
        promoted: number;
        retained: number;
        failed: number;
        errors: string[];
    }>;
    getPromotionHistory(req: any, query: {
        academicYear?: string;
        classId?: string;
        status?: string;
    }): Promise<unknown>;
    private getActiveAcademicYear;
}
