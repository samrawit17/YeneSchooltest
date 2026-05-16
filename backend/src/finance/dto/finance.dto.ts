import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFeeStructureDto {
  @IsString()
  schoolId!: string;

  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  termId?: string; // Links to Term based on school's curriculum type

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
  semester?: number; // Legacy: For TERM curriculum (1, 2, 3)

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
  @IsString()
  isActive?: boolean;
}

export class GenerateStudentFeesDto {
  @IsString()
  schoolId!: string;

  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  termId?: string; // Optional: Generate fees for a specific term

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  grade?: number;
}

export class StudentFeesQueryDto {
  @IsString()
  schoolId!: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsString()
  termId?: string; // Filter by specific term

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsEnum(['PAID', 'PARTIAL', 'PENDING'])
  status?: 'PAID' | 'PARTIAL' | 'PENDING';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class RecordPaymentDto {
  @IsString()
  schoolId!: string;

  @IsString()
  studentFeeId!: string;

  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsNumber()
  @Min(1)
  amountPaid!: number;

  @IsEnum(['CASH', 'BANK_TRANSFER', 'CHEQUE'])
  paymentMethod!: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE';

  @IsOptional()
  @IsString()
  transactionReference?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReportQueryDto {
  @IsString()
  schoolId!: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsNumber()
  month?: number;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  termId?: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;
}

// Fee Collection Mode types - matches school setting fee_structure_mode
export enum FeeCollectionMode {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMESTER = 'SEMESTER',
  TERM = 'TERM',
  YEARLY = 'YEARLY',
}

// DTO for intelligent fee calculation based on school's fee collection mode
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

// DTO for generating fees with automatic installment split
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
