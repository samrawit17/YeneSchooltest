import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { ImportNationalExamResultsDto } from './dto/national-exam-results.dto';
import { NationalExamResultsService } from './national-exam-results.service';

interface AuthRequest {
  user: {
    id: string;
    role: string;
    schoolId: string;
  };
}

@Controller('national-exam-results')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NationalExamResultsController {
  constructor(private readonly service: NationalExamResultsService) {}

  @Get('batches')
  @Roles(Role.REGISTRAR, Role.ADMIN)
  listBatches(@Request() req: AuthRequest) {
    return this.service.listBatches(req.user.schoolId);
  }

  @Get('batches/:id')
  @Roles(Role.REGISTRAR, Role.ADMIN)
  getBatch(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.service.getBatch(req.user.schoolId, id);
  }

  @Post('import')
  @Roles(Role.REGISTRAR, Role.ADMIN)
  importResults(@Request() req: AuthRequest, @Body() dto: ImportNationalExamResultsDto) {
    return this.service.importResults(req.user.schoolId, req.user.id, dto);
  }

  @Post('batches/:id/publish')
  @Roles(Role.REGISTRAR, Role.ADMIN)
  publishBatch(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.service.publishBatch(req.user.schoolId, id);
  }

  @Get('student/me')
  @Roles(Role.STUDENT)
  getMyResults(@Request() req: AuthRequest) {
    return this.service.getPublishedForStudent(req.user.schoolId, req.user.id);
  }

}
