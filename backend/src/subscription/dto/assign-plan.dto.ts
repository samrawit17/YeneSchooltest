import { IsString, IsOptional } from 'class-validator';

export class AssignPlanDto {
  @IsString()
  schoolId: string;

  @IsOptional()
  @IsString()
  planId?: string | null;
}
