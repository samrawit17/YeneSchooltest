import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { LessonStatus } from '@prisma/client';
import { ContentType } from '@prisma/client';

export class CreateLessonDto {
  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  @IsString()
  @IsNotEmpty()
  title: string;

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

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsDateString()
  @IsNotEmpty()
  lessonDate: string;

  @IsNumber()
  @IsNotEmpty()
  periodNumber: number;

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

  @IsNumber()
  @IsOptional()
  classId?: number;

  @IsNumber()
  @IsOptional()
  sectionId?: number;

  @IsEnum(LessonStatus)
  @IsOptional()
  status?: LessonStatus;

  @IsOptional()
  isExamPrep?: boolean;

  @IsOptional()
  isLocked?: boolean;
}
