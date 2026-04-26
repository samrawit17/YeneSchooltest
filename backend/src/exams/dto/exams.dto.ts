import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ExamType } from '@prisma/client';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsOptional()
  sectionId?: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsEnum(ExamType)
  @IsNotEmpty()
  type: ExamType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  maxMarks: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  weightage?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateExamDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  maxMarks?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  weightage?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ExamResultEntryDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  marks: number;

  @IsString()
  @IsOptional()
  grade?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BulkExamResultDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamResultEntryDto)
  results: ExamResultEntryDto[];
}

export class GetExamsFilterDto {
  @IsString()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsOptional()
  sectionId?: string;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsEnum(ExamType)
  @IsOptional()
  type?: ExamType;

  @IsString()
  @IsOptional()
  academicYearId?: string;
}
