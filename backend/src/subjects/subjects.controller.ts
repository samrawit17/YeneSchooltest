import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SubjectsService } from './subjects.service';
import { Role } from '../auth/types/role.enum';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('class:create')
  async create(
    @Request() req,
    @Body() body: { name: string; code?: string; isActive?: boolean; academicYearId?: string },
  ) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.subjectsService.create({
      ...body,
      schoolId,
    });
  }

  @Get()
  async findAll(@Request() req) {
    const schoolId = req.user.schoolId;

    if (!schoolId) {
      return { success: false, message: 'School ID is required' };
    }

    return this.subjectsService.findAll(schoolId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('class:update')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; isActive?: boolean },
  ) {
    return this.subjectsService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('class:delete')
  async delete(@Param('id') id: string) {
    return this.subjectsService.delete(id);
  }
}
