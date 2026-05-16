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

export interface BulkUploadDto {
  academicYear?: string;
}

const MAX_STUDENT_BULK_UPLOAD_ROWS = 50;

@Controller('bulk-upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) {}

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
    if (!file) throw new BadRequestException('No file uploaded');
    const content = file.buffer.toString('utf-8');
    const records = this.bulkUploadService.parseCSV(content).map((record) => ({
      ...record,
      email: undefined,
      student_email: undefined,
    }));

    const result = await this.bulkUploadService.processBulkStaff(
      req.user.schoolId,
      req.user.id,
      records,
      dto.academicYear,
    );

    return result;
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
    if (!file) throw new BadRequestException('No file uploaded');
    const content = file.buffer.toString('utf-8');
    const records = this.bulkUploadService.parseCSV(content);
    if (records.length > MAX_STUDENT_BULK_UPLOAD_ROWS) {
      throw new BadRequestException(
        `Bulk student upload is limited to ${MAX_STUDENT_BULK_UPLOAD_ROWS} students per upload. Your file has ${records.length} students.`,
      );
    }

    const result =
      await this.bulkUploadService.processBulkStudentsWithAssignment(
        req.user.schoolId,
        req.user.id,
        records,
        dto.academicYear,
      );

    return result;
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
      template = `first_name,middle_name,last_name,student_code,roll_number,phone,gender,current_class,section,parent_name,parent_phone,relation\nStudentFirstName,MiddleName,LastName,STU-001,1,0911111111,MALE,9,A,ParentFullName,0922222222,Father`;
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
}
