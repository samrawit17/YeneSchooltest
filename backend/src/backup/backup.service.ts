import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { spawn } from 'child_process';
import * as archiver from 'archiver';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../core/events/event-bus.service';

export type SchoolBackupType =
  | 'FULL_SCHOOL'
  | 'STAFF'
  | 'STUDENTS'
  | 'ACADEMICS'
  | 'EXAMS_MARKS'
  | 'CERTIFICATES'
  | 'DOCUMENTS'
  | 'FINANCE';

const SCHOOL_BACKUP_TYPES: SchoolBackupType[] = [
  'FULL_SCHOOL',
  'STAFF',
  'STUDENTS',
  'ACADEMICS',
  'EXAMS_MARKS',
  'CERTIFICATES',
  'DOCUMENTS',
  'FINANCE',
];

interface BackupArtifact {
  tempDir: string;
  zipPath: string;
  fileName: string;
}

@Injectable()
export class BackupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  getSchoolBackupTypes() {
    return [
      { value: 'FULL_SCHOOL', label: 'Full school backup' },
      { value: 'STUDENTS', label: 'Students, parents, and class enrollment' },
      { value: 'EXAMS_MARKS', label: 'Exams, marks, grades, and report cards' },
      { value: 'CERTIFICATES', label: 'Certificates, report cards, and templates' },
      { value: 'DOCUMENTS', label: 'Documents, lessons, and uploaded learning files' },
      { value: 'FINANCE', label: 'Fees, payments, receipts, and balances' },
      { value: 'STAFF', label: 'Staff, admins, teachers, and departments' },
      { value: 'ACADEMICS', label: 'Classes, sections, subjects, and academic years' },
    ];
  }

  async createPlatformBackup(): Promise<BackupArtifact> {
    const databaseUrl =
      process.env.DIRECT_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.DATABASE_POOL_URL;

    if (!databaseUrl) {
      throw new ServiceUnavailableException('Database backup is not configured: DATABASE_URL is missing');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sms-backup-'));
    const dbDumpPath = path.join(tempDir, 'database.sql');
    const manifestPath = path.join(tempDir, 'manifest.json');
    const zipPath = path.join(tempDir, `sms-platform-backup-${timestamp}.zip`);

    try {
      await this.dumpDatabase(databaseUrl, dbDumpPath);

      const uploadsPath = this.resolveUploadsPath();
      const manifest = {
        generatedAt: new Date().toISOString(),
        contents: {
          database: 'database.sql',
          uploads: uploadsPath.exists ? 'uploads/' : null,
        },
        notes: [
          'Restore database.sql into a compatible PostgreSQL database.',
          'Copy uploads/ back to the backend public uploads directory when restoring files.',
          'Secrets and environment variables are intentionally not included.',
        ],
      };
      await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      await this.createZip(zipPath, dbDumpPath, manifestPath, uploadsPath.path, uploadsPath.exists);

      const fileName = path.basename(zipPath);
      void this.eventBus.emit('backup.downloaded', {
        backupType: 'PLATFORM',
        fileName,
      });

      return {
        tempDir,
        zipPath,
        fileName,
      };
    } catch (error) {
      await this.cleanupBackup(tempDir);
      throw error;
    }
  }

  async createSchoolBackup(schoolId: string, type: SchoolBackupType): Promise<BackupArtifact> {
    if (!SCHOOL_BACKUP_TYPES.includes(type)) {
      throw new BadRequestException('Unsupported backup type');
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, code: true },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeSchoolName = this.toSafeFileName(school.code || school.name || school.id);
    const safeType = type.toLowerCase().replace(/_/g, '-');
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sms-school-backup-'));
    const zipPath = path.join(tempDir, `sms-${safeSchoolName}-${safeType}-${timestamp}.zip`);

    try {
      const files = await this.buildSchoolBackupFiles(schoolId, type);
      const manifest = {
        generatedAt: new Date().toISOString(),
        school,
        type,
        format: 'json',
        files: files.map((file) => file.name),
        notes: [
          'This is an application-level export for one school and selected data category.',
          'Use the full platform backup for complete disaster recovery.',
          'Secrets and environment variables are intentionally not included.',
        ],
      };

      await this.createJsonZip(zipPath, [
        { name: 'manifest.json', data: manifest },
        ...files,
      ]);

      const fileName = path.basename(zipPath);
      void this.eventBus.emit('backup.downloaded', {
        schoolId,
        backupType: type,
        fileName,
      });

      return { tempDir, zipPath, fileName };
    } catch (error) {
      await this.cleanupBackup(tempDir);
      throw error;
    }
  }

  async cleanupBackup(tempDir: string) {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }

  private dumpDatabase(databaseUrl: string, outputPath: string): Promise<void> {
    const pgDumpCommand = process.env.BACKUP_PG_DUMP_COMMAND || 'pg_dump';
    const args = [
      '--no-owner',
      '--no-privileges',
      '--format=plain',
      '--file',
      outputPath,
      databaseUrl,
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(pgDumpCommand, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          reject(
            new ServiceUnavailableException(
              'Database backup failed: pg_dump is not installed in the backend runtime',
            ),
          );
          return;
        }
        reject(new ServiceUnavailableException(`Database backup failed: ${error.message}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new ServiceUnavailableException(
            `Database backup failed with pg_dump exit code ${code}: ${stderr.trim() || 'no error output'}`,
          ),
        );
      });
    });
  }

  private resolveUploadsPath() {
    const configured = process.env.UPLOADS_DIR;
    const uploadsPath = configured
      ? path.resolve(configured)
      : path.join(process.cwd(), 'public', 'uploads');

    return {
      path: uploadsPath,
      exists: fs.existsSync(uploadsPath),
    };
  }

  private createZip(
    zipPath: string,
    dbDumpPath: string,
    manifestPath: string,
    uploadsPath: string,
    uploadsExists: boolean,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = this.createZipArchive();

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.file(dbDumpPath, { name: 'database.sql' });
      archive.file(manifestPath, { name: 'manifest.json' });

      if (uploadsExists) {
        archive.directory(uploadsPath, 'uploads');
      }

      void archive.finalize();
    });
  }

  private async buildSchoolBackupFiles(schoolId: string, type: SchoolBackupType) {
    const files: Array<{ name: string; data: unknown }> = [];

    if (type === 'FULL_SCHOOL' || type === 'ACADEMICS') {
      files.push({ name: 'academics.json', data: await this.getAcademicsData(schoolId) });
    }

    if (type === 'FULL_SCHOOL' || type === 'STUDENTS') {
      files.push({ name: 'students.json', data: await this.getStudentsData(schoolId) });
    }

    if (type === 'FULL_SCHOOL' || type === 'STAFF') {
      files.push({ name: 'staff.json', data: await this.getStaffData(schoolId) });
    }

    if (type === 'FULL_SCHOOL' || type === 'EXAMS_MARKS') {
      files.push({ name: 'exams-and-marks.json', data: await this.getExamsAndMarksData(schoolId) });
    }

    if (type === 'FULL_SCHOOL' || type === 'CERTIFICATES') {
      files.push({ name: 'certificates-and-report-cards.json', data: await this.getCertificatesData(schoolId) });
    }

    if (type === 'FULL_SCHOOL' || type === 'DOCUMENTS') {
      files.push({ name: 'documents-and-files.json', data: await this.getDocumentsData(schoolId) });
    }

    if (type === 'FULL_SCHOOL' || type === 'FINANCE') {
      files.push({ name: 'finance.json', data: await this.getFinanceData(schoolId) });
    }

    if (type === 'FULL_SCHOOL') {
      files.push({ name: 'school-profile-and-settings.json', data: await this.getSchoolSettingsData(schoolId) });
    }

    return files;
  }

  private async getAcademicsData(schoolId: string) {
    const classes = await this.prisma.class.findMany({ where: { schoolId } });
    const classIds = classes.map((item) => item.id);

    return {
      academicYears: await this.prisma.academicYear.findMany({ where: { schoolId } }),
      terms: await this.prisma.term.findMany({ where: { academicYear: { schoolId } } }),
      gradeLevels: await this.prisma.gradeLevel.findMany({ where: { schoolId } }),
      classes,
      sections: await this.prisma.section.findMany({ where: { classId: { in: classIds } } }),
      subjects: await this.prisma.subject.findMany({ where: { schoolId } }),
      classSubjects: await this.prisma.classSubject.findMany({
        where: { class: { schoolId } },
      }),
      teacherSubjectAssignments: await this.prisma.teacherSubjectAssignment.findMany({
        where: { schoolId },
      }),
      timetableSlots: await this.prisma.timetableSlot.findMany({ where: { schoolId } }),
    };
  }

  private async getStudentsData(schoolId: string) {
    return {
      studentUsers: await this.prisma.user.findMany({ where: { schoolId, role: 'STUDENT' } }),
      studentProfiles: await this.prisma.studentProfile.findMany({ where: { schoolId } }),
      parentUsers: await this.prisma.user.findMany({ where: { schoolId, role: 'PARENT' } }),
      parentProfiles: await this.prisma.parentProfile.findMany({ where: { schoolId } }),
      parentStudents: await this.prisma.parentStudent.findMany({ where: { schoolId } }),
      studentClasses: await this.prisma.studentClass.findMany({ where: { schoolId } }),
      enrollmentRequests: await this.prisma.enrollmentRequest.findMany({ where: { schoolId } }),
      enrollments: await this.prisma.enrollment.findMany({ where: { schoolId } }),
      disciplineIncidents: await this.prisma.disciplineIncident.findMany({ where: { schoolId } }),
      pendingCredentials: await this.prisma.pendingCredential.findMany({ where: { schoolId } }),
    };
  }

  private async getStaffData(schoolId: string) {
    return {
      staffUsers: await this.prisma.user.findMany({
        where: {
          schoolId,
          role: { in: ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'FINANCE', 'TEACHER'] },
        },
      }),
      teacherProfiles: await this.prisma.teacherProfile.findMany({ where: { schoolId } }),
      financeProfiles: await this.prisma.financeProfile.findMany({ where: { schoolId } }),
      departments: await this.prisma.department.findMany({ where: { schoolId } }),
      credentialLogs: await this.prisma.credentialGenerationLog.findMany({ where: { schoolId } }),
      pendingCredentials: await this.prisma.pendingCredential.findMany({
        where: {
          schoolId,
          role: { in: ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'FINANCE', 'TEACHER'] },
        },
      }),
    };
  }

  private async getExamsAndMarksData(schoolId: string) {
    const exams = await this.prisma.exam.findMany({ where: { schoolId } });
    const examIds = exams.map((exam) => exam.id);
    const assessments = await this.prisma.assessment.findMany({ where: { schoolId } });
    const assessmentIds = assessments.map((assessment) => assessment.id);
    const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
      where: { assessmentId: { in: assessmentIds } },
    });
    const assessmentSubjectIds = assessmentSubjects.map((subject) => subject.id);

    return {
      exams,
      examResults: await this.prisma.examResult.findMany({ where: { examId: { in: examIds } } }),
      grades: await this.prisma.grade.findMany({ where: { schoolId } }),
      subjectGrades: await this.prisma.subjectGrade.findMany({ where: { schoolId } }),
      gradeScores: await this.prisma.gradeScore.findMany({ where: { subjectGrade: { schoolId } } }),
      gradeChangeLogs: await this.prisma.gradeChangeLog.findMany({ where: { grade: { schoolId } } }),
      gradeScales: await this.prisma.gradeScale.findMany({ where: { schoolId } }),
      gradingComponents: await this.prisma.gradingComponent.findMany({ where: { schoolId } }),
      assessments,
      assessmentSubjects,
      studentAssessmentScores: await this.prisma.studentAssessmentScore.findMany({
        where: { assessmentSubjectId: { in: assessmentSubjectIds } },
      }),
      assessmentWeights: await this.prisma.assessmentWeight.findMany({ where: { schoolId } }),
      promotionRecords: await this.prisma.promotionRecord.findMany({ where: { schoolId } }),
      nationalExamResultBatches: await this.prisma.nationalExamResultBatch.findMany({ where: { schoolId } }),
      nationalExamResults: await this.prisma.nationalExamResult.findMany({ where: { schoolId } }),
      nationalExamSubjectResults: await this.prisma.nationalExamSubjectResult.findMany({
        where: { result: { schoolId } },
      }),
      examSeatingPlans: await this.prisma.examSeatingPlan.findMany({ where: { schoolId } }),
    };
  }

  private async getFinanceData(schoolId: string) {
    return {
      feeStructures: await this.prisma.feeStructure.findMany({ where: { schoolId } }),
      discountPolicies: await this.prisma.discountPolicy.findMany({ where: { schoolId } }),
      studentFees: await this.prisma.studentFee.findMany({ where: { schoolId } }),
      payments: await this.prisma.payment.findMany({ where: { schoolId } }),
      receipts: await this.prisma.receipt.findMany({ where: { schoolId } }),
      financeProfiles: await this.prisma.financeProfile.findMany({ where: { schoolId } }),
    };
  }

  private async getCertificatesData(schoolId: string) {
    return {
      reportCards: await this.prisma.reportCard.findMany({ where: { schoolId } }),
      grades: await this.prisma.grade.findMany({ where: { schoolId } }),
      subjectGrades: await this.prisma.subjectGrade.findMany({ where: { schoolId } }),
      templates: await this.prisma.template.findMany({ where: { schoolId } }),
      certificateSettings: await this.prisma.schoolSetting.findMany({
        where: {
          schoolId,
          key: { in: ['certificate_template', 'id_card_template'] },
        },
      }),
      studentDocuments: await this.prisma.document.findMany({
        where: { schoolId, type: { in: ['CERTIFICATE', 'REPORT_CARD', 'ID_CARD'] } },
      }),
    };
  }

  private async getDocumentsData(schoolId: string) {
    const contents = await this.prisma.content.findMany({ where: { schoolId } });
    const contentIds = contents.map((content) => content.id);

    return {
      documents: await this.prisma.document.findMany({ where: { schoolId } }),
      templates: await this.prisma.template.findMany({ where: { schoolId } }),
      contents,
      contentAttachments: await this.prisma.contentAttachment.findMany({
        where: { contentId: { in: contentIds } },
      }),
      contentResources: await this.prisma.contentResource.findMany({ where: { schoolId } }),
      contentSubmissions: await this.prisma.contentSubmission.findMany({
        where: { contentId: { in: contentIds } },
      }),
    };
  }

  private async getSchoolSettingsData(schoolId: string) {
    return {
      school: await this.prisma.school.findUnique({ where: { id: schoolId } }),
      schoolSettings: await this.prisma.schoolSetting.findMany({ where: { schoolId } }),
      structuredSchoolSettings: await this.prisma.schoolSettings.findUnique({ where: { schoolId } }),
    };
  }

  private createJsonZip(zipPath: string, files: Array<{ name: string; data: unknown }>): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = this.createZipArchive();

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      for (const file of files) {
        archive.append(JSON.stringify(file.data, null, 2), { name: file.name });
      }
      void archive.finalize();
    });
  }

  private toSafeFileName(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'school';
  }

  private createZipArchive(): archiver.Archiver {
    const runtimeArchiver = archiver as unknown as {
      default?: (format: string, options?: archiver.ArchiverOptions) => archiver.Archiver;
      create?: (format: string, options?: archiver.ArchiverOptions) => archiver.Archiver;
      ZipArchive?: new (options?: archiver.ArchiverOptions) => archiver.Archiver;
    };

    if (typeof runtimeArchiver.default === 'function') {
      return runtimeArchiver.default('zip', { zlib: { level: 9 } });
    }
    if (typeof runtimeArchiver.create === 'function') {
      return runtimeArchiver.create('zip', { zlib: { level: 9 } });
    }
    if (runtimeArchiver.ZipArchive) {
      return new runtimeArchiver.ZipArchive({ zlib: { level: 9 } });
    }

    throw new ServiceUnavailableException('Backup archive engine is not available');
  }
}
