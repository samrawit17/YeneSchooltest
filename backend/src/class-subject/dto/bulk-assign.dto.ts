import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class BulkAssignDto {
  @IsArray()
  @IsString({ each: true })
  sectionIds: string[];

  @IsArray()
  @IsString({ each: true })
  subjectIds: string[];

  @IsOptional()
  @IsString()
  teacherId?: string | null;

  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsOptional()
  @IsString()
  classId?: string;
}
