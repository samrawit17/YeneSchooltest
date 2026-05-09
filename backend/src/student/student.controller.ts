import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { StudentService } from './student.service';
import type {
  CreateStudentDto,
  UpdateStudentDto,
  ApproveEnrollmentDto,
  AssignClassDto,
} from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:create')
  async createStudent(
    @Body() createStudentDto: CreateStudentDto,
    @Request() req,
  ) {
    const createdById = req.user.id;
    return this.studentService.createStudent(createStudentDto, createdById);
  }

  // FIXED: Handle classId param for attendance/offline cache (proxies ClassService.getStudentsByClass)
  @Get()
  @Permissions('student:read')
  async getStudents(
    @Request() req,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('section') section?: string,
    @Query('status') status?: string,
    @Query('grade') grade?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('rollNumber') rollNumber?: string,
  ) {
    const schoolId = req.user.schoolId;

    if (classId) {
      // Attendance/offline cache: delegate to ClassService for exact same logic as my-class page
      return this.studentService.getStudentsByClassProxy(
        classId,
        sectionId || section,
        search,
        {
          page: page ? parseInt(page) : 1,
          limit: limit ? parseInt(limit) : 50,
        },
        schoolId,
      );
    }

    // Original student list logic
    const requesterId = req.user.id;
    const requesterRole = req.user.role;
    const filters = {
      status: status as any,
      grade: grade ? parseInt(grade) : undefined,
      section: section || sectionId,
    };
    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };
    return this.studentService.getStudents(
      schoolId,
      filters,
      pagination,
      requesterId,
      requesterRole,
      search,
      rollNumber,
    );
  }

  @Get('id-cards')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  async getStudentsForIdCards(
    @Request() req,
    @Query('grade') grade?: string,
    @Query('section') section?: string,
    @Query('academicYear') academicYear?: string,
    @Query('search') search?: string,
    @Query('studentIds') studentIds?: string,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.getStudentsForIdCards(schoolId, {
      grade,
      section,
      academicYear,
      search,
      studentIds: studentIds
        ? studentIds.split(',').filter(Boolean)
        : undefined,
    });
  }

  @Get(':id')
  @Permissions('student:read')
  async getStudentById(@Param('id') studentId: string, @Request() req) {
    const schoolId = req.user.schoolId;
    return this.studentService.getStudentById(studentId, schoolId);
  }

  @Put(':id')
  @Permissions('student:update')
  async updateStudent(
    @Param('id') studentId: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.updateStudent(
      studentId,
      schoolId,
      updateStudentDto,
    );
  }

  @Get('me/class')
  @Roles(Role.STUDENT)
  @Permissions('timetable:read')
  async getMyClassAssignment(@Request() req) {
    const schoolId = req.user.schoolId;
    return this.studentService.getMyClassAssignment(req.user.id, schoolId);
  }

  @Get('homeroom/me')
  @Roles(Role.TEACHER, Role.ADMIN, Role.IT_MANAGER, Role.SUPER_ADMIN)
  @Permissions('student:read')
  async getMyHomeroomStudents(@Request() req) {
    const schoolId = req.user.schoolId;
    const teacherId = req.user.id;
    const requesterRole = req.user.role;
    return this.studentService.getStudentsByHomeroomTeacher(
      schoolId,
      teacherId,
      requesterRole,
    );
  }

  @Get('enrollments/pending')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve_enrollment')
  async getPendingEnrollments(@Request() req) {
    const schoolId = req.user.schoolId;
    return this.studentService.getPendingEnrollments(schoolId);
  }

  @Post('enrollments/:id/approve')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:approve_enrollment')
  async approveEnrollment(
    @Param('id') enrollmentId: string,
    @Body() approveData: ApproveEnrollmentDto,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.approveEnrollment(
      enrollmentId,
      schoolId,
      approveData,
    );
  }

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
    return this.studentService.rejectEnrollment(
      enrollmentId,
      schoolId,
      rejectionReason,
    );
  }

  // REGISTRAR: Assign/Update class for student
  @Post(':id/assign-class')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:update')
  async assignClass(
    @Param('id') studentId: string,
    @Body() assignData: AssignClassDto,
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.assignClass(studentId, schoolId, assignData);
  }

  // REGISTRAR: Upload documents for student
  @Post(':id/documents')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('student:update')
  async uploadDocuments(
    @Param('id') studentId: string,
    @Body('documents') documents: any[],
    @Request() req,
  ) {
    const schoolId = req.user.schoolId;
    return this.studentService.uploadDocuments(studentId, schoolId, documents);
  }
}
