import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
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
  @IsNotEmpty()
  results: ExamResultEntryDto[];
}
