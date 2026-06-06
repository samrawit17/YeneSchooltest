import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { EnrollmentRequestService } from './enrollment-request.service';
import {
  CreateEnrollmentRequestDto,
  EnrollmentQueryDto,
} from './dto/enrollment-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';
import { EnrollmentRequestStatus } from '@prisma/client';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';

@Controller('enrollment')
export class EnrollmentRequestController {
  constructor(private readonly enrollmentService: EnrollmentRequestService) {}

  private getAuthenticatedSchoolId(req: any): string {
    const schoolId = req?.user?.schoolId;
    if (!schoolId) {
      throw new ForbiddenException('School not found in authenticated user');
    }
    return schoolId;
  }

  /**
   * PUBLIC ENDPOINTS - No authentication required
   */

  /**
   * List schools available for public enrollment
   * GET /enrollment/schools
   */
  @Get('schools')
  async getPublicSchools() {
    const schools = await this.enrollmentService.getPublicSchools();
    return { success: true, data: schools };
  }

  @Get('school/:id')
  async getPublicSchoolById(@Param('id') id: string) {
    const school = await this.enrollmentService.getPublicSchoolById(id);
    if (!school) {
      return { success: false, message: 'School not found' };
    }
    return { success: true, data: school };
  }

  @Get('school-url/:slug')
  async getPublicSchoolByUrlSlug(@Param('slug') slug: string) {
    const school = await this.enrollmentService.getPublicSchoolByUrlSlug(slug);
    if (!school) {
      return { success: false, message: 'School not found' };
    }
    return { success: true, data: school };
  }

  /**
   * Create a new enrollment request
   * POST /enrollment/request
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async createEnrollmentRequest(@Body() dto: CreateEnrollmentRequestDto) {
    const enrollment =
      await this.enrollmentService.createEnrollmentRequest(dto);
    return {
      success: true,
      message:
        'Enrollment request submitted successfully. You will be notified once reviewed by the school.',
      data: {
        id: enrollment.id,
        status: enrollment.status,
        referenceNumber: enrollment.referenceNumber,
      },
    };
  }

  /**
   * Check enrollment capacity for a grade (public)
   * GET /enrollment/capacity/:grade
   */
  @Get('capacity/:grade')
  async checkCapacity(
    @Query('schoolId') schoolId: string,
    @Param('grade') grade: number,
  ) {
    const capacity = await this.enrollmentService.checkGradeCapacity(
      schoolId,
      Number(grade),
    );
    return { success: true, data: capacity };
  }

  /**
   * Get available grades for enrollment (public)
   * GET /enrollment/grades
   */
  @Get('grades')
  async getAvailableGrades(@Query('schoolId') schoolId: string) {
    const grades = await this.enrollmentService.getAvailableGrades(schoolId);
    return { success: true, data: grades };
  }

  /**
   * Check if enrollment is open for a school (public)
   * GET /enrollment/status
   */
  @Get('status')
  async getEnrollmentStatus(@Query('schoolId') schoolId: string) {
    const status = await this.enrollmentService.getEnrollmentStatus(schoolId);
    return { success: true, data: status };
  }

  /**
   * PROTECTED ENDPOINTS - Authentication required
   */

  /**
   * List enrollment requests (Admin/Registrar)
   * GET /enrollment/requests
   */
  @Get('requests')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @RequiresFeature('ENROLLMENT_MANAGEMENT')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  async listRequests(@Query() query: EnrollmentQueryDto, @Request() req: any) {
    const result = await this.enrollmentService.listEnrollmentRequests({
      ...query,
      schoolId: this.getAuthenticatedSchoolId(req),
    });
    return { success: true, ...result };
  }

  /**
   * Get enrollment statistics
   * GET /enrollment/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @RequiresFeature('ENROLLMENT_MANAGEMENT')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  async getStats(
    @Request() req: any,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const stats = await this.enrollmentService.getEnrollmentStats(
      this.getAuthenticatedSchoolId(req),
      academicYearId,
    );
    return { success: true, data: stats };
  }

  /**
   * Get single enrollment request
   * GET /enrollment/requests/:id
   */
  @Get('requests/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @RequiresFeature('ENROLLMENT_MANAGEMENT')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  async getRequest(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const enrollment = await this.enrollmentService.getEnrollmentRequest(
      id,
      this.getAuthenticatedSchoolId(req),
    );
    return { success: true, data: enrollment };
  }

  /**
   * Approve enrollment request
   * POST /enrollment/requests/:id/approve
   */
  @Post('requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @RequiresFeature('ENROLLMENT_MANAGEMENT')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @HttpCode(HttpStatus.OK)
  async approveEnrollment(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const result = await this.enrollmentService.approveEnrollment(
      id,
      this.getAuthenticatedSchoolId(req),
      req.user.id,
    );
    return {
      success: true,
      message: 'Enrollment approved successfully. Credentials generated.',
      data: result,
    };
  }

  /**
   * Reject enrollment request
   * POST /enrollment/requests/:id/reject
   */
  @Post('requests/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @RequiresFeature('ENROLLMENT_MANAGEMENT')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @HttpCode(HttpStatus.OK)
  async rejectEnrollment(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    if (!reason) {
      return { success: false, message: 'Rejection reason is required' };
    }
    const enrollment = await this.enrollmentService.rejectEnrollment(
      id,
      this.getAuthenticatedSchoolId(req),
      reason,
    );
    return {
      success: true,
      message: 'Enrollment rejected.',
      data: enrollment,
    };
  }

  /**
   * Waitlist enrollment request
   * POST /enrollment/requests/:id/waitlist
   */
  @Post('requests/:id/waitlist')
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
  @RequiresFeature('ENROLLMENT_MANAGEMENT')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @HttpCode(HttpStatus.OK)
  async waitlistEnrollment(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const enrollment = await this.enrollmentService.waitlistEnrollment(
      id,
      this.getAuthenticatedSchoolId(req),
    );
    return {
      success: true,
      message: 'Student added to waitlist.',
      data: enrollment,
    };
  }

  /**
   * Cancel enrollment request (by requester or admin)
   * DELETE /enrollment/requests/:id
   */
  @Delete('requests/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelEnrollment(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const enrollment = await this.enrollmentService.cancelEnrollment(
      id,
      this.getAuthenticatedSchoolId(req),
    );
    return {
      success: true,
      message: 'Enrollment request cancelled.',
      data: enrollment,
    };
  }

  /**
   * Send credentials to approved student
   * POST /enrollment/requests/:id/send-credentials
   */
  @Post('requests/:id/send-credentials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async sendCredentials(
    @Param('id') id: string,
    @Body() body: { sendEmail?: boolean; sendSms?: boolean },
    @Request() req: any,
  ) {
    const enrollment = await this.enrollmentService.getEnrollmentRequest(
      id,
      this.getAuthenticatedSchoolId(req),
    );

    if (enrollment.status !== EnrollmentRequestStatus.APPROVED) {
      return { success: false, message: 'Enrollment must be approved first' };
    }

    // TODO: Implement actual email/SMS sending
    // For now, return the credentials
    return {
      success: true,
      message: 'Credentials ready to send',
      data: {
        student: {
          email: enrollment.user?.email,
          // Don't expose password here - fetch from secure storage
        },
        note: 'Email/SMS sending will be implemented with notification service',
      },
    };
  }
}
