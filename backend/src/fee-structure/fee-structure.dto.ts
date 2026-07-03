import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class CreateFeeStructureDto {
  @IsString()
  schoolId!: string;

  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsString()
  feeType!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  semester?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateFeeStructureDto {
  @IsOptional()
  @IsString()
  feeType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  grade?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  semester?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CalculateInstallmentFeesDto {
  @IsString()
  schoolId!: string;

  @IsString()
  academicYearId!: string;

  @IsString()
  feeType!: string;

  @IsNumber()
  @Min(0)
  annualAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class GenerateInstallmentFeesDto {
  @IsString()
  schoolId!: string;

  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  feeType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualAmount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  grade?: number;
}

export enum FeeCollectionMode {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMESTERLY = 'SEMESTERLY',
  TERMLY = 'TERMLY',
  YEARLY = 'YEARLY',
}

export enum CurriculumType {
  TERM = 'TERM',
  QUARTER = 'QUARTER',
  SEMESTER = 'SEMESTER',
}
