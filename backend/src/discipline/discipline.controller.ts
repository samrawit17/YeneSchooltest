import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards, ForbiddenException } from '@nestjs/common';
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
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER)
  async createIncident(
    @Request() req: any,
    @Body() dto: CreateIncidentDto & { reportedBy: string },
  ) {
    return this.disciplineService.createIncident({
      ...dto,
      schoolId: req.user.schoolId,
      reportedBy: req.user.id,
      incidentDate: new Date(dto.incidentDate),
    });
  }

  @Get()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  async getIncidents(
    @Request() req: any,
    @Query('studentId') studentId?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
  ) {
    return this.disciplineService.getIncidents(req.user.schoolId, { studentId, severity, status });
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.PARENT)
  async getStudentIncidents(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    if (req.user.role === Role.PARENT) {
      const allowed = await this.disciplineService.verifyParentChild(
        req.user.id,
        studentId,
        req.user.schoolId,
      );
      if (!allowed) {
        throw new ForbiddenException(
          'You can only view your linked children disciplinary records',
        );
      }
    }
    return this.disciplineService.getStudentIncidents(studentId, req.user.schoolId, academicYearId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  async getIncident(@Request() req: any, @Param('id') id: string) {
    return this.disciplineService.getIncidentById(id, req.user.schoolId);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  async updateIncident(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.disciplineService.updateIncident(id, req.user.schoolId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  async deleteIncident(@Request() req: any, @Param('id') id: string) {
    return this.disciplineService.deleteIncident(id, req.user.schoolId);
  }
}
