import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { PlanTier } from '@prisma/client';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsEnum(PlanTier)
  tier: PlanTier;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  features: string[];
}
