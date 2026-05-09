import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { DisciplineService } from './discipline.service';

interface CreateIncidentDto {
  schoolId: string;
  studentId: string;
  incidentDate: Date;
  title: string;
  description: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionTaken?: string;
}

interface UpdateIncidentDto {
  title?: string;
  description?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'ESCALATED';
  actionTaken?: string;
  outcome?: string;
}

@Controller('discipline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}

  @Post()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  async createIncident(@Body() dto: CreateIncidentDto & { reportedBy: string }) {
    return this.disciplineService.createIncident({
      ...dto,
      incidentDate: new Date(dto.incidentDate),
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  async getIncidents(
    @Query('schoolId') schoolId: string,
    @Query('studentId') studentId?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
  ) {
    return this.disciplineService.getIncidents(schoolId, { studentId, severity, status });
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.PARENT)
  async getStudentIncidents(@Param('studentId') studentId: string) {
    return this.disciplineService.getStudentIncidents(studentId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  async getIncident(@Param('id') id: string) {
    return this.disciplineService.getIncidentById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  async updateIncident(@Param('id') id: string, @Body() dto: UpdateIncidentDto) {
    return this.disciplineService.updateIncident(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async deleteIncident(@Param('id') id: string) {
    return this.disciplineService.deleteIncident(id);
  }
}