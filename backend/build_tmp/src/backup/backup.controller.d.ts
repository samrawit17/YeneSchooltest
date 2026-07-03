import type { Response } from 'express';
import { BackupService } from './backup.service';
import { AuditService } from '../audit/audit.service';
import { SchoolBackupQueryDto } from './dto/school-backup-query.dto';
export declare class BackupController {
    private readonly backupService;
    private readonly auditService;
    constructor(backupService: BackupService, auditService: AuditService);
    download(req: any, res: Response): Promise<void>;
    getSchoolBackupTypes(): {
        value: string;
        label: string;
        description: string;
    }[];
    downloadSchoolBackup(req: any, schoolId: string, query: SchoolBackupQueryDto, res: Response): Promise<void>;
    private sendBackupFile;
}
