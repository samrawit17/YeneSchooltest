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
import { TermService } from './term.service';
import type { CreateTermDto, UpdateTermDto } from './term.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('terms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TermController {
  constructor(private readonly termService: TermService) {}

  @Post()
  @Roles(Role.ADMIN)
  @Permissions('term:create')
  async createTerm(@Body() createDto: CreateTermDto) {
    return this.termService.createTerm(createDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.TEACHER)
  @Permissions('term:read')
  async getTermsByAcademicYear(
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.termService.getTermsByAcademicYear(academicYearId);
  }

  @Get('current')
  @Roles(
    Role.ADMIN,
    Role.REGISTRAR,
    Role.TEACHER,
    Role.STUDENT,
    Role.PARENT,
    Role.FINANCE,
    Role.HR,
    Role.SUPER_ADMIN,
  )
  async getCurrentTerm(
    @Query('schoolId') schoolId: string,
    @Request() req: any,
  ) {
    const effectiveSchoolId = schoolId || req.user.schoolId;
    return this.termService.getCurrentTerm(effectiveSchoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @Permissions('term:read')
  async getTermById(@Param('id') id: string) {
    return this.termService.getTermById(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @Permissions('term:update')
  async updateTerm(@Param('id') id: string, @Body() updateDto: UpdateTermDto) {
    return this.termService.updateTerm(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Permissions('term:delete')
  async deleteTerm(@Param('id') id: string) {
    return this.termService.deleteTerm(id);
  }
}
