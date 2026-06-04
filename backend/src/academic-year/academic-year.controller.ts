import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';
import type {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateTermDto,
  UpdateTermDto,
} from './academic-year.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  AllowSuperAdminMixedRole,
  Roles,
} from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  private resolveSchoolId(user: any, requestedSchoolId?: string) {
    return user?.role === Role.SUPER_ADMIN
      ? requestedSchoolId || user?.schoolId
      : user?.schoolId;
  }

  private requireSchoolId(user: any, requestedSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, requestedSchoolId);
    if (!schoolId) {
      throw new BadRequestException('schoolId is required');
    }
    return schoolId;
  }

  @Post()
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:create')
  async createAcademicYear(
    @Body() createDto: CreateAcademicYearDto,
    @Request() req: any,
  ) {
    return this.academicYearService.createAcademicYear({
      ...createDto,
      schoolId: this.requireSchoolId(req.user, createDto.schoolId),
    });
  }

  @Get()
  @AllowSuperAdminMixedRole()
  @Roles(
    Role.ADMIN,
    Role.IT_MANAGER,
    Role.REGISTRAR,
    Role.FINANCE,
    Role.TEACHER,
    Role.STUDENT,
    Role.PARENT,
    Role.SUPER_ADMIN,
  )
  async getAcademicYears(
    @Query('schoolId') schoolId: string,
    @Request() req: any,
  ) {
    const effectiveSchoolId = this.requireSchoolId(req.user, schoolId);
    return this.academicYearService.getAcademicYears(effectiveSchoolId);
  }

  @Get('active')
  @AllowSuperAdminMixedRole()
  @Roles(
    Role.ADMIN,
    Role.IT_MANAGER,
    Role.REGISTRAR,
    Role.TEACHER,
    Role.STUDENT,
    Role.PARENT,
    Role.FINANCE,
    Role.SUPER_ADMIN,
  )
  async getActiveAcademicYear(
    @Query('schoolId') schoolId: string,
    @Request() req: any,
  ) {
    const effectiveSchoolId = this.requireSchoolId(req.user, schoolId);
    return this.academicYearService.getActiveAcademicYear(effectiveSchoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('academic_year:read')
  async getAcademicYearById(@Param('id') id: string, @Request() req: any) {
    return this.academicYearService.getAcademicYearById(
      id,
      this.requireSchoolId(req.user),
    );
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:update')
  async updateAcademicYear(
    @Param('id') id: string,
    @Body() updateDto: UpdateAcademicYearDto,
    @Request() req: any,
  ) {
    return this.academicYearService.updateAcademicYear(
      id,
      updateDto,
      this.requireSchoolId(req.user),
    );
  }

  @Put(':id/activate')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:update')
  async activateAcademicYear(@Param('id') id: string, @Request() req: any) {
    return this.academicYearService.activateAcademicYear(
      id,
      this.requireSchoolId(req.user),
    );
  }

  @Put(':id/curriculum-type')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:update')
  async updateCurriculumType(
    @Param('id') id: string,
    @Body() dto: { curriculumType: any },
    @Request() req: any,
  ) {
    return this.academicYearService.updateCurriculumType(
      id,
      dto,
      this.requireSchoolId(req.user),
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:delete')
  async deleteAcademicYear(@Param('id') id: string, @Request() req: any) {
    return this.academicYearService.deleteAcademicYear(
      id,
      this.requireSchoolId(req.user),
    );
  }

  // ==================== TERM/PERIOD MANAGEMENT ====================

  /**
   * Get the current term for a school
   */
  @Get('terms/current')
  @AllowSuperAdminMixedRole()
  @Roles(
    Role.ADMIN,
    Role.IT_MANAGER,
    Role.REGISTRAR,
    Role.TEACHER,
    Role.STUDENT,
    Role.PARENT,
    Role.FINANCE,
    Role.SUPER_ADMIN,
  )
  async getCurrentTerm(
    @Query('schoolId') schoolId: string,
    @Request() req: any,
  ) {
    const effectiveSchoolId = this.requireSchoolId(req.user, schoolId);
    return this.academicYearService.getCurrentTerm(effectiveSchoolId);
  }

  /**
   * Get all terms for a specific academic year
   */
  @Get(':id/terms')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER)
  async getTermsByAcademicYear(@Param('id') id: string, @Request() req: any) {
    const academicYear = await this.academicYearService.getAcademicYearById(
      id,
      this.requireSchoolId(req.user),
    );
    return academicYear.terms;
  }

  /**
   * Create a custom term/period for an academic year
   */
  @Post(':id/terms')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:update')
  async createTerm(
    @Param('id') academicYearId: string,
    @Body() createDto: CreateTermDto,
    @Request() req: any,
  ) {
    return this.academicYearService.createTerm(
      academicYearId,
      createDto,
      this.requireSchoolId(req.user),
    );
  }

  /**
   * Get a specific term by ID
   */
  @Get('terms/:termId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER)
  async getTermById(@Param('termId') termId: string, @Request() req: any) {
    return this.academicYearService.getTermById(
      termId,
      this.requireSchoolId(req.user),
    );
  }

  /**
   * Update a term/period
   */
  @Put('terms/:termId')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:update')
  async updateTerm(
    @Param('termId') termId: string,
    @Body() updateDto: UpdateTermDto,
    @Request() req: any,
  ) {
    return this.academicYearService.updateTerm(
      termId,
      updateDto,
      this.requireSchoolId(req.user),
    );
  }

  /**
   * Lock or unlock a term/period
   */
  @Put('terms/:termId/lock')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('academic_year:update')
  async lockTerm(
    @Param('termId') termId: string,
    @Body('isLocked') isLocked: boolean,
    @Request() req: any,
  ) {
    return this.academicYearService.lockTerm(
      termId,
      isLocked,
      this.requireSchoolId(req.user),
    );
  }

  /**
   * Delete a term/period
   */
  @Delete('terms/:termId')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:delete')
  async deleteTerm(@Param('termId') termId: string, @Request() req: any) {
    return this.academicYearService.deleteTerm(
      termId,
      this.requireSchoolId(req.user),
    );
  }

  /**
   * Get period weights for an academic year
   */
  @Get(':id/period-weights')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER)
  async getPeriodWeights(@Param('id') id: string, @Request() req: any) {
    return this.academicYearService.getPeriodWeights(
      id,
      this.requireSchoolId(req.user),
    );
  }

  /**
   * Validate period weights (check if they sum to 100%)
   */
  @Get(':id/validate-weights')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  async validatePeriodWeights(@Param('id') id: string, @Request() req: any) {
    const isValid = await this.academicYearService.validatePeriodWeights(
      id,
      this.requireSchoolId(req.user),
    );
    return {
      isValid,
      message: isValid ? 'Weights sum to 100%' : 'Weights do not sum to 100%',
    };
  }
}
