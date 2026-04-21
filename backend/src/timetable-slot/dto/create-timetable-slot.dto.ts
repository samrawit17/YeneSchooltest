import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateTimetableSlotDto {
  @IsString()
  schoolId: string;

  @IsString()
  classId: string;

  @IsString()
  sectionId: string;

  @IsString()
  subjectId: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday

  @IsString()
  startTime: string; // "09:00"

  @IsString()
  endTime: string; // "09:45"

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  academicYearId?: string;
}
