import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayrollDto {
  @IsString()
  academicYear: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  year: number;

  @IsDateString()
  @IsOptional()
  paymentDate?: string;
}

export class PayrollItemDto {
  @IsString()
  employeeId: string;

  @IsNumber()
  @Min(0)
  baseSalary: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  allowances?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  deductions?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  bonus?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  overtime?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number = 0;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class ProcessPayrollDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollItemDto)
  items: PayrollItemDto[];
}

export class PayrollQueryDto {
  @IsString()
  @IsOptional()
  academicYear?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  month?: number;

  @IsNumber()
  @IsOptional()
  year?: number;

  @IsEnum(['DRAFT', 'PROCESSED', 'PAID', 'CANCELLED'])
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CreateSalaryStructureDto {
  @IsString()
  name: string;

  @IsString()
  position: string;

  @IsNumber()
  @Min(0)
  baseSalary: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  houseAllowance?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  medicalAllowance?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  otherAllowances?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pensionRate?: number = 0;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number = 0;
}

export class EmployeeAttendanceDto {
  @IsDateString()
  date: string;

  @IsString()
  status: string; // PRESENT, ABSENT, LATE, LEAVE

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsNumber()
  @IsOptional()
  hoursWorked?: number;
}

export class BulkAttendanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeeAttendanceDto)
  attendances: EmployeeAttendanceDto[];
}

export class AttendanceQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
