import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider, StoredFile, UploadOptions } from './storage.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';

export type StorageType = 'local' | 's3' | 'minio';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private provider: StorageProvider | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    private configService: ConfigService,
    @Optional() private platformSettingsService?: PlatformSettingsService,
  ) {}

  private async getProvider(): Promise<StorageProvider> {
    if (this.provider) return this.provider;
    if (this.initPromise) await this.initPromise;
    else this.initPromise = this.initializeProvider();
    await this.initPromise;
    return this.provider!;
  }

  private async initializeProvider(): Promise<void> {
    let storageType: StorageType = this.configService.get<StorageType>('STORAGE_TYPE', 'local');
    let config: Record<string, any> = {};

    if (this.platformSettingsService) {
      try {
        const dbType = await this.platformSettingsService.getSetting('STORAGE_TYPE');
        if (dbType && typeof dbType === 'string') {
          storageType = dbType as StorageType;
        }
        const dbConfig = await this.platformSettingsService.getSetting('STORAGE_CONFIG');
        if (dbConfig && typeof dbConfig === 'object' && !Array.isArray(dbConfig)) {
          config = dbConfig as Record<string, any>;
        }
      } catch (err) {
        this.logger.warn('Could not read storage config from platform settings, falling back to env');
      }
    }

    this.provider = this.createProvider(storageType, config);
  }

  private createProvider(storageType: StorageType, config: Record<string, any>): StorageProvider {
    switch (storageType) {
      case 's3':
      case 'minio':
        this.logger.warn(`Storage type "${storageType}" not yet implemented, falling back to local`);
        return this.createLocalProvider(config);
      case 'local':
      default:
        return this.createLocalProvider(config);
    }
  }

  private createLocalProvider(config: Record<string, any>): LocalStorageProvider {
    const rootPath = config.rootPath
      || this.configService.get<string>('STORAGE_LOCAL_ROOT_PATH', 'public/uploads');
    return new LocalStorageProvider(rootPath);
  }

  async refreshConfig(): Promise<void> {
    this.provider = null;
    this.initPromise = null;
    await this.getProvider();
    this.logger.log('Storage provider re-initialized from platform settings');
  }

  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions = {},
  ): Promise<StoredFile> {
    const provider = await this.getProvider();
    return provider.upload(file, filename, mimeType, options);
  }

  async delete(key: string): Promise<void> {
    const provider = await this.getProvider();
    await provider.delete(key);
  }

  async getUrl(key: string): Promise<string> {
    const provider = await this.getProvider();
    return provider.getUrl(key);
  }
}
