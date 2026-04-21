import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsArray,
  IsEnum,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  audience?: string[]; // Array of roles

  @IsOptional()
  @IsEnum(['ACADEMIC', 'SPORTS', 'CULTURAL', 'HOLIDAY', 'OTHER'])
  category?: 'ACADEMIC' | 'SPORTS' | 'CULTURAL' | 'HOLIDAY' | 'OTHER';

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  audience?: string[];

  @IsOptional()
  @IsEnum(['ACADEMIC', 'SPORTS', 'CULTURAL', 'HOLIDAY', 'OTHER'])
  category?: 'ACADEMIC' | 'SPORTS' | 'CULTURAL' | 'HOLIDAY' | 'OTHER';

  @IsOptional()
  @IsString()
  color?: string;
}
