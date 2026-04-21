import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  @Permissions('user:read')
  async getTeachers(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('subject') subject?: string,
  ) {
    try {
      if (!req.user.schoolId) {
        throw new HttpException(
          'User is not associated with any school',
          HttpStatus.BAD_REQUEST,
        );
      }

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;

      return this.teacherService.getTeachers(req.user.schoolId, {
        page: pageNum,
        limit: limitNum,
        search,
        status,
        classId,
        sectionId,
        subject,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get teachers: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @Permissions('user:read')
  async getTeacherById(@Param('id') teacherId: string, @Request() req) {
    try {
      if (!req.user.schoolId) {
        throw new HttpException(
          'User is not associated with any school',
          HttpStatus.BAD_REQUEST,
        );
      }

      const teacher = await this.teacherService.getTeacherById(
        teacherId,
        req.user.schoolId,
      );

      if (!teacher) {
        throw new HttpException('Teacher not found', HttpStatus.NOT_FOUND);
      }

      return teacher;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get teacher: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /teachers/me/assignments
   * Get the authenticated teacher's assigned classes and sections
   */
  @Get('me/assignments')
  @Permissions('teacher:read')
  async getMyAssignments(@Request() req) {
    try {
      if (!req.user.schoolId) {
        throw new HttpException(
          'User is not associated with any school',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.teacherService.getMyAssignments(
        req.user.id,
        req.user.schoolId,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get assignments: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
