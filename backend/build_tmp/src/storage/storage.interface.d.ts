export interface StorageConfig {
    provider: 'local' | 's3' | 'minio';
    local?: {
        rootPath: string;
    };
    s3?: {
        bucket: string;
        region?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        endpoint?: string;
    };
}
export interface StoredFile {
    key: string;
    url: string;
    size: number;
    mimeType: string;
}
export interface UploadOptions {
    schoolId?: string;
    folder?: string;
    generateName?: boolean;
}
export interface StorageProvider {
    upload(file: Buffer, filename: string, mimeType: string, options: UploadOptions): Promise<StoredFile>;
    delete(key: string): Promise<void>;
    getUrl(key: string): string;
}
