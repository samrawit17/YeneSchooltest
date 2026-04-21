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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ClassService } from './class.service';
import { Role } from '../auth/types/role.enum';
import { SchoolSettingsService } from '../school-settings/school-settings.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: Role;
    schoolId?: string;
  };
}

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ClassController {
  constructor(
    private classService: ClassService,
    private schoolSettingsService: SchoolSettingsService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('class:create')
  async create(@Request() req: AuthenticatedRequest, @Body() body: any) {
    const schoolId = req.user.schoolId || body.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.classService.create({
      schoolId,
      academicYearId: body.academicYearId,
      grade: body.grade,
      section: body.section,
      name: body.name,
    });
  }

  @Get()
  @Permissions('class:read')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.classService.findAll(schoolId, academicYearId);
  }

  @Get(':id')
  @Permissions('class:read')
  async findOne(@Param('id') id: string) {
    return this.classService.findOne(id);
  }

  @Get('grades/list')
  @Permissions('class:read')
  async getGrades(@Request() req: AuthenticatedRequest) {
    const { schoolId, role } = req.user;

    if (!schoolId) {
      return role === Role.SUPER_ADMIN ? this.classService.getGrades() : [];
    }

    const gradeLevels =
      await this.schoolSettingsService.getGradeLevelsForSchool(schoolId);
    return gradeLevels.map((grade) => grade.level);
  }

  @Get('search')
  @Permissions('class:read')
  async search(
    @Request() req: AuthenticatedRequest,
    @Query('q') query: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    if (!query) {
      return { success: false, message: 'Search query is required' };
    }

    return this.classService.search(schoolId, query, academicYearId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('class:update')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.classService.update(id, {
      academicYearId: body.academicYearId,
      grade: body.grade,
      name: body.name,
      homeroomTeacherId: body.homeroomTeacherId,
    });
  }

  @Put(':id/homeroom-teacher')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('class:update')
  async setHomeroomTeacher(@Param('id') id: string, @Body() body: any) {
    return this.classService.update(id, {
      homeroomTeacherId: body.homeroomTeacherId,
    });
  }

  @Get(':id/students')
  @Permissions('class:read')
  async getStudentsByClass(
    @Param('id') id: string,
    @Query('sectionId') sectionId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: string,
  ) {
    const pagination = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      orderBy: orderBy || 'name',
    };
    return this.classService.getStudentsByClass(
      id,
      sectionId,
      search,
      pagination,
    );
  }

  // Note: Class deletion is not included in the new permission philosophy

  @Get(':id/stats')
  @Permissions('class:read')
  async getClassStats(
    @Param('id') id: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.classService.getClassStats(id, sectionId);
  }
}
