import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class CreateAttendanceSessionDto {
  @IsOptional()
  @IsDateString()
  date?: string; // ISO date string - optional, defaults to today
}

export class MarkAttendanceDto {
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @IsNotEmpty()
  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

  @IsOptional()
  @IsString()
  remark?: string;
}

export class BulkMarkAttendanceDto {
  @IsNotEmpty()
  records: MarkAttendanceDto[];
}

export class SubmitSessionDto {
  @IsNotEmpty()
  @IsString()
  sessionId: string;
}

export class OverrideAttendanceDto {
  @IsNotEmpty()
  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'])
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

  @IsNotEmpty()
  @IsString()
  overrideReason: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class AttendanceQueryDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  status?: 'NOT_SUBMITTED' | 'SUBMITTED';
}
