import { Controller, Get, Param, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { BackupService } from './backup.service';
import { AuditService } from '../audit/audit.service';

@Controller('backups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BackupController {
  constructor(
    private readonly backupService: BackupService,
    private readonly auditService: AuditService,
  ) {}

  @Get('download')
  @Roles(Role.SUPER_ADMIN)
  async download(@Request() req: any, @Res() res: Response) {
    const backup = await this.backupService.createPlatformBackup();
    await this.auditService.log({
      actor: req.user,
      action: 'BACKUP_DOWNLOAD',
      entityType: 'PLATFORM_BACKUP',
      metadata: {
        fileName: backup.fileName,
        backupScope: 'PLATFORM',
      },
      request: this.auditService.fromRequest(req),
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);

    res.on('finish', () => {
      void this.backupService.cleanupBackup(backup.tempDir);
    });
    res.on('close', () => {
      void this.backupService.cleanupBackup(backup.tempDir);
    });

    res.sendFile(backup.zipPath);
  }

  @Get('school-types')
  @Roles(Role.SUPER_ADMIN)
  getSchoolBackupTypes() {
    return this.backupService.getSchoolBackupTypes();
  }

  @Get('schools/:schoolId/download')
  @Roles(Role.SUPER_ADMIN)
  async downloadSchoolBackup(
    @Request() req: any,
    @Param('schoolId') schoolId: string,
    @Query('type') type: any = 'FULL_SCHOOL',
    @Res() res: Response,
  ) {
    const backup = await this.backupService.createSchoolBackup(schoolId, type);
    await this.auditService.log({
      actor: req.user,
      schoolId,
      action: 'BACKUP_DOWNLOAD',
      entityType: 'SCHOOL_BACKUP',
      entityId: schoolId,
      metadata: {
        fileName: backup.fileName,
        backupScope: 'SCHOOL',
        backupType: type,
      },
      request: this.auditService.fromRequest(req),
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);

    res.on('finish', () => {
      void this.backupService.cleanupBackup(backup.tempDir);
    });
    res.on('close', () => {
      void this.backupService.cleanupBackup(backup.tempDir);
    });

    res.sendFile(backup.zipPath);
  }
}
