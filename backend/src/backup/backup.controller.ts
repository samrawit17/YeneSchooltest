import { Controller, Get, Param, Query, Request, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { BackupService } from './backup.service';
import { AuditService } from '../audit/audit.service';
import { SchoolBackupQueryDto } from './dto/school-backup-query.dto';

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
    const backup = await this.backupService.createPlatformBackup({
      downloadedBy: req.user?.id,
    });
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

    this.sendBackupFile(res, backup);
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
    @Query() query: SchoolBackupQueryDto,
    @Res() res: Response,
  ) {
    const backup = await this.backupService.createSchoolBackup(schoolId, query.type, {
      downloadedBy: req.user?.id,
    });
    await this.auditService.log({
      actor: req.user,
      schoolId,
      action: 'BACKUP_DOWNLOAD',
      entityType: 'SCHOOL_BACKUP',
      entityId: schoolId,
      metadata: {
        fileName: backup.fileName,
        backupScope: 'SCHOOL',
        backupType: query.type,
      },
      request: this.auditService.fromRequest(req),
    });

    this.sendBackupFile(res, backup);
  }

  private sendBackupFile(
    res: Response,
    backup: { tempDir: string; zipPath: string; fileName: string },
  ) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) {
        return;
      }
      cleanedUp = true;
      void this.backupService.cleanupBackup(backup.tempDir);
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    res.sendFile(backup.zipPath);
  }
}
