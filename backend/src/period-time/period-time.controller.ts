import { BadRequestException, Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { PeriodTimeService } from './period-time.service';

@Controller('api/period-time')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PeriodTimeController {
  constructor(private service: PeriodTimeService) {}

  @Get()
  async findAll(@Query('schoolId') schoolId: string) {
    return this.service.findAll(schoolId);
  }

  @Post()
  async create(@Body() data: any, @Query('schoolId') schoolId: string) {
    const resolvedSchoolId = schoolId || data?.schoolId;

    if (!resolvedSchoolId) {
      throw new BadRequestException('schoolId is required');
    }

    return this.service.create(data, resolvedSchoolId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
