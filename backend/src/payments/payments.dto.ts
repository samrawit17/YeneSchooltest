import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

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
