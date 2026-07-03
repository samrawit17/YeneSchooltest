import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsArray,
  IsEnum,
  IsBoolean,
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

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
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
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['HIGH', 'MEDIUM', 'LOW'])
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
