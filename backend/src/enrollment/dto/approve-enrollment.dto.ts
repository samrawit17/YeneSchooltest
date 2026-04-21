import { IsString, IsNotEmpty } from 'class-validator';

export class ApproveEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @IsString()
  @IsNotEmpty()
  schoolId: string;
}
