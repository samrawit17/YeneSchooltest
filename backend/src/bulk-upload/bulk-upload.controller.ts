import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { BulkUploadService } from './bulk-upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/types/role.enum';
import { AuditService } from '../audit/audit.service';
import { RequiresFeature } from '../subscription/decorators/subscription.decorator';
import { SubscriptionGuard } from '../subscription/guards/subscription.guard';

export interface BulkUploadDto {
  academicYear?: string;
}

const MAX_STUDENT_BULK_UPLOAD_ROWS = 50;
const MAX_STAFF_BULK_UPLOAD_ROWS = 100;
const ALLOWED_CSV_MIME_TYPES = new Set([
  'text/csv',
  'text/plain',
  'application/csv',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

@Controller('bulk-upload')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionGuard)
@RequiresFeature('BULK_OPERATIONS')
export class BulkUploadController {
  constructor(
    private readonly bulkUploadService: BulkUploadService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Upload and process bulk STAFF from CSV file
   * POST /api/bulk-upload/staff
   */
  @Post('staff')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadBulkStaff(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: BulkUploadDto,
    @Request() req: any,
  ) {
    try {
      const content = this.readValidatedCsvFile(file, MAX_STAFF_BULK_UPLOAD_ROWS);
      const records = this.bulkUploadService.parseCSV(content).map((record) => ({
        ...record,
        email: undefined,
        student_email: undefined,
      }));
      this.assertRowLimit(records.length, MAX_STAFF_BULK_UPLOAD_ROWS, 'staff');

      const result = await this.bulkUploadService.processBulkStaff(
        req.user.schoolId,
        req.user.id,
        records,
        dto.academicYear,
      );

      await this.auditService.log({
        actor: req.user,
        action: 'BULK_IMPORT',
        entityType: 'STAFF',
        schoolId: req.user.schoolId,
        metadata: this.buildBulkUploadAuditMetadata(file, records.length, result),
        request: this.auditService.fromRequest(req),
      });

      return result;
    } catch (error) {
      await this.auditService.log({
        actor: req.user,
        action: 'BULK_IMPORT_REJECTED',
        entityType: 'STAFF',
        schoolId: req.user.schoolId,
        metadata: {
          fileName: file?.originalname,
          mimeType: file?.mimetype,
          size: file?.size,
          reason: error instanceof Error ? error.message : String(error),
        },
        request: this.auditService.fromRequest(req),
      });
      throw error;
    }
  }

  /**
   * Upload and process bulk STUDENTS with auto-assignment from CSV file
   * POST /api/bulk-upload/students-auto
   */
  @Post('students-auto')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadBulkStudentsAuto(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: BulkUploadDto,
    @Request() req: any,
  ) {
    try {
      const content = this.readValidatedCsvFile(file, MAX_STUDENT_BULK_UPLOAD_ROWS);
      const records = this.bulkUploadService.parseCSV(content);
      this.assertRowLimit(records.length, MAX_STUDENT_BULK_UPLOAD_ROWS, 'student');

      const result =
        await this.bulkUploadService.processBulkStudentsWithAssignment(
          req.user.schoolId,
          req.user.id,
          records,
          dto.academicYear,
        );

      await this.auditService.log({
        actor: req.user,
        action: 'BULK_IMPORT',
        entityType: 'STUDENT',
        schoolId: req.user.schoolId,
        metadata: this.buildBulkUploadAuditMetadata(file, records.length, result),
        request: this.auditService.fromRequest(req),
      });

      return result;
    } catch (error) {
      await this.auditService.log({
        actor: req.user,
        action: 'BULK_IMPORT_REJECTED',
        entityType: 'STUDENT',
        schoolId: req.user.schoolId,
        metadata: {
          fileName: file?.originalname,
          mimeType: file?.mimetype,
          size: file?.size,
          reason: error instanceof Error ? error.message : String(error),
        },
        request: this.auditService.fromRequest(req),
      });
      throw error;
    }
  }

  /**
   * Download credential report as CSV
   * POST /api/bulk-upload/report
   */
  @Post('report')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async generateReport(
    @Body() body: { credentials: Array<any> },
    @Res() res: Response,
  ) {
    if (!body.credentials || body.credentials.length === 0) {
      throw new BadRequestException('No credentials provided for report');
    }

    const csv = this.bulkUploadService.generateCredentialReport(
      body.credentials,
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="credentials_${timestamp}.csv"`,
    );
    res.send(Buffer.from(csv, 'utf-8'));
  }

  /**
   * Get sample CSV template
   * GET /api/bulk-upload/template
   */
  @Get('template')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  getTemplate(@Query('type') type: string = 'student', @Res() res: Response) {
    let template: string;
    if (type === 'staff') {
      template = `full_name,email,phone,role\nAli Ahmed,ali@example.com,0911111111,teacher\nAbebe Tesfaye,abebe@example.com,0922222222,finance\nRegistrar User,reg@example.com,0944444444,registrar`;
    } else if (type === 'students-auto') {
      template = `first_name,middle_name,last_name,fan,student_code,roll_number,phone,gender,mother_name,mother_phone,current_class,section,stream,parent_name,parent_phone,relation\nStudentFirstName,MiddleName,LastName,123456789012,STU-001,1,0911111111,MALE,MotherFullName,0933333333,11,A,NATURAL,ParentFullName,0922222222,Father`;
    } else {
      template = `first_name,middle_name,last_name,email,phone,gender,current_class,gender,next_class\nAli,Ahmed,Tesfaye,,0911111111,MALE,9,10`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bulk_upload_${type}_template.csv"`,
    );
    res.send(Buffer.from(template, 'utf-8'));
  }

  /**
   * Get pending credentials for the school
   */
  @Get('credentials')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async getPendingCredentials(
    @Request() req: any,
    @Query('includeSent') includeSent?: string,
    @Query('role') role?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.bulkUploadService.getPendingCredentials(req.user.schoolId, {
      includeSent: includeSent === 'true',
      role,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  /**
   * Mark a credential as sent
   */
  @Post('credentials/:id/mark-sent')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async markCredentialSent(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { sentVia?: string },
  ) {
    const credential = await this.bulkUploadService.markCredentialSent(
      req.user.schoolId,
      id,
      body.sentVia || 'EMAIL',
    );
    return {
      status: 'success',
      message: 'Credential marked as sent',
      credential,
    };
  }

  /**
   * Delete a pending credential
   */
  @Post('credentials/:id/delete')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async deleteCredential(@Request() req: any, @Param('id') id: string) {
    await this.bulkUploadService.deletePendingCredential(id, req.user.schoolId);
    return { status: 'success', message: 'Credential deleted successfully' };
  }

  /**
   * Export credentials as CSV
   */
  @Get('credentials/export')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async exportCredentials(
    @Request() req: any,
    @Res() res: Response,
    @Query('includeSent') includeSent?: string,
    @Query('role') role?: string,
  ) {
    const csv = await this.bulkUploadService.exportPendingCredentials(
      req.user.schoolId,
      {
        includeSent: includeSent === 'true',
        role,
      },
    );
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="credentials_export_${timestamp}.csv"`,
    );
    res.send(Buffer.from(csv, 'utf-8'));
  }

  /**
   * Rebalance students in a specific grade across sections
   * POST /api/bulk-upload/rebalance
   */
  @Post('rebalance')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.REGISTRAR)
  async rebalanceSections(
    @Body() dto: { gradeName: string; academicYear?: string },
    @Request() req: any,
  ) {
    if (!dto.gradeName) throw new BadRequestException('Grade name is required');
    return this.bulkUploadService.rebalanceGradeSections(
      req.user.schoolId,
      dto.gradeName,
      dto.academicYear,
    );
  }

  private readValidatedCsvFile(
    file: Express.Multer.File | undefined,
    maxRows: number,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!file.buffer?.length) {
      throw new BadRequestException('Uploaded CSV file is empty');
    }

    const fileName = String(file.originalname || '').toLowerCase();
    if (!fileName.endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are accepted for bulk upload');
    }

    if (file.mimetype && !ALLOWED_CSV_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(`Unsupported CSV file type: ${file.mimetype}`);
    }

    if (file.buffer.includes(0)) {
      throw new BadRequestException('Uploaded file is not a valid text CSV file');
    }

    const content = file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) {
      throw new BadRequestException('CSV file must have a header row and at least one data row');
    }
    if (lines.length - 1 > maxRows) {
      throw new BadRequestException(
        `Bulk upload is limited to ${maxRows} rows per upload. Your file has ${lines.length - 1} rows.`,
      );
    }

    return content;
  }

  private assertRowLimit(count: number, maxRows: number, label: string) {
    if (count > maxRows) {
      throw new BadRequestException(
        `Bulk ${label} upload is limited to ${maxRows} records per upload. Your file has ${count} records.`,
      );
    }
  }

  private buildBulkUploadAuditMetadata(
    file: Express.Multer.File,
    recordCount: number,
    result: any,
  ) {
    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      recordCount,
      status: result?.status,
      successfulCount: result?.successfulCount,
      failedCount: result?.failedCount,
      skippedCount: result?.skippedCount,
    };
  }
}
