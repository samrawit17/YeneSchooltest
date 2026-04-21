import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsNumberString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateEmployeeDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsEnum([
    'TEACHER',
    'REGISTRAR',
    'FINANCE',
    'HR',
    'ADMIN',
    'LIBRARIAN',
    'GUARD',
    'DRIVER',
    'COOK',
    'CLEANER',
    'OTHER',
  ])
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salary?: number;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  emergencyPhone?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  tinNumber?: string;

  @IsString()
  @IsOptional()
  pfNumber?: string;
}

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsEnum([
    'TEACHER',
    'REGISTRAR',
    'FINANCE',
    'HR',
    'ADMIN',
    'LIBRARIAN',
    'GUARD',
    'DRIVER',
    'COOK',
    'CLEANER',
    'OTHER',
  ])
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salary?: number;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsDateString()
  @IsOptional()
  terminationDate?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  emergencyPhone?: string;

  @IsString()
  @IsOptional()
  bankAccount?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  tinNumber?: string;

  @IsString()
  @IsOptional()
  pfNumber?: string;

  // Additional employee fields
  @IsEnum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'])
  @IsOptional()
  employmentType?: string;

  @IsDateString()
  @IsOptional()
  contractStartDate?: string;

  @IsDateString()
  @IsOptional()
  contractEndDate?: string;

  @IsString()
  @IsOptional()
  workSchedule?: string;

  @IsString()
  @IsOptional()
  shiftTime?: string;

  @IsString()
  @IsOptional()
  qualification?: string;

  @IsString()
  @IsOptional()
  experience?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  ifscCode?: string;

  // Leave balance
  @IsNumber()
  @IsOptional()
  annualLeave?: number;

  @IsNumber()
  @IsOptional()
  sickLeave?: number;

  @IsNumber()
  @IsOptional()
  casualLeave?: number;

  @IsNumber()
  @IsOptional()
  usedAnnualLeave?: number;

  @IsNumber()
  @IsOptional()
  usedSickLeave?: number;

  @IsNumber()
  @IsOptional()
  usedCasualLeave?: number;

  @IsOptional()
  isActive?: boolean;
}

export class EmployeeQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @Transform(({ value }) => (value ? Number(value) : 20))
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
