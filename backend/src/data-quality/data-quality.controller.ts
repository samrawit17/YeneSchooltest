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
}
