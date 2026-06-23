import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Status enum - includes OPEN, ACKNOWLEDGED, and CLOSED
export enum CommunicationStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  CLOSED = 'CLOSED',
}

// Category enum for organizing communications
export enum CommunicationCategory {
  ACADEMIC = 'ACADEMIC',
  ATTENDANCE = 'ATTENDANCE',
  DISCIPLINE = 'DISCIPLINE',
  HEALTH = 'HEALTH',
  GENERAL = 'GENERAL',
}

export class CreateCommunicationDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message: string;

  @IsEnum(CommunicationCategory)
  @IsOptional()
  category?: CommunicationCategory;
}

export class CreateCommunicationReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message: string;
}

export class UpdateCommunicationStatusDto {
  @IsEnum(CommunicationStatus)
  @IsNotEmpty()
  status: CommunicationStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class CommunicationQueryDto {
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  classId?: string;

  @IsEnum(CommunicationStatus)
  @IsOptional()
  status?: CommunicationStatus;

  @IsEnum(CommunicationCategory)
  @IsOptional()
  category?: CommunicationCategory;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  createdById?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'updatedAt' | 'status';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
