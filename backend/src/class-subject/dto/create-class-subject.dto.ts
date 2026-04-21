import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateClassSubjectDto {
  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  sectionId: string;

  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsOptional()
  teacherId?: string;
}
