import { IsString, IsOptional } from 'class-validator';

export class UpdateClassSubjectDto {
  @IsString()
  @IsOptional()
  teacherId?: string;
}
