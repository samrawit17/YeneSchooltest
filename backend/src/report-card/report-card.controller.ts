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
  Res,
  HttpException,
  HttpStatus,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
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
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';

const CERTIFICATE_WATERMARK_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function certificateWatermarkFileFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (CERTIFICATE_WATERMARK_FILE_TYPES.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new BadRequestException('Watermark must be a JPG, PNG, or WEBP image'), false);
}

@Controller('report-cards')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, SubscriptionGuard)
@RequiresFeature('REPORT_CARDS')
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

  @Get('parent-presentation')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:read')
  async getParentPresentationReport(
    @Request() req,
    @Query()
    query: {
      academicYearId: string;
      fromTermId: string;
      toTermId: string;
      classId?: string;
    },
  ) {
    return this.reportCardService.getParentPresentationReport(req.user.schoolId, query);
  }

  @Get('parent-presentation/pdf')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:read')
  async downloadParentPresentationPdf(
    @Request() req,
    @Query()
    query: {
      academicYearId: string;
      fromTermId: string;
      toTermId: string;
      classId?: string;
    },
    @Res() res: Response,
  ) {
    const pdf = await this.reportCardService.generateParentPresentationPdf(req.user.schoolId, query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="term-performance-brief.pdf"');
    res.send(pdf);
  }

  @Get('parent-presentation/excel')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:read')
  async downloadParentPresentationExcel(
    @Request() req,
    @Query()
    query: {
      academicYearId: string;
      fromTermId: string;
      toTermId: string;
      classId?: string;
    },
    @Res() res: Response,
  ) {
    const excel = await this.reportCardService.generateParentPresentationExcel(req.user.schoolId, query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="term-performance-brief.xlsx"');
    res.send(excel);
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
  @RequiresFeature('CERTIFICATE_TEMPLATES')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:read')
  async getCertificateTemplate(@Request() req) {
    return this.reportCardService.getCertificateTemplate(req.user.schoolId);
  }

  @Put('certificate-template')
  @RequiresFeature('CERTIFICATE_TEMPLATES')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:update')
  async saveCertificateTemplate(@Request() req, @Body() body: { template: Record<string, any> }) {
    return this.reportCardService.saveCertificateTemplate(
      req.user.schoolId,
      body.template || {},
    );
  }

  @Post('certificate-template/watermark')
  @RequiresFeature('CERTIFICATE_TEMPLATES')
  @Roles(Role.ADMIN, Role.IT_MANAGER, Role.REGISTRAR, Role.SUPER_ADMIN)
  @Permissions('report_card:update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: certificateWatermarkFileFilter,
    }),
  )
  async uploadCertificateWatermark(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Watermark image is required');
    }
    const url = await this.reportCardService.uploadCertificateWatermark(req.user.schoolId, file);
    return { url };
  }

  @Get(':id/certificate')
  @RequiresFeature('CERTIFICATE_TEMPLATES')
  @Permissions('report_card:read')
  async getCertificatePayload(@Request() req, @Param('id') id: string) {
    return this.reportCardService.getCertificatePayload(id, req.user.schoolId);
  }

  @Get(':id/certificate-pdf')
  @RequiresFeature('CERTIFICATE_TEMPLATES')
  @Permissions('report_card:read')
  async generateCertificatePdf(
    @Request() req,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const [pdf, fileName] = await Promise.all([
      this.reportCardService.generateCertificatePdf(req.user.schoolId, id),
      this.reportCardService.getCertificateDownloadFileName(req.user.schoolId, id),
    ]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
    res.send(pdf);
  }

  @Post('certificate-pdf/bulk')
  @RequiresFeature('CERTIFICATE_TEMPLATES')
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
  @RequiresFeature('STUDENT_RANKINGS')
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
