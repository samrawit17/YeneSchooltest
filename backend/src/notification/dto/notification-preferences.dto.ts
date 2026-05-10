import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  commBookEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  timetableEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  attendanceEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  announcementsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  assignmentsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  examsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  feesEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  eventsEnabled?: boolean;
}
