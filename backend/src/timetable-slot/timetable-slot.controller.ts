import {
  Controller,
  Get,
  Post,
  Patch,
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
import { TimetableSlotService } from './timetable-slot.service';
import { Role } from '../auth/types/role.enum';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: Role;
    schoolId?: string;
  };
}

@Controller('timetable-slots')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class TimetableSlotController {
  constructor(private timetableSlotService: TimetableSlotService) {}

  @Post()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('timetable:manage')
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateTimetableSlotDto,
  ) {
    const schoolId = req.user.schoolId || body.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.timetableSlotService.create({
      ...body,
      schoolId,
    });
  }

  @Get()
  @Permissions('timetable:read')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('dayOfWeek') dayOfWeek?: string,
    @Query('classId') classId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.timetableSlotService.findAll(schoolId, {
      dayOfWeek: dayOfWeek ? parseInt(dayOfWeek) : undefined,
      classId,
      teacherId,
      academicYearId,
    });
  }

  @Get('class/:classId')
  @Permissions('timetable:read')
  async findByClass(
    @Request() req: AuthenticatedRequest,
    @Param('classId') classId: string,
  ) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.timetableSlotService.findByClass(schoolId, classId);
  }

  @Get('teacher/:teacherId')
  @Permissions('timetable:read')
  async findByTeacher(
    @Request() req: AuthenticatedRequest,
    @Param('teacherId') targetTeacherId: string,
  ) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    const result = await this.timetableSlotService.findByTeacher(schoolId, targetTeacherId);
    return result;
  }

  @Get(':id')
  @Permissions('timetable:read')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const schoolId = req.user.schoolId;
    if (!schoolId) return { success: false, message: 'School ID is required' };
    return this.timetableSlotService.findOne(id, schoolId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('timetable:manage')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateTimetableSlotDto,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) return { success: false, message: 'School ID is required' };
    return this.timetableSlotService.update(id, schoolId, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('timetable:manage')
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const schoolId = req.user.schoolId;
    if (!schoolId) return { success: false, message: 'School ID is required' };
    return this.timetableSlotService.delete(id, schoolId);
  }

  @Post('bulk')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('timetable:manage')
  async bulkCreate(
    @Request() req: AuthenticatedRequest,
    @Body() body: { slots: CreateTimetableSlotDto[] },
  ) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.timetableSlotService.bulkCreate(schoolId, body.slots);
  }

  @Delete('class/:classId/section/:sectionId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('timetable:manage')
  async deleteByClassSection(
    @Request() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Param('sectionId') sectionId: string,
  ) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.timetableSlotService.deleteByClassSection(
      schoolId,
      classId,
      sectionId,
    );
  }

  @Get('grid/class/:classId')
  @Permissions('timetable:read')
  async getTimetableGrid(
    @Request() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.timetableSlotService.getTimetableGrid(
      schoolId,
      classId,
      sectionId,
    );
  }
}
