import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { RegistrarService } from './registrar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('registrar')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RegistrarController {
  constructor(private readonly registrarService: RegistrarService) {}

  // Create student account (ADMIN or REGISTRAR)
  @Post('students')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:create')
  async createStudent(
    @Body()
    body: {
      email: string;
      name: string;
      academicYear: string;
      gradeId: string;
      gender?: string;
      address?: string;
      phone?: string;
      emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
      };
      guardianName?: string;
      guardianPhone?: string;
      guardianEmail?: string;
      documents?: any[];
    },
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.registrarService.createStudent(body, schoolId, req.user.id);
  }

  // Get all students for the school
  @Get('students')
  @Permissions('student:read')
  async getStudents(
    @Request() req,
    @Query('status') status?: string,
    @Query('grade') grade?: string,
  ) {
    const schoolId = req.user.schoolId;
    const filters = {
      status: status as any,
      grade: grade ? parseInt(grade) : undefined,
    };
    return this.registrarService.getStudents(schoolId, filters);
  }

  // Get student by ID
  @Get('students/:id')
  @Permissions('student:read')
  async getStudentById(@Param('id') studentId: string, @Request() req) {
    const schoolId = req.user.schoolId;
    return this.registrarService.getStudentById(studentId, schoolId);
  }

  // Update student details
  @Put('students/:id')
  @Permissions('student:update')
  async updateStudent(
    @Param('id') studentId: string,
    @Body()
    body: {
      name?: string;
      gender?: string;
      address?: string;
      phone?: string;
      emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
      };
      guardianName?: string;
      guardianPhone?: string;
      guardianEmail?: string;
      documents?: any[];
    },
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.registrarService.updateStudent(studentId, schoolId, body);
  }

  // Get pending enrollments
  @Get('enrollments/pending')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve_enrollment')
  async getPendingEnrollments(@Request() req) {
    const schoolId = req.user.schoolId;
    return this.registrarService.getPendingEnrollments(schoolId);
  }

  // Get all enrollments with optional status filter
  @Get('enrollments')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:read')
  async getEnrollments(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    const schoolId = req.user.schoolId;
    const pageNum = page ? parseInt(page) : 1;
    return this.registrarService.getEnrollments(schoolId, status, pageNum);
  }

  // Approve enrollment with class assignment (manual)
  @Post('enrollments/:id/approve')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve_enrollment')
  async approveEnrollment(
    @Param('id') enrollmentId: string,
    @Body()
    body: {
      className: string;
      section: string;
      rollNumber: string;
    },
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.registrarService.approveEnrollment(
      enrollmentId,
      schoolId,
      body,
    );
  }

  // Approve enrollment with automatic class/section assignment
  @Post('enrollments/:id/auto-approve')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve_enrollment')
  async approveEnrollmentAuto(
    @Param('id') enrollmentId: string,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.registrarService.approveEnrollmentAuto(enrollmentId, schoolId);
  }

  // Reject enrollment
  @Post('enrollments/:id/reject')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve_enrollment')
  async rejectEnrollment(
    @Param('id') enrollmentId: string,
    @Body('rejectionReason') rejectionReason: string,
    @Request() req,
  ) {
    if (!rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }
    const schoolId = req.user.schoolId;
    return this.registrarService.rejectEnrollment(
      enrollmentId,
      schoolId,
      rejectionReason,
    );
  }

  // Assign/Update class for student
  @Post('students/:id/assign-class')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('class:update')
  async assignClass(
    @Param('id') studentId: string,
    @Body()
    body: {
      className: string;
      section: string;
      rollNumber: string;
    },
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.registrarService.assignClass(studentId, schoolId, body);
  }

  // Upload documents for student
  @Post('students/:id/documents')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:update')
  async uploadDocuments(
    @Param('id') studentId: string,
    @Body('documents') documents: any[],
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.registrarService.uploadDocuments(
      studentId,
      schoolId,
      documents,
    );
  }
}
