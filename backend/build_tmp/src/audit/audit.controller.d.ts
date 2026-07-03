import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    list(req: any, schoolId?: string, action?: string, entityType?: string, limit?: string): Promise<{
        success: boolean;
        data: {
            metadata: any;
            id: string;
            schoolId: string | null;
            userId: string | null;
            actorRole: string | null;
            action: string;
            entityType: string;
            entityId: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            createdAt: Date;
        }[];
    }>;
}
