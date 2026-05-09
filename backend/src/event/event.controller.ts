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
import { EventService } from './event.service';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { Role } from '../auth/types/role.enum';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: Role;
    schoolId?: string;
  };
}

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class EventController {
  constructor(private eventService: EventService) {}

  @Post()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('event:create')
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateEventDto,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    return this.eventService.create(body, req.user.id, schoolId);
  }

  @Get()
  @Permissions('event:read')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('role') role?: string,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    const userRole = role || req.user.role;
    return this.eventService.findAll(schoolId, userRole);
  }

  @Get('upcoming-count')
  async getUpcomingCount(
    @Request() req: AuthenticatedRequest,
    @Query('role') role?: string,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    const userRole = role || req.user.role;
    const count = await this.eventService.getUpcomingCount(schoolId, userRole);
    return { count };
  }

  @Get('active-count')
  async getActiveCount(
    @Request() req: AuthenticatedRequest,
    @Query('role') role?: string,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    const userRole = role || req.user.role;
    const count = await this.eventService.getActiveCount(schoolId, userRole);
    return { count };
  }

  @Get(':id')
  @Permissions('event:read')
  async findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('event:update')
  async update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: UpdateEventDto,
  ) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    return this.eventService.update(id, body, schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('event:delete')
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const schoolId = req.user.schoolId;
    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }
    return this.eventService.delete(id, schoolId);
  }
}
