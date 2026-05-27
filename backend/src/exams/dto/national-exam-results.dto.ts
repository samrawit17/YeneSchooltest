import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NationalExamSource, NationalExamType } from '@prisma/client';

export class NationalExamSubjectResultDto {
  @IsString()
  @IsNotEmpty()
  subjectName: string;

  @IsNumber()
  @Min(0)
  score: number;

  @IsString()
  @IsOptional()
  gradeLetter?: string;
}

export class NationalExamResultImportRowDto {
  @IsString()
  @IsNotEmpty()
  candidateNumber: string;

  @IsString()
  @IsNotEmpty()
  studentName: string;

  @IsNumber()
  @Min(1)
  grade: number;

  @IsString()
  @IsOptional()
  stream?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalScore?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NationalExamSubjectResultDto)
  subjects: NationalExamSubjectResultDto[];
}

export class ImportNationalExamResultsDto {
  @IsEnum(NationalExamType)
  examType: NationalExamType;

  @IsString()
  @IsNotEmpty()
  examYear: string;

  @IsString()
  @IsOptional()
  academicYearId?: string;

  @IsEnum(NationalExamSource)
  @IsOptional()
  source?: NationalExamSource;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  cutoffScore?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NationalExamResultImportRowDto)
  rows: NationalExamResultImportRowDto[];
}
