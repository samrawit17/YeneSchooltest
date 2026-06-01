import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../auth/types/role.enum';
import { CredentialService } from '../credential/credential.service';
export interface BulkUserRecord {
    full_name?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    mother_name?: string;
    mother_phone?: string;
    role: string;
    current_class?: string;
    next_class?: string;
    gender?: string;
    section?: string;
    roll_number?: string;
    student_code?: string;
    parent_name?: string;
    parent_phone?: string;
    student_email?: string;
    student_id?: string;
    relation?: string;
}
export interface GeneratedCredential {
    name: string;
    email?: string;
    phone?: string;
    username: string;
    temporaryPassword: string;
    role: Role;
}
export interface BulkUploadResult {
    status: 'success' | 'partial' | 'failed';
    message: string;
    totalRecords: number;
    successfulCount: number;
    failedCount: number;
    failedRecords: Array<{
        record: BulkUserRecord;
        error: string;
    }>;
    skippedCount?: number;
    skippedRecords?: Array<{
        record: BulkUserRecord;
        reason: string;
    }>;
    credentials: GeneratedCredential[];
}
export declare class BulkUploadService {
    private prismaService;
    private credentialService;
    constructor(prismaService: PrismaService, credentialService: CredentialService);
    private getSectionNameByIndex;
    private getNormalizedStudentName;
    private sortRecordsAlphabetically;
    private normalizeLookupValue;
    private normalizePhone;
    private normalizeStudentAndParentNames;
    private buildGradeLevelLookups;
    private extractSectionFromClassLabel;
    private resolveGradeInfo;
    parseCSV(content: string): BulkUserRecord[];
    private normalizeRelation;
    private parseCSVLine;
    validateRecord(record: BulkUserRecord, index: number): string | null;
    mapRoleToEnum(roleStr: string): Role;
    processBulkStaff(schoolId: string, uploadedById: string, records: BulkUserRecord[], academicYear?: string): Promise<BulkUploadResult>;
    processBulkStudentsWithAssignment(schoolId: string, uploadedById: string, records: BulkUserRecord[], academicYear?: string): Promise<BulkUploadResult>;
    generateCredentialReport(credentials: any[]): string;
    getPendingCredentials(schoolId: string, options: any): Promise<{
        credentials: {
            id: string;
            schoolId: string;
            createdAt: Date;
            name: string;
            username: string;
            temporaryPassword: string;
            email: string | null;
            role: string;
            userId: string | null;
            expiresAt: Date;
            isSent: boolean;
            sentAt: Date | null;
            sentVia: string | null;
            batchId: string | null;
        }[];
        total: number;
    }>;
    markCredentialSent(schoolId: string, id: string, sentVia: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        name: string;
        username: string;
        temporaryPassword: string;
        email: string | null;
        role: string;
        userId: string | null;
        expiresAt: Date;
        isSent: boolean;
        sentAt: Date | null;
        sentVia: string | null;
        batchId: string | null;
    }>;
    markCredentialsSent(ids: string[], sentVia: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    deletePendingCredential(id: string, schoolId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        name: string;
        username: string;
        temporaryPassword: string;
        email: string | null;
        role: string;
        userId: string | null;
        expiresAt: Date;
        isSent: boolean;
        sentAt: Date | null;
        sentVia: string | null;
        batchId: string | null;
    }>;
    exportPendingCredentials(schoolId: string, options: any): Promise<string>;
    rebalanceGradeSections(schoolId: string, gradeName: string, academicYearId?: string): Promise<{
        status: string;
        message: string;
    }>;
}
