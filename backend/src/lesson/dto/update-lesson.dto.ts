import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { LessonStatus, ContentType } from '@prisma/client';

export class UpdateLessonDto {
  @IsEnum(ContentType)
  @IsOptional()
  type?: ContentType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsString()
  @IsOptional()
  lessonContent?: string;

  @IsNumber()
  @IsOptional()
  grade?: number;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  stream?: string;

  @IsString()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsOptional()
  semesterId?: string;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsDateString()
  @IsOptional()
  lessonDate?: string;

  @IsNumber()
  @IsOptional()
  periodNumber?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  totalPoints?: number;

  @IsNumber()
  @IsOptional()
  maxMarks?: number;

  @IsString()
  @IsOptional()
  attachments?: string;

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

  @IsString()
  @IsOptional()
  syllabusMappingId?: string;

  @IsEnum(LessonStatus)
  @IsOptional()
  status?: LessonStatus;

  @IsOptional()
  isExamPrep?: boolean;

  @IsOptional()
  isLocked?: boolean;
}
