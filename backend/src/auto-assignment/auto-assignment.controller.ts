import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  AutoAssignmentService,
  AutoAssignmentResult,
} from './auto-assignment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';

/**
 * AutoAssignmentController
 *
 * REST API endpoints for automatic class and section assignment.
 * All endpoints require authentication and appropriate permissions.
 */
@Controller('auto-assignment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AutoAssignmentController {
  constructor(private readonly autoAssignmentService: AutoAssignmentService) {}

  /**
   * Trigger auto-assignment for a specific enrollment
   * This is called after enrollment is approved
   *
   * POST /auto-assignment/enrollments/:enrollmentId/auto-assign
   */
  @Post('enrollments/:enrollmentId/auto-assign')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve')
  async autoAssignEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @Request() req,
  ): Promise<AutoAssignmentResult> {
    const schoolId = req.user.schoolId;
    return this.autoAssignmentService.autoAssignStudent(enrollmentId, schoolId);
  }

  /**
   * Bulk auto-assignment for multiple enrollments
   * Useful for batch operations
   *
   * POST /auto-assignment/bulk
   * Body: { enrollmentIds: string[] }
   */
  @Post('bulk')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve')
  async bulkAutoAssign(
    @Body() body: { enrollmentIds: string[] },
    @Request() req,
  ): Promise<AutoAssignmentResult[]> {
    const schoolId = req.user.schoolId;
    return this.autoAssignmentService.bulkAutoAssign(
      body.enrollmentIds,
      schoolId,
    );
  }

  /**
   * Re-run auto-assignment for a student
   * Use this if a previous assignment needs to be redone
   *
   * POST /auto-assignment/enrollments/:enrollmentId/reassign
   */
  @Post('enrollments/:enrollmentId/reassign')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve')
  async reassignEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @Request() req,
  ): Promise<AutoAssignmentResult> {
    const schoolId = req.user.schoolId;
    return this.autoAssignmentService.reAssignStudent(enrollmentId, schoolId);
  }

  /**
   * Get current assignment info for a student
   *
   * GET /auto-assignment/students/:studentId/assignment
   */
  @Get('students/:studentId/assignment')
  @Permissions('student:read')
  async getStudentAssignment(
    @Param('studentId') studentId: string,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.autoAssignmentService.getStudentAssignment(studentId, schoolId);
  }

  /**
   * Get class capacity information for a grade
   * Useful for planning and reporting
   *
   * GET /auto-assignment/capacity?academicYear=2024&grade=7
   */
  @Get('capacity')
  @Permissions('student:read')
  async getClassCapacity(
    @Query('academicYear') academicYear: string,
    @Query('grade') grade: string,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    const gradeNum = parseInt(grade, 10);

    if (!academicYear || isNaN(gradeNum)) {
      return {
        error: 'Missing required parameters: academicYear and grade',
      };
    }

    // Look up academic year ID from name
    const academicYearRecord =
      await this.autoAssignmentService.findAcademicYearByName(
        schoolId,
        academicYear,
      );

    if (!academicYearRecord) {
      return {
        error: 'Academic year not found: ' + academicYear,
      };
    }

    return this.autoAssignmentService.getClassCapacityInfo(
      schoolId,
      academicYearRecord.id,
      gradeNum,
    );
  }

  /**
   * Trigger auto-assignment on enrollment approval
   * This is an alternative endpoint that combines approval + assignment
   *
   * POST /auto-assignment/approve-and-assign
   * Body: { enrollmentId: string }
   */
  @Post('approve-and-assign')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve')
  @HttpCode(HttpStatus.OK)
  async approveAndAssign(
    @Body() body: { enrollmentId: string },
    @Request() req,
  ): Promise<AutoAssignmentResult> {
    const schoolId = req.user.schoolId;
    return this.autoAssignmentService.autoAssignStudent(
      body.enrollmentId,
      schoolId,
    );
  }
}
