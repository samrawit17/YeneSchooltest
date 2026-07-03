import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { Role } from '../auth/types/role.enum';
import { StudentFeeService } from './student-fee.service';
import {
  GenerateStudentFeesDto,
  StudentFeesQueryDto,
} from './student-fee.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard)
@RequiresFeature('FINANCE_MANAGEMENT')
export class StudentFeeController {
  constructor(private readonly studentFeeService: StudentFeeService) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string) {
    return user?.role === Role.SUPER_ADMIN
      ? requestedSchoolId || user?.schoolId
      : user?.schoolId;
  }

  @Post('student-fees/generate')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.FINANCE)
  @Permissions('finance:student_fees:generate')
  async generateStudentFees(
    @Body() dto: GenerateStudentFeesDto,
    @Request() req: any,
  ) {
    const result = await this.studentFeeService.generateStudentFees({
      ...dto,
      schoolId: this.resolveSchoolId(req.user, dto.schoolId),
    });
    return { success: true, ...result };
  }

  @Get('student-fees')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.FINANCE, Role.REGISTRAR)
  @Permissions('finance:student_fees:read')
  async listStudentFees(
    @Query() query: StudentFeesQueryDto,
    @Request() req: any,
  ) {
    const result = await this.studentFeeService.getStudentFees({
      ...query,
      schoolId: this.resolveSchoolId(req.user, query.schoolId),
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
    return { success: true, ...result };
  }

  // Student fee summary endpoint for parent/student portal
  @Get('student-fees/:studentId')
  @Roles(
    Role.PARENT,
    Role.STUDENT,
    Role.ADMIN,
    Role.IT_MANAGER,
    Role.FINANCE,
    Role.REGISTRAR,
    Role.SUPER_ADMIN,
  )
  async getStudentFeeSummary(
    @Param('studentId') studentId: string,
    @Query('schoolId') schoolId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('termId') termId?: string,
    @Request() req?: any,
  ) {
    const effectiveSchoolId = this.resolveSchoolId(req?.user, schoolId);
    await this.studentFeeService.assertStudentFeeSummaryAccess(
      req?.user,
      effectiveSchoolId,
      studentId,
    );
    const result = await this.studentFeeService.getStudentFeeSummary(
      effectiveSchoolId,
      studentId,
      academicYearId,
      termId,
    );
    return { success: true, ...result };
  }
}
