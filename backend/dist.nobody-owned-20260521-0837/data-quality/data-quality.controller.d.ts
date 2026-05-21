import { DataQualityService } from './data-quality.service';
export declare class DataQualityController {
    private readonly dataQualityService;
    constructor(dataQualityService: DataQualityService);
    getStudentConsistencyReport(req: any): Promise<{
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
        issues: {
            type: string;
            severity: "high" | "medium" | "low";
            studentProfileId?: string | null;
            studentUserId?: string | null;
            studentCode?: string | null;
            studentName?: string | null;
            className?: string | null;
            section?: string | null;
            detail: string;
        }[];
    }>;
}
