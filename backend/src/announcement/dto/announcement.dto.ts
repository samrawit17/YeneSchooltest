import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsArray,
  IsEnum,
} from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsArray()
  visibleTo?: string[]; // Array of roles like ['admin', 'teacher', 'student', 'parent']

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsArray()
  visibleTo?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}
