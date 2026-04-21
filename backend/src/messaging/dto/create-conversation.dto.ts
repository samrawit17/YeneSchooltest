import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participants!: string[];
}
