import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateStudentFeesDto {
  @IsString()
  schoolId!: string;

  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  grade?: number;
}

export class StudentFeesQueryDto {
  @IsString()
  schoolId!: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsEnum(['PAID', 'PARTIAL', 'PENDING'])
  status?: 'PAID' | 'PARTIAL' | 'PENDING';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
