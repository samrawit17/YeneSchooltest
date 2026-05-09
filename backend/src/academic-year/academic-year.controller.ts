import {
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
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('academic-years')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  @Post()
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:create')
  async createAcademicYear(
    @Body() createDto: CreateAcademicYearDto,
    @Request() req: any,
  ) {
    // Use schoolId from request if not provided (for security)
    if (!createDto.schoolId && req.user.schoolId) {
      createDto.schoolId = req.user.schoolId;
    }
    return this.academicYearService.createAcademicYear(createDto);
  }

  @Get()
  @Roles(
    Role.ADMIN,
    Role.IT_MANAGER,
    Role.REGISTRAR,
    Role.FINANCE,
    Role.TEACHER,
    Role.STUDENT,
    Role.PARENT,
  )
  async getAcademicYears(
    @Query('schoolId') schoolId: string,
    @Request() req: any,
  ) {
    // Use schoolId from request if not provided
    const effectiveSchoolId = schoolId || req.user.schoolId;
    return this.academicYearService.getAcademicYears(effectiveSchoolId);
  }

  @Get('active')
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
    const effectiveSchoolId = schoolId || req.user.schoolId;
    return this.academicYearService.getActiveAcademicYear(effectiveSchoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  @Permissions('academic_year:read')
  async getAcademicYearById(@Param('id') id: string) {
    return this.academicYearService.getAcademicYearById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:update')
  async updateAcademicYear(
    @Param('id') id: string,
    @Body() updateDto: UpdateAcademicYearDto,
  ) {
    return this.academicYearService.updateAcademicYear(id, updateDto);
  }

  @Put(':id/activate')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:update')
  async activateAcademicYear(@Param('id') id: string) {
    return this.academicYearService.activateAcademicYear(id);
  }

  @Put(':id/curriculum-type')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:update')
  async updateCurriculumType(
    @Param('id') id: string,
    @Body() dto: { curriculumType: any },
  ) {
    return this.academicYearService.updateCurriculumType(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:delete')
  async deleteAcademicYear(@Param('id') id: string) {
    return this.academicYearService.deleteAcademicYear(id);
  }

  // ==================== TERM/PERIOD MANAGEMENT ====================

  /**
   * Get the current term for a school
   */
  @Get('terms/current')
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
    const effectiveSchoolId = schoolId || req.user.schoolId;
    return this.academicYearService.getCurrentTerm(effectiveSchoolId);
  }

  /**
   * Get all terms for a specific academic year
   */
  @Get(':id/terms')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER)
  async getTermsByAcademicYear(@Param('id') id: string) {
    const academicYear = await this.academicYearService.getAcademicYearById(id);
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
  ) {
    return this.academicYearService.createTerm(academicYearId, createDto);
  }

  /**
   * Get a specific term by ID
   */
  @Get('terms/:termId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER)
  async getTermById(@Param('termId') termId: string) {
    return this.academicYearService.getTermById(termId);
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
  ) {
    return this.academicYearService.updateTerm(termId, updateDto);
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
  ) {
    return this.academicYearService.lockTerm(termId, isLocked);
  }

  /**
   * Delete a term/period
   */
  @Delete('terms/:termId')
  @Roles(Role.ADMIN, Role.IT_MANAGER)
  @Permissions('academic_year:delete')
  async deleteTerm(@Param('termId') termId: string) {
    return this.academicYearService.deleteTerm(termId);
  }

  /**
   * Get period weights for an academic year
   */
  @Get(':id/period-weights')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER)
  async getPeriodWeights(@Param('id') id: string) {
    return this.academicYearService.getPeriodWeights(id);
  }

  /**
   * Validate period weights (check if they sum to 100%)
   */
  @Get(':id/validate-weights')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR)
  async validatePeriodWeights(@Param('id') id: string) {
    const isValid = await this.academicYearService.validatePeriodWeights(id);
    return {
      isValid,
      message: isValid ? 'Weights sum to 100%' : 'Weights do not sum to 100%',
    };
  }
}
