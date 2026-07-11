import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  schoolId?: string;
}

export class ReportGenerateDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  tone?: string;
}

export class AlertsQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;
}

export class RecommendDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;
}
