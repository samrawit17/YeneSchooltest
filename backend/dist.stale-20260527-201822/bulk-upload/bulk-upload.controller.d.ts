import type { Response } from 'express';
import { BulkUploadService } from './bulk-upload.service';
export interface BulkUploadDto {
    academicYear?: string;
}
export declare class BulkUploadController {
    private readonly bulkUploadService;
    constructor(bulkUploadService: BulkUploadService);
    uploadBulkStaff(file: Express.Multer.File, dto: BulkUploadDto, req: any): Promise<import("./bulk-upload.service").BulkUploadResult>;
    uploadBulkStudentsAuto(file: Express.Multer.File, dto: BulkUploadDto, req: any): Promise<import("./bulk-upload.service").BulkUploadResult>;
    generateReport(body: {
        credentials: Array<any>;
    }, res: Response): Promise<void>;
    getTemplate(type: string | undefined, res: Response): void;
    getPendingCredentials(req: any, includeSent?: string, role?: string, limit?: string, offset?: string): Promise<{
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
    markCredentialSent(req: any, id: string, body: {
        sentVia?: string;
    }): Promise<{
        status: string;
        message: string;
        credential: {
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
        };
    }>;
    deleteCredential(req: any, id: string): Promise<{
        status: string;
        message: string;
    }>;
    exportCredentials(req: any, res: Response, includeSent?: string, role?: string): Promise<void>;
    rebalanceSections(dto: {
        gradeName: string;
        academicYear?: string;
    }, req: any): Promise<{
        status: string;
        message: string;
    }>;
}
