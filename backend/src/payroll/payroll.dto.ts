import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class UpsertPayrollSalaryDto {
  @IsString()
  schoolId!: string;

  @IsString()
  staffUserId!: string;

  @IsNumber()
  baseSalary!: number;

  @IsOptional()
  @IsNumber()
  allowances?: number;

  @IsOptional()
  @IsNumber()
  deductions?: number;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  tinNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePayrollRunDto {
  @IsString()
  schoolId!: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @IsNumber()
  @Min(2020)
  periodYear!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PayrollQueryDto {
  @IsString()
  schoolId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsNumber()
  @Min(2020)
  year?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdatePayrollRunStatusDto {
  @IsString()
  schoolId!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePayrollEntryStatusDto {
  @IsString()
  schoolId!: string;

  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  transactionReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
