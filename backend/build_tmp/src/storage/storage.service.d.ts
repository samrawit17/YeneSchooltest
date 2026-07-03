import { ConfigService } from '@nestjs/config';
import { StoredFile, UploadOptions } from './storage.interface';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
export type StorageType = 'local' | 's3' | 'minio';
export declare class StorageService {
    private configService;
    private platformSettingsService?;
    private readonly logger;
    private provider;
    private initPromise;
    constructor(configService: ConfigService, platformSettingsService?: PlatformSettingsService | undefined);
    private getProvider;
    private initializeProvider;
    private createProvider;
    private createLocalProvider;
    refreshConfig(): Promise<void>;
    upload(file: Buffer, filename: string, mimeType: string, options?: UploadOptions): Promise<StoredFile>;
    delete(key: string): Promise<void>;
    getUrl(key: string): Promise<string>;
}
