import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { DataQualityService } from './data-quality.service';

@Controller('data-quality')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DataQualityController {
  constructor(private readonly dataQualityService: DataQualityService) {}

  @Get('student-consistency')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  getStudentConsistencyReport(@Request() req: any) {
    return this.dataQualityService.getStudentConsistencyReport(
      req.user.schoolId,
    );
  }

  @Get('staff-consistency')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  getStaffConsistencyReport(@Request() req: any) {
    return this.dataQualityService.getStaffConsistencyReport(
      req.user.schoolId,
    );
  }

  @Get('class-structure')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  getClassStructureReport(@Request() req: any) {
    return this.dataQualityService.getClassStructureReport(
      req.user.schoolId,
    );
  }

  @Get('timetable-conflicts')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  getTimetableConflictReport(@Request() req: any) {
    return this.dataQualityService.getTimetableConflictReport(
      req.user.schoolId,
    );
  }
}
