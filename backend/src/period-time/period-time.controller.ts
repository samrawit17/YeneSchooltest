import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { PeriodTimeService } from './period-time.service';

@Controller('api/period-time')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.IT_MANAGER)
export class PeriodTimeController {
  constructor(private service: PeriodTimeService) {}

  @Get()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.REGISTRAR)
  async findAll(@Request() req: any) {
    return this.service.findAll(req.user.schoolId);
  }

  @Post()
  async create(@Request() req: any, @Body() data: any) {
    return this.service.create(data, req.user.schoolId);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.service.update(id, req.user.schoolId, data);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(id, req.user.schoolId);
  }
}
