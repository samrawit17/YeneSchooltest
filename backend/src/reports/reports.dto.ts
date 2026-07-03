import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class ReportQueryDto {
  @IsString()
  schoolId!: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsNumber()
  month?: number;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsEnum(['ETHIOPIAN', 'GREGORIAN'])
  calendarType?: 'ETHIOPIAN' | 'GREGORIAN';

  @IsOptional()
  @IsString()
  includeOutstanding?: string;
}
