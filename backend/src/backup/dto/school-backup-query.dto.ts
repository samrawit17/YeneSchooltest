import { IsIn } from 'class-validator';
import { SCHOOL_BACKUP_TYPES, type SchoolBackupType } from '../backup.types';

export class SchoolBackupQueryDto {
  @IsIn(SCHOOL_BACKUP_TYPES, {
    message: `type must be one of: ${SCHOOL_BACKUP_TYPES.join(', ')}`,
  })
  type: SchoolBackupType = 'FULL_SCHOOL';
}
