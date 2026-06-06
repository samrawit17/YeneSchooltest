import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEmail,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEnrollmentRequestDto {
  @IsString()
  schoolId!: string;

  @IsString()
  academicYearId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  middleName?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsString()
  @IsEnum(['MALE', 'FEMALE'])
  gender!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(20)
  faydaNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationality?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  previousSchool?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  previousGrade?: number;

  @IsOptional()
  @IsBoolean()
  transferCertificate?: boolean;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  parentFirstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  parentLastName!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  parentPhone!: string;

  @IsOptional()
  @IsEmail()
  parentEmail?: string;

  @IsString()
  @IsEnum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'])
  parentRelation!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  requestedGrade!: number;

  @IsOptional()
  @IsString()
  @IsEnum(['SOCIAL', 'NATURAL'])
  requestedStream?: string;

  @IsOptional()
  documents?: Record<string, boolean>;
}

export class EnrollmentQueryDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class RejectEnrollmentDto {
  @IsString()
  @MinLength(10)
  reason!: string;
}

export class SendCredentialsDto {
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  sendSms?: boolean;
}
