import { IsString, IsNotEmpty } from 'class-validator';

export class RejectEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}
