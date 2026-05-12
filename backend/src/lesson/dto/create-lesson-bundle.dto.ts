import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonStatus } from '@prisma/client';

// Define enums locally until Prisma client is regenerated
export enum ResourceType {
  WORKSHEET = 'WORKSHEET',
  READING_MATERIAL = 'READING_MATERIAL',
  HANDOUT = 'HANDOUT',
  EXAM_PREP = 'EXAM_PREP',
  OTHER = 'OTHER',
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
  LATE = 'LATE',
  MISSING = 'MISSING',
}

// Embedded DTOs for nested objects
export class CreateHomeworkDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  totalPoints?: number;

  @IsBoolean()
  @IsOptional()
  isExamPrep?: boolean;

  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;
}

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ResourceType)
  @IsNotEmpty()
  resourceType: ResourceType;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;
}

// Main Lesson Bundle DTO
export class CreateLessonBundleDto {
  // Core Lesson Info
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsString()
  @IsOptional()
  lessonContent?: string;

  @IsNumber()
  @IsNotEmpty()
  grade: number;

  @IsString()
  @IsNotEmpty()
  section: string;

  @IsString()
  @IsOptional()
  stream?: string;

  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsOptional()
  semesterId?: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsDateString()
  @IsNotEmpty()
  lessonDate: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  @Max(8) // Ethiopian period schedule (1-8 periods)
  periodNumber: number;

  // Embedded Homework (optional)
  @ValidateNested()
  @Type(() => CreateHomeworkDto)
  @IsOptional()
  homework?: CreateHomeworkDto;

  // Ethiopian Curriculum tag
  @IsNumber()
  @IsOptional()
  @Min(1)
  unitNumber?: number; // e.g., Unit 4

  @IsString()
  @IsOptional()
  topicName?: string;

  @IsString()
  @IsOptional()
  competency?: string; // Learning competency

  // Status (for HoD workflow)
  @IsEnum(LessonStatus)
  @IsOptional()
  status?: LessonStatus;

  // National Exam Prep Mode
  @IsBoolean()
  @IsOptional()
  isExamPrep?: boolean;

  // Syllabus Mapping ID
  @IsString()
  @IsOptional()
  syllabusMappingId?: string;

  // Worksheets/Resources (Array of resources)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateResourceDto)
  @IsOptional()
  resources?: CreateResourceDto[];
}

// Update Lesson Bundle DTO
export class UpdateLessonBundleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  titleAmharic?: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsString()
  @IsOptional()
  objectiveAmharic?: string;

  @IsString()
  @IsOptional()
  lessonContent?: string;

  @IsString()
  @IsOptional()
  lessonContentAmharic?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(8)
  periodNumber?: number;

  @IsNumber()
  @IsOptional()
  unitNumber?: number;

  @IsString()
  @IsOptional()
  topicName?: string;

  @IsString()
  @IsOptional()
  topicId?: string;

  @IsString()
  @IsOptional()
  competency?: string;

  @ValidateNested()
  @Type(() => CreateHomeworkDto)
  @IsOptional()
  homework?: CreateHomeworkDto;

  @IsEnum(LessonStatus)
  @IsOptional()
  status?: LessonStatus;

  @IsBoolean()
  @IsOptional()
  isExamPrep?: boolean;

  @IsString()
  @IsOptional()
  syllabusMappingId?: string;
}

// Homework Submission DTO
export class SubmitHomeworkDto {
  @IsString()
  @IsOptional()
  submissionUrl?: string;

  @IsString()
  @IsOptional()
  submissionText?: string;
}

export class GradeHomeworkDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  grade: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

// Query DTO for lesson coverage report
export class LessonCoverageQueryDto {
  @IsNumber()
  @IsNotEmpty()
  grade: number;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsOptional()
  academicYearId?: string;

  @IsNumber()
  @IsOptional()
  unitNumber?: number;
}
