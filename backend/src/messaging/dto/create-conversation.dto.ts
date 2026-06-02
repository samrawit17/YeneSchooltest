import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  subject?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participants!: string[];
}
