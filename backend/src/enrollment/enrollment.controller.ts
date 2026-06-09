import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { ApproveEnrollmentDto, RejectEnrollmentDto } from './dto';

@Controller('enroll')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  /**
   * Enrollment landing page
   * Returns JSON with school info for frontend to redirect
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async enrollmentLanding(@Query('key') enrollmentKey: string) {
    if (!enrollmentKey) {
      return {
        error: 'Missing enrollment key',
        message: 'Please provide a valid enrollment key',
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }

    const school =
      await this.enrollmentService.resolveSchoolByKey(enrollmentKey);

    if (!school) {
      return {
        error: 'Invalid enrollment key',
        message: 'The provided enrollment key is not valid',
        statusCode: HttpStatus.NOT_FOUND,
      };
    }

    if (!school.isActive) {
      return {
        error: 'Enrollment closed',
        message: 'Enrollment is not currently available for this school',
        statusCode: HttpStatus.FORBIDDEN,
      };
    }

    // Generate secure enrollment token
    const enrollmentToken = this.enrollmentService.generateEnrollmentToken(
      school.id,
    );

    return {
      success: true,
      school: {
        id: school.id,
        name: school.name,
      },
      enrollmentToken,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8000',
    };
  }

  /**
   * Verify enrollment token (for frontend to validate)
   */
  @Get('verify')
  verifyToken(@Query('token') token: string) {
    const result = this.enrollmentService.verifyEnrollmentToken(token);
    return result;
  }

  /**
   * Approve enrollment with auto-section assignment
   */
  @Post('approve')
  @HttpCode(HttpStatus.OK)
  async approveEnrollment(@Body() dto: ApproveEnrollmentDto) {
    const result = await this.enrollmentService.approveEnrollment(
      dto.enrollmentId,
      dto.schoolId,
    );
    return {
      success: true,
      message: 'Enrollment approved successfully',
      data: result,
    };
  }

  /**
   * Reject enrollment
   */
  @Post('reject')
  @HttpCode(HttpStatus.OK)
  async rejectEnrollment(@Body() dto: RejectEnrollmentDto) {
    const result = await this.enrollmentService.rejectEnrollment(
      dto.enrollmentId,
      dto.schoolId,
      dto.rejectionReason,
    );
    return {
      success: true,
      message: 'Enrollment rejected',
      data: result,
    };
  }
}
