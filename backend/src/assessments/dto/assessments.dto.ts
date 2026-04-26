import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentScoreStatus, AssessmentType, AssessmentStatus } from '@prisma/client';

export class CreateAssessmentSubjectDto {
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  gradeLevelId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  maxScore: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  passMark?: number;
}

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(AssessmentType)
  type: AssessmentType;

  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAssessmentSubjectDto)
  @IsOptional()
  subjects?: CreateAssessmentSubjectDto[];
}

export class AddAssessmentSubjectsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAssessmentSubjectDto)
  subjects: CreateAssessmentSubjectDto[];
}

export class UpsertStudentAssessmentScoreDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SaveAssessmentScoresDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertStudentAssessmentScoreDto)
  scores: UpsertStudentAssessmentScoreDto[];

  @IsOptional()
  @IsEnum(AssessmentScoreStatus)
  status?: AssessmentScoreStatus;

  @IsOptional()
  @IsBoolean()
  registrarOverride?: boolean;
}

export class AssessmentWeightDto {
  @IsEnum(AssessmentType)
  type: AssessmentType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

export class UpdateAssessmentWeightsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssessmentWeightDto)
  weights: AssessmentWeightDto[];
}

export class ListAssessmentsFilterDto {
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsEnum(AssessmentType)
  type?: AssessmentType;

  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
