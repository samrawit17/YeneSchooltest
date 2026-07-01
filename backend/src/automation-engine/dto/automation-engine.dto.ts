import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsObject, MinLength } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  eventTrigger: string;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsArray()
  @IsNotEmpty()
  actions: Record<string, any>[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateRuleDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  eventTrigger?: string;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, any>;

  @IsArray()
  @IsOptional()
  actions?: Record<string, any>[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ToggleRuleDto {
  @IsBoolean()
  isActive: boolean;
}

export class AutomationLogQueryDto {
  @IsString()
  @IsOptional()
  ruleId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  eventType?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
