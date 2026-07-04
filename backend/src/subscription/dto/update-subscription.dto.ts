import { IsString, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
