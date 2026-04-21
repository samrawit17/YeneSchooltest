import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LeaveType {
  ANNUAL = 'SICK', // Annual uses SICK in DB
  SICK = 'SICK',
  CASUAL = 'CASUAL',
  WITHOUT_PAY = 'WITHOUT_PAY',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class CreateLeaveRequestDto {
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  contactDuringLeave?: string;

  @IsString()
  @IsOptional()
  attachments?: string;
}

export class UpdateLeaveRequestDto {
  @IsEnum(LeaveType)
  @IsOptional()
  leaveType?: LeaveType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  contactDuringLeave?: string;
}

export class ApproveLeaveRequestDto {
  @IsString()
  @IsOptional()
  comments?: string;
}

export class RejectLeaveRequestDto {
  @IsString()
  rejectionReason: string;
}

export class LeaveRequestQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  leaveType?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}