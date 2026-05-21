import { PrismaService } from '../prisma/prisma.service';
type IssueSeverity = 'high' | 'medium' | 'low';
type DataQualityIssue = {
    type: string;
    severity: IssueSeverity;
    studentProfileId?: string | null;
    studentUserId?: string | null;
    studentCode?: string | null;
    studentName?: string | null;
    className?: string | null;
    section?: string | null;
    detail: string;
};
export declare class DataQualityService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getStudentConsistencyReport(schoolId: string): Promise<{
        academicYear: {
            id: string;
            name: string;
        } | null;
        checkedStudents: number;
        summary: {
            total: number;
            bySeverity: {
                high: number;
                medium: number;
                low: number;
            };
            byType: Record<string, number>;
        };
        issues: DataQualityIssue[];
    }>;
}
export {};
