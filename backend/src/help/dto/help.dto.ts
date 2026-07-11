import { IsString, IsOptional, IsEnum } from 'class-validator';

export class QueryHelpDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;
}
