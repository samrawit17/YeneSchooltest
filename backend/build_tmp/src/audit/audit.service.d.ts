import { PrismaService } from '../prisma/prisma.service';
export interface AuditActor {
    id?: string | null;
    role?: string | null;
    schoolId?: string | null;
}
export interface AuditRequestContext {
    ip?: string | null;
    userAgent?: string | null;
}
export interface AuditLogInput {
    actor?: AuditActor | null;
    schoolId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
    request?: AuditRequestContext | null;
}
export interface AuditLogQuery {
    schoolId?: string | null;
    action?: string | null;
    entityType?: string | null;
    limit?: number;
}
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log(input: AuditLogInput): Promise<void>;
    findLogs(query: AuditLogQuery): Promise<{
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
    }[]>;
    fromRequest(req: any): AuditRequestContext;
    private redactSensitiveMetadata;
}
