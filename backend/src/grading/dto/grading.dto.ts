import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// GradeStatus enum - used for grade workflow
export enum GradeStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreateGradeDto {
  @IsString()
  studentId: string;

  @IsString()
  subjectId: string;

  @IsString()
  classId: string;

  @IsString()
  sectionId: string;

  @IsString()
  academicYear: string;

  @IsString()
  termId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  caScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  midScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  finalScore?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateGradeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  caScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  midScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  finalScore?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class BulkGradeEntryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGradeDto)
  grades: CreateGradeDto[];
}

export class GradeFilterDto {
  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}

export class ApproveGradeDto {
  @IsEnum(GradeStatus)
  status: GradeStatus;

  @IsOptional()
  @IsString()
  registrarComment?: string;
}

export class GradingComponentDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

export class GradeScaleDto {
  @IsString()
  gradeLetter: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  minScore: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  maxScore: number;

  @IsNumber()
  gradePoint: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class TeacherAssignmentDto {
  @IsString()
  teacherId: string;

  @IsString()
  subjectId: string;

  @IsString()
  classId: string;

  @IsString()
  sectionId: string;

  @IsString()
  academicYear: string;
}
