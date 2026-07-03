export type SchoolBackupType = 'FULL_SCHOOL' | 'STAFF' | 'STUDENTS' | 'ACADEMICS' | 'EXAMS_MARKS' | 'CERTIFICATES' | 'DOCUMENTS' | 'FINANCE' | 'ATTENDANCE' | 'COMMUNICATIONS' | 'OPERATIONS';
export declare const SCHOOL_BACKUP_TYPES: SchoolBackupType[];
export interface BackupContext {
    downloadedBy?: string;
}
export interface BackupArtifact {
    tempDir: string;
    zipPath: string;
    fileName: string;
}
