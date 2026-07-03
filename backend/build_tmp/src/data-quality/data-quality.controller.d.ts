import { DataQualityService } from './data-quality.service';
export declare class DataQualityController {
    private readonly dataQualityService;
    constructor(dataQualityService: DataQualityService);
    getStudentConsistencyReport(req: any): Promise<{
        academicYear: {
            id: string;
            name: string;
        } | null;
        academicYearKeysChecked: string[];
        checkedStudents: number;
        warnings: string[];
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
            severity: "medium" | "high" | "low";
            studentProfileId?: string | null;
            studentUserId?: string | null;
            studentCode?: string | null;
            studentName?: string | null;
            className?: string | null;
            section?: string | null;
            placementClassName?: string | null;
            placementSection?: string | null;
            placementAcademicYear?: string | null;
            recommendation?: string;
            detail: string;
        }[];
    }>;
}
