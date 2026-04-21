import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @IsEnum(CommunicationCategory)
  @IsOptional()
  category?: CommunicationCategory;
}

export class CreateCommunicationReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
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
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'updatedAt' | 'status';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
