import { IsString, IsOptional } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  schoolId: string;

  @IsString()
  planId: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
