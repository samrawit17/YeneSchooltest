import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AllowSuperAdminMixedRole, Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { DataQualityService } from './data-quality.service';

@Controller('data-quality')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DataQualityController {
  constructor(private readonly dataQualityService: DataQualityService) {}

  private resolveSchoolId(req: any, schoolId?: string) {
    if (req.user?.role === Role.SUPER_ADMIN && schoolId) {
      return schoolId;
    }
    return req.user.schoolId;
  }

  @Get('student-consistency')
  @AllowSuperAdminMixedRole()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  getStudentConsistencyReport(
    @Request() req: any,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.dataQualityService.getStudentConsistencyReport(
      this.resolveSchoolId(req, schoolId),
    );
  }

  @Get('staff-consistency')
  @AllowSuperAdminMixedRole()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  getStaffConsistencyReport(
    @Request() req: any,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.dataQualityService.getStaffConsistencyReport(
      this.resolveSchoolId(req, schoolId),
    );
  }

  @Get('class-structure')
  @AllowSuperAdminMixedRole()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  getClassStructureReport(
    @Request() req: any,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.dataQualityService.getClassStructureReport(
      this.resolveSchoolId(req, schoolId),
    );
  }

  @Get('timetable-conflicts')
  @AllowSuperAdminMixedRole()
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  getTimetableConflictReport(
    @Request() req: any,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.dataQualityService.getTimetableConflictReport(
      this.resolveSchoolId(req, schoolId),
    );
  }
}
