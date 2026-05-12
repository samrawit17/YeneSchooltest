import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReportCardService } from './report-card.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('promotion')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PromotionController {
  constructor(
    private readonly reportCardService: ReportCardService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('candidates/:classId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('promotion:read')
  async getPromotionCandidates(
    @Request() req,
    @Param('classId') classId: string,
    @Query() query: { academicYear?: string },
  ) {
    const academicYear =
      query.academicYear ||
      (await this.getActiveAcademicYear(req.user.schoolId));
    return this.reportCardService.getPromotionCandidates(
      classId,
      academicYear,
      {
        minAverageGrade: 50,
        minAttendance: 75,
        allowFailedSubjects: 2,
      },
    );
  }

  @Get('next-classes/:classId')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.SUPER_ADMIN)
  @Permissions('promotion:read')
  async getNextClassOptions(
    @Param('classId') classId: string,
    @Query() query: { toAcademicYear?: string },
  ) {
    return this.reportCardService.getNextClassOptions(
      classId,
      query.toAcademicYear,
    );
  }

  @Post('single')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('promotion:create')
  async promoteStudent(
    @Request() req,
    @Body()
    body: {
      studentId: string;
      fromClassId: string;
      toClassId?: string | null;
      fromAcademicYear: string;
      toAcademicYear: string;
    },
  ) {
    return this.reportCardService.promoteStudent({
      schoolId: req.user.schoolId,
      studentId: body.studentId,
      fromClassId: body.fromClassId,
      fromAcademicYear: body.fromAcademicYear,
      toClassId: body.toClassId,
      toAcademicYear: body.toAcademicYear,
      status: 'PROMOTED',
    });
  }

  @Post('bulk')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('promotion:create')
  async bulkPromote(
    @Request() req,
    @Body()
    body: {
      fromClassId: string;
      toClassId?: string | null;
      fromAcademicYear: string;
      toAcademicYear: string;
      studentIds: string[];
      promoteAll: boolean;
      minAverageGrade?: number;
      minAttendance?: number;
    },
  ) {
    return this.reportCardService.bulkPromoteStudents({
      schoolId: req.user.schoolId,
      fromClassId: body.fromClassId,
      toClassId: body.toClassId,
      fromAcademicYear: body.fromAcademicYear,
      toAcademicYear: body.toAcademicYear,
      studentIds: body.studentIds || [],
      promoteAll: body.promoteAll || false,
      minAverageGrade: body.minAverageGrade || 50,
      minAttendance: body.minAttendance || 75,
    });
  }

  @Get('history')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('promotion:read')
  async getPromotionHistory(
    @Request() req,
    @Query() query: { academicYear?: string; classId?: string; status?: string },
  ) {
    return this.reportCardService.getPromotionHistory(req.user.schoolId, query);
  }

  private async getActiveAcademicYear(schoolId: string): Promise<string> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { name: true },
    });
    return academicYear?.name || new Date().getFullYear().toString();
  }
}
