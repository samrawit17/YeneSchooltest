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
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
      academicYearId?: string;
      termId: string;
      termName: string;
    },
  ) {
    const academicYear = body.academicYearId
      ? await this.getAcademicYearName(req.user.schoolId, body.academicYearId)
      : await this.getActiveAcademicYear(req.user.schoolId);
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
      academicYearId?: string;
      termId: string;
      termName: string;
    },
  ) {
    const academicYear = body.academicYearId
      ? await this.getAcademicYearName(req.user.schoolId, body.academicYearId)
      : await this.getActiveAcademicYear(req.user.schoolId);
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

  @Get('student/published')
  @Roles(Role.STUDENT)
  async getMyPublishedReportCards(
    @Request() req,
    @Query() query: { academicYear?: string; term?: string },
  ) {
    return this.reportCardService.getPublishedReportCardsForStudent(
      req.user.schoolId,
      req.user.id,
      {
        academicYear: query.academicYear,
        term: query.term,
      },
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

  @Get('parent/:childId/published')
  @Roles(Role.PARENT)
  async getPublishedReportCardsForParent(
    @Request() req,
    @Param('childId') childId: string,
    @Query() query: { academicYear?: string; term?: string },
  ) {
    return this.reportCardService.getPublishedReportCardsForParent(
      req.user.id,
      childId,
      {
        academicYear: query.academicYear,
        term: query.term,
      },
    );
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

  @Get('certificate-template')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:read')
  async getCertificateTemplate(@Request() req) {
    return this.reportCardService.getCertificateTemplate(req.user.schoolId);
  }

  @Put('certificate-template')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:update')
  async saveCertificateTemplate(@Request() req, @Body() body: { template: Record<string, any> }) {
    return this.reportCardService.saveCertificateTemplate(
      req.user.schoolId,
      body.template || {},
    );
  }

  @Post('certificate-template/upload')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:update')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCertificateTemplate(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
      }
      const url = await this.reportCardService.uploadCertificateTemplate(
        req.user.schoolId,
        file,
      );
      return { url };
    } catch (error) {
      throw new HttpException(
        'Failed to upload certificate template: ' + error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/certificate')
  @Permissions('report_card:read')
  async getCertificatePayload(@Request() req, @Param('id') id: string) {
    return this.reportCardService.getCertificatePayload(id, req.user.schoolId);
  }

  @Get(':id/certificate-pdf')
  @Permissions('report_card:read')
  async generateCertificatePdf(
    @Request() req,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.reportCardService.generateCertificatePdf(req.user.schoolId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${id}.pdf"`);
    res.send(pdf);
  }

  @Post('certificate-pdf/bulk')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:read')
  async generateCertificateBulkZip(
    @Request() req,
    @Body() body: { reportCardIds: string[] },
    @Res() res: Response,
  ) {
    const zip = await this.reportCardService.generateCertificateBulkZip(
      req.user.schoolId,
      body.reportCardIds || [],
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="certificates.zip"');
    res.send(zip);
  }

  @Get(':id')
  @Permissions('report_card:read')
  async getReportCardById(@Request() req, @Param('id') id: string) {
    return this.reportCardService.getReportCardById(id, req.user.schoolId);
  }

  @Put(':id/remarks')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.TEACHER, Role.SUPER_ADMIN)
  @Permissions('report_card:update')
  async updateRemarks(
    @Request() req,
    @Param('id') id: string,
    @Body()
    body: {
      teacherRemarks?: string;
      principalRemarks?: string;
      coCurricular?: string;
      behavior?: string;
    },
  ) {
    return this.reportCardService.updateRemarks(id, req.user.schoolId, body);
  }

  @Put('publish')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:publish')
  async publishReportCards(@Request() req, @Body() body: { ids: string[] }) {
    return this.reportCardService.publishReportCards(body.ids, req.user.schoolId);
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
  async unpublishReportCards(@Request() req, @Body() body: { ids: string[] }) {
    return this.reportCardService.unpublishReportCards(
      body.ids,
      req.user.schoolId,
    );
  }

  @Post('calculate-ranks')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:update')
  async calculateRanks(
    @Request() req,
    @Body() body: { classId: string; academicYear: string; term: string },
  ) {
    return this.reportCardService.calculateRanks(
      req.user.schoolId,
      body.classId,
      body.academicYear,
      body.term,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:delete')
  async deleteReportCard(@Request() req, @Param('id') id: string) {
    return this.reportCardService.deleteReportCard(id, req.user.schoolId);
  }

  private async getActiveAcademicYear(schoolId: string): Promise<string> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { name: true },
    });
    return academicYear?.name || new Date().getFullYear().toString();
  }

  private async getAcademicYearName(
    schoolId: string,
    academicYearId: string,
  ): Promise<string> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, id: academicYearId },
      select: { name: true },
    });

    if (!academicYear?.name) {
      throw new HttpException('Academic year not found', HttpStatus.BAD_REQUEST);
    }

    return academicYear.name;
  }
}
