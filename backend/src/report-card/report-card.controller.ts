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
  Inject,
} from '@nestjs/common';
import { ReportCardService, ReportCardStatus } from './report-card.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';

@Controller('report-cards')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReportCardController {
  constructor(
    private readonly reportCardService: ReportCardService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('generate')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.SUPER_ADMIN)
  @Permissions('report_card:create')
  async generateReportCard(
    @Request() req,
    @Body()
    body: {
      studentId: string;
      classId: string;
      sectionId: string;
      termId: string;
      termName: string;
    },
  ) {
    const academicYear = await this.getActiveAcademicYear(req.user.schoolId);
    return this.reportCardService.generateReportCard({
      schoolId: req.user.schoolId,
      studentId: body.studentId,
      classId: body.classId,
      sectionId: body.sectionId,
      academicYear,
      termId: body.termId,
      termName: body.termName,
      generatedById: req.user.id,
    });
  }

  @Post('bulk-generate')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:create')
  async bulkGenerate(
    @Request() req,
    @Body()
    body: {
      classId: string;
      sectionId: string;
      termId: string;
      termName: string;
    },
  ) {
    const academicYear = await this.getActiveAcademicYear(req.user.schoolId);
    return this.reportCardService.bulkGenerate({
      schoolId: req.user.schoolId,
      classId: body.classId,
      sectionId: body.sectionId,
      academicYear,
      termId: body.termId,
      termName: body.termName,
      generatedById: req.user.id,
    });
  }

  @Get()
  @Permissions('report_card:read')
  async getReportCards(
    @Request() req,
    @Query()
    query: {
      classId?: string;
      academicYear?: string;
      term?: string;
      status?: ReportCardStatus;
      studentId?: string;
    },
  ) {
    return this.reportCardService.getReportCards(req.user.schoolId, query);
  }

  @Get('publish-summary')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:read')
  async getPublishSummary(
    @Request() req,
    @Query() query: { academicYearId: string; termId: string },
  ) {
    return this.reportCardService.getPublishSummary(
      req.user.schoolId,
      query.academicYearId,
      query.termId,
    );
  }

  @Get('student/:studentId')
  @Permissions('report_card:read')
  async getStudentReportCards(
    @Request() req,
    @Param('studentId') studentId: string,
  ) {
    return this.reportCardService.getReportCards(req.user.schoolId, {
      studentId,
    });
  }

  @Get('class/:classId')
  @Permissions('report_card:read')
  async getClassReportCards(
    @Request() req,
    @Param('classId') classId: string,
    @Query() query: { academicYear?: string; term?: string },
  ) {
    return this.reportCardService.getReportCards(req.user.schoolId, {
      classId,
      academicYear: query.academicYear,
      term: query.term,
    });
  }

  @Get(':id')
  @Permissions('report_card:read')
  async getReportCardById(@Param('id') id: string) {
    return this.reportCardService.getReportCardById(id);
  }

  @Put(':id/remarks')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.SUPER_ADMIN)
  @Permissions('report_card:update')
  async updateRemarks(
    @Param('id') id: string,
    @Body()
    body: {
      teacherRemarks?: string;
      principalRemarks?: string;
      coCurricular?: string;
      behavior?: string;
    },
  ) {
    return this.reportCardService.updateRemarks(id, body);
  }

  @Put('publish')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:publish')
  async publishReportCards(@Body() body: { ids: string[] }) {
    return this.reportCardService.publishReportCards(body.ids);
  }

  @Post('publish/class')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:publish')
  async publishResultsForClass(
    @Request() req,
    @Body()
    body: {
      academicYearId: string;
      termId: string;
      classId: string;
      notifyStudents?: boolean;
      notifyParents?: boolean;
    },
  ) {
    return this.reportCardService.publishResultsForClass({
      schoolId: req.user.schoolId,
      academicYearId: body.academicYearId,
      termId: body.termId,
      classId: body.classId,
      notifyStudents: body.notifyStudents,
      notifyParents: body.notifyParents,
    });
  }

  @Put('unpublish')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:publish')
  async unpublishReportCards(@Body() body: { ids: string[] }) {
    return this.reportCardService.unpublishReportCards(body.ids);
  }

  @Post('calculate-ranks')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:update')
  async calculateRanks(
    @Body() body: { classId: string; academicYear: string; term: string },
  ) {
    return this.reportCardService.calculateRanks(
      body.classId,
      body.academicYear,
      body.term,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:delete')
  async deleteReportCard(@Param('id') id: string) {
    return this.reportCardService.deleteReportCard(id);
  }

  private async getActiveAcademicYear(schoolId: string): Promise<string> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { name: true },
    });
    return academicYear?.name || new Date().getFullYear().toString();
  }
}
