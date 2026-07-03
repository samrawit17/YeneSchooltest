export declare const UPLOAD_ROOT_PATH = "UPLOAD_ROOT_PATH";
import { StorageProvider, StoredFile, UploadOptions } from '../storage.interface';
import { SchoolInfoService } from '../../school-info.service';
export declare class LocalStorageProvider implements StorageProvider {
    private schoolInfoService?;
    private readonly rootPath;
    constructor(rootPath?: string, schoolInfoService?: SchoolInfoService | undefined);
    upload(file: Buffer, filename: string, mimeType: string, options: UploadOptions): Promise<StoredFile>;
    delete(key: string): Promise<void>;
    getSchoolPath(schoolId?: string, folder?: string): Promise<{
        publicDir: string;
        schoolIdForKey: string;
    }>;
    getUrl(key: string): string;
    private getExtension;
}
