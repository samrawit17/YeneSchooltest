import { Injectable, Optional } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageProvider, StoredFile, UploadOptions } from '../storage.interface';
import { SchoolInfoService } from '../../school-info.service';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly rootPath: string;

  constructor(
    rootPath: string = 'public/uploads',
    @Optional() private schoolInfoService?: SchoolInfoService,
  ) {
    this.rootPath = path.isAbsolute(rootPath) ? rootPath : path.join(process.cwd(), rootPath);
  }

  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
    options: UploadOptions,
  ): Promise<StoredFile> {
    const folder = options.folder || 'files';
    const schoolPath = await this.getSchoolPath(options.schoolId, folder);
    const publicDir = schoolPath.publicDir;
    const schoolIdForKey = schoolPath.schoolIdForKey;
    
    const extension = this.getExtension(mimeType, filename);
    const key = options.generateName 
      ? `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${extension}`
      : filename;
    
    const filePath = path.join(publicDir, key);
    
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(filePath, file);

    const url = `/${path.join(schoolIdForKey, key).split(path.sep).join('/')}`;
    
    return {
      key,
      url,
      size: file.length,
      mimeType,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.rootPath, key);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist, ignore
    }
  }

  async getSchoolPath(schoolId?: string, folder?: string) {
    const school = schoolId && this.schoolInfoService
      ? await this.schoolInfoService.getSchoolById(schoolId)
      : null;
    const basePath = schoolId ? `${schoolId}-${(school?.publicUrlSlug || schoolId)}` : 'platform';
    const relativeDir = path.join('uploads', basePath, folder || 'files');
    const publicDir = path.join(this.rootPath, relativeDir);
    return { publicDir, schoolIdForKey: basePath };
  }

  getUrl(key: string): string {
    return `/${key.split(path.sep).join('/')}`;
  }

  private getExtension(mimeType: string, filename: string): string {
    if (mimeType === 'image/jpeg') return '.jpg';
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    if (mimeType === 'application/pdf') return '.pdf';
    
    const ext = path.extname(filename);
    return ext || '';
  }
}