"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const child_process_1 = require("child_process");
const archiver = __importStar(require("archiver"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const prisma_service_1 = require("../prisma/prisma.service");
const event_bus_service_1 = require("../core/events/event-bus.service");
const backup_types_1 = require("./backup.types");
let BackupService = class BackupService {
    prisma;
    eventBus;
    sensitiveUserFields = ['password'];
    sensitiveCredentialFields = ['temporaryPassword'];
    constructor(prisma, eventBus) {
        this.prisma = prisma;
        this.eventBus = eventBus;
    }
    getSchoolBackupTypes() {
        return [
            {
                value: 'FULL_SCHOOL',
                label: 'Full school backup',
                description: 'All school data categories plus uploaded files and settings.',
            },
            {
                value: 'STUDENTS',
                label: 'Students, parents, and enrollment',
                description: 'Student and parent accounts, enrollments, discipline, and class placement.',
            },
            {
                value: 'EXAMS_MARKS',
                label: 'Exams, marks, grades, and seating',
                description: 'Exams, assessments, grades, report cards, and seating assignments.',
            },
            {
                value: 'CERTIFICATES',
                label: 'Certificates and report cards',
                description: 'Report cards, certificate templates, and related documents metadata.',
            },
            {
                value: 'DOCUMENTS',
                label: 'Documents, lessons, and files',
                description: 'Documents, content, templates, and matching uploaded files.',
            },
            {
                value: 'FINANCE',
                label: 'Fees, payments, payroll, and receipts',
                description: 'Fee structures, payments, receipts, payroll, and finance audit logs.',
            },
            {
                value: 'STAFF',
                label: 'Staff, admins, teachers, and departments',
                description: 'Staff accounts, profiles, departments, and credential logs.',
            },
            {
                value: 'ACADEMICS',
                label: 'Classes, sections, subjects, and timetable',
                description: 'Academic years, classes, sections, subjects, and timetable slots.',
            },
            {
                value: 'ATTENDANCE',
                label: 'Attendance records and sessions',
                description: 'Legacy attendance, attendance sessions, and per-student records.',
            },
            {
                value: 'COMMUNICATIONS',
                label: 'Announcements, messages, and comms',
                description: 'Announcements, parent communications, and internal messaging.',
            },
            {
                value: 'OPERATIONS',
                label: 'Calendar, siren, practice exams, automation',
                description: 'School events, siren config, practice exams, syllabus, and automation rules.',
            },
        ];
    }
    async createPlatformBackup(context = {}) {
        const databaseUrl = process.env.DIRECT_DATABASE_URL ||
            process.env.DATABASE_URL ||
            process.env.DATABASE_POOL_URL;
        if (!databaseUrl) {
            throw new localization_1.LocalizedException('backup.database_backup_is_not_configured_database_url_is_missing_843d2c7b', undefined, common_1.HttpStatus.SERVICE_UNAVAILABLE, 'Database backup is not configured: DATABASE_URL is missing');
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
                backupScope: 'PLATFORM',
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
            await this.createPlatformZip(zipPath, dbDumpPath, manifestPath, uploadsPath.path, uploadsPath.exists);
            const fileName = path.basename(zipPath);
            this.emitBackupDownloaded({
                backupType: 'PLATFORM',
                fileName,
            }, context);
            return {
                tempDir,
                zipPath,
                fileName,
            };
        }
        catch (error) {
            await this.cleanupBackup(tempDir);
            throw error;
        }
    }
    async createSchoolBackup(schoolId, type, context = {}) {
        if (!backup_types_1.SCHOOL_BACKUP_TYPES.includes(type)) {
            throw new localization_1.LocalizedException('backup.unsupported_backup_type_d0d87a35', undefined, undefined, 'Unsupported backup type');
        }
        const school = await this.prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true, code: true },
        });
        if (!school) {
            throw new localization_1.LocalizedException('backup.school_not_found_c75997d5', undefined, common_1.HttpStatus.NOT_FOUND, 'School not found');
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeSchoolName = this.toSafeFileName(school.code || school.name || school.id);
        const safeType = type.toLowerCase().replace(/_/g, '-');
        const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'sms-school-backup-'));
        const zipPath = path.join(tempDir, `sms-${safeSchoolName}-${safeType}-${timestamp}.zip`);
        try {
            const jsonFiles = await this.buildSchoolBackupFiles(schoolId, type);
            const includeFiles = type === 'FULL_SCHOOL' || type === 'DOCUMENTS';
            const binaryFiles = includeFiles ? await this.collectSchoolUploadFiles(schoolId) : [];
            const fileManifest = includeFiles
                ? {
                    includedFiles: binaryFiles.map((file) => file.zipName),
                    missingFiles: await this.findMissingUploadUrls(schoolId, binaryFiles),
                }
                : null;
            const manifest = {
                generatedAt: new Date().toISOString(),
                backupScope: 'SCHOOL',
                school,
                type,
                format: 'json',
                files: jsonFiles.map((file) => file.name),
                uploadedFiles: fileManifest,
                notes: [
                    'This is an application-level export for one school and selected data category.',
                    'User password hashes and temporary credentials are excluded from this export.',
                    'Use the full platform backup for complete disaster recovery.',
                    'Secrets and environment variables are intentionally not included.',
                ],
            };
            await this.createArchiveZip(zipPath, [
                { name: 'manifest.json', data: manifest },
                ...jsonFiles,
                ...(fileManifest
                    ? [{ name: 'uploaded-files-manifest.json', data: fileManifest }]
                    : []),
            ], binaryFiles);
            const fileName = path.basename(zipPath);
            this.emitBackupDownloaded({
                schoolId,
                backupType: type,
                fileName,
            }, context);
            return { tempDir, zipPath, fileName };
        }
        catch (error) {
            await this.cleanupBackup(tempDir);
            throw error;
        }
    }
    async cleanupBackup(tempDir) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
    emitBackupDownloaded(payload, context) {
        void this.eventBus.emit('backup.downloaded', {
            ...payload,
            downloadedBy: context.downloadedBy ?? null,
        }, {
            actorId: context.downloadedBy,
            schoolId: payload.schoolId,
        });
    }
    dumpDatabase(databaseUrl, outputPath) {
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
            const child = (0, child_process_1.spawn)(pgDumpCommand, args, {
                stdio: ['ignore', 'ignore', 'pipe'],
            });
            let stderr = '';
            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });
            child.on('error', (error) => {
                if (error.code === 'ENOENT') {
                    reject(new common_1.ServiceUnavailableException('Database backup failed: pg_dump is not installed in the backend runtime'));
                    return;
                }
                reject(new common_1.ServiceUnavailableException(`Database backup failed: ${error.message}`));
            });
            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                    return;
                }
                reject(new common_1.ServiceUnavailableException(`Database backup failed with pg_dump exit code ${code}: ${stderr.trim() || 'no error output'}`));
            });
        });
    }
    resolveUploadsPath() {
        const configured = process.env.UPLOADS_DIR || process.env.STORAGE_LOCAL_ROOT_PATH;
        const uploadsPath = configured
            ? path.resolve(configured)
            : path.join(process.cwd(), 'public', 'uploads');
        return {
            path: uploadsPath,
            exists: fs.existsSync(uploadsPath),
        };
    }
    resolveUploadFilePath(fileUrl) {
        if (!fileUrl || fileUrl.startsWith('data:') || fileUrl.startsWith('http')) {
            return null;
        }
        const uploadsRoot = this.resolveUploadsPath().path;
        const normalized = fileUrl.replace(/^\/+/, '').replace(/\.\./g, '');
        const candidates = [
            path.join(uploadsRoot, normalized),
            path.join(uploadsRoot, 'uploads', normalized),
            path.join(process.cwd(), 'public', normalized),
            path.join(process.cwd(), 'public', 'uploads', normalized),
        ];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return candidate;
            }
        }
        return null;
    }
    createPlatformZip(zipPath, dbDumpPath, manifestPath, uploadsPath, uploadsExists) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = this.createZipArchive();
            output.on('close', resolve);
            output.on('error', reject);
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
    async buildSchoolBackupFiles(schoolId, type) {
        const files = [];
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
        if (type === 'FULL_SCHOOL' || type === 'ATTENDANCE') {
            files.push({ name: 'attendance.json', data: await this.getAttendanceData(schoolId) });
        }
        if (type === 'FULL_SCHOOL' || type === 'COMMUNICATIONS') {
            files.push({ name: 'communications.json', data: await this.getCommunicationsData(schoolId) });
        }
        if (type === 'FULL_SCHOOL' || type === 'OPERATIONS') {
            files.push({ name: 'operations.json', data: await this.getOperationsData(schoolId) });
        }
        if (type === 'FULL_SCHOOL') {
            files.push({
                name: 'school-profile-and-settings.json',
                data: await this.getSchoolSettingsData(schoolId),
            });
        }
        return files;
    }
    sanitizeRecord(record, fieldsToRemove) {
        const sanitized = { ...record };
        for (const field of fieldsToRemove) {
            delete sanitized[field];
        }
        return sanitized;
    }
    sanitizeUsers(users) {
        return users.map((user) => this.sanitizeRecord(user, this.sensitiveUserFields));
    }
    sanitizePendingCredentials(records) {
        return records.map((record) => this.sanitizeRecord(record, this.sensitiveCredentialFields));
    }
    async getAcademicsData(schoolId) {
        const classes = await this.prisma.class.findMany({ where: { schoolId } });
        const classIds = classes.map((item) => item.id);
        return {
            academicYears: await this.prisma.academicYear.findMany({ where: { schoolId } }),
            terms: await this.prisma.term.findMany({ where: { academicYear: { schoolId } } }),
            gradeLevels: await this.prisma.gradeLevel.findMany({ where: { schoolId } }),
            schoolYearCounters: await this.prisma.schoolYearCounter.findMany({ where: { schoolId } }),
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
    async getStudentsData(schoolId) {
        return {
            studentUsers: this.sanitizeUsers(await this.prisma.user.findMany({ where: { schoolId, role: 'STUDENT' } })),
            studentProfiles: await this.prisma.studentProfile.findMany({ where: { schoolId } }),
            parentUsers: this.sanitizeUsers(await this.prisma.user.findMany({ where: { schoolId, role: 'PARENT' } })),
            parentProfiles: await this.prisma.parentProfile.findMany({ where: { schoolId } }),
            parentStudents: await this.prisma.parentStudent.findMany({ where: { schoolId } }),
            studentClasses: await this.prisma.studentClass.findMany({ where: { schoolId } }),
            enrollmentRequests: await this.prisma.enrollmentRequest.findMany({ where: { schoolId } }),
            enrollments: await this.prisma.enrollment.findMany({ where: { schoolId } }),
            disciplineIncidents: await this.prisma.disciplineIncident.findMany({ where: { schoolId } }),
            pendingCredentials: this.sanitizePendingCredentials(await this.prisma.pendingCredential.findMany({ where: { schoolId } })),
        };
    }
    async getStaffData(schoolId) {
        return {
            staffUsers: this.sanitizeUsers(await this.prisma.user.findMany({
                where: {
                    schoolId,
                    role: { in: ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'FINANCE', 'TEACHER'] },
                },
            })),
            teacherProfiles: await this.prisma.teacherProfile.findMany({ where: { schoolId } }),
            financeProfiles: await this.prisma.financeProfile.findMany({ where: { schoolId } }),
            departments: await this.prisma.department.findMany({ where: { schoolId } }),
            credentialLogs: await this.prisma.credentialGenerationLog.findMany({ where: { schoolId } }),
            pendingCredentials: this.sanitizePendingCredentials(await this.prisma.pendingCredential.findMany({
                where: {
                    schoolId,
                    role: { in: ['ADMIN', 'IT_MANAGER', 'REGISTRAR', 'FINANCE', 'TEACHER'] },
                },
            })),
        };
    }
    async getExamsAndMarksData(schoolId) {
        const exams = await this.prisma.exam.findMany({ where: { schoolId } });
        const examIds = exams.map((exam) => exam.id);
        const assessments = await this.prisma.assessment.findMany({ where: { schoolId } });
        const assessmentIds = assessments.map((assessment) => assessment.id);
        const assessmentSubjects = await this.prisma.assessmentSubject.findMany({
            where: { assessmentId: { in: assessmentIds } },
        });
        const assessmentSubjectIds = assessmentSubjects.map((subject) => subject.id);
        const examSeatingPlans = await this.prisma.examSeatingPlan.findMany({ where: { schoolId } });
        const seatingPlanIds = examSeatingPlans.map((plan) => plan.id);
        const examSectionAssignments = await this.prisma.examSectionAssignment.findMany({
            where: { seatingPlanId: { in: seatingPlanIds } },
        });
        const assignmentIds = examSectionAssignments.map((assignment) => assignment.id);
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
            examSeatingPlans,
            examSectionAssignments,
            examSectionStudents: await this.prisma.examSectionStudent.findMany({
                where: { assignmentId: { in: assignmentIds } },
            }),
        };
    }
    async getFinanceData(schoolId) {
        return {
            feeStructures: await this.prisma.feeStructure.findMany({ where: { schoolId } }),
            discountPolicies: await this.prisma.discountPolicy.findMany({ where: { schoolId } }),
            studentFees: await this.prisma.studentFee.findMany({ where: { schoolId } }),
            payments: await this.prisma.payment.findMany({ where: { schoolId } }),
            receipts: await this.prisma.receipt.findMany({ where: { schoolId } }),
            financeProfiles: await this.prisma.financeProfile.findMany({ where: { schoolId } }),
            financeAuditLogs: await this.prisma.financeAuditLog.findMany({ where: { schoolId } }),
            payrollSalaries: await this.prisma.payrollSalary.findMany({ where: { schoolId } }),
            payrollRuns: await this.prisma.payrollRun.findMany({ where: { schoolId } }),
            payrollEntries: await this.prisma.payrollEntry.findMany({ where: { schoolId } }),
        };
    }
    async getCertificatesData(schoolId) {
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
    async getDocumentsData(schoolId) {
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
    async getAttendanceData(schoolId) {
        return {
            attendances: await this.prisma.attendance.findMany({ where: { schoolId } }),
            attendanceSessions: await this.prisma.attendanceSession.findMany({ where: { schoolId } }),
            attendanceRecords: await this.prisma.attendanceRecord.findMany({ where: { schoolId } }),
        };
    }
    async getCommunicationsData(schoolId) {
        const conversations = await this.prisma.conversation.findMany({ where: { schoolId } });
        const conversationIds = conversations.map((conversation) => conversation.id);
        const communications = await this.prisma.communication.findMany({ where: { schoolId } });
        const communicationIds = communications.map((communication) => communication.id);
        return {
            announcements: await this.prisma.announcement.findMany({ where: { schoolId } }),
            communications,
            communicationReplies: await this.prisma.communicationReply.findMany({
                where: { communicationId: { in: communicationIds } },
            }),
            conversations,
            conversationParticipants: await this.prisma.conversationParticipant.findMany({
                where: { conversationId: { in: conversationIds } },
            }),
            messages: await this.prisma.message.findMany({
                where: { conversationId: { in: conversationIds } },
            }),
            messageReads: await this.prisma.messageRead.findMany({
                where: { message: { conversationId: { in: conversationIds } } },
            }),
        };
    }
    async getOperationsData(schoolId) {
        const practiceExams = await this.prisma.practiceExam.findMany({ where: { schoolId } });
        const practiceExamIds = practiceExams.map((exam) => exam.id);
        const practiceAttempts = await this.prisma.practiceExamAttempt.findMany({ where: { schoolId } });
        const attemptIds = practiceAttempts.map((attempt) => attempt.id);
        return {
            schoolEvents: await this.prisma.schoolEvent.findMany({ where: { schoolId } }),
            periodTimes: await this.prisma.periodTime.findMany({ where: { schoolId } }),
            sirenSchedules: await this.prisma.sirenSchedule.findMany({ where: { schoolId } }),
            sirenEvents: await this.prisma.sirenEvent.findMany({ where: { schoolId } }),
            sirenHardwareConfig: await this.prisma.sirenHardwareConfig.findUnique({ where: { schoolId } }),
            syllabusMappings: await this.prisma.syllabusMapping.findMany({ where: { schoolId } }),
            practiceExams,
            practiceExamQuestions: await this.prisma.practiceExamQuestion.findMany({
                where: { examId: { in: practiceExamIds } },
            }),
            practiceExamAttempts: practiceAttempts,
            practiceExamAnswers: await this.prisma.practiceExamAnswer.findMany({
                where: { attemptId: { in: attemptIds } },
            }),
            automationRules: await this.prisma.automationRule.findMany({ where: { schoolId } }),
            automationExecutionLogs: await this.prisma.automationExecutionLog.findMany({ where: { schoolId } }),
        };
    }
    async getSchoolSettingsData(schoolId) {
        const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
        return {
            school: school
                ? this.sanitizeRecord(school, ['enrollmentKey'])
                : null,
            subscriptions: await this.prisma.subscription.findMany({ where: { schoolId } }),
            schoolSettings: await this.prisma.schoolSetting.findMany({ where: { schoolId } }),
            structuredSchoolSettings: await this.prisma.schoolSettings.findUnique({ where: { schoolId } }),
        };
    }
    async collectSchoolUploadUrls(schoolId) {
        const urls = new Set();
        const addUrl = (value) => {
            if (value) {
                urls.add(value);
            }
        };
        const school = await this.prisma.school.findUnique({
            where: { id: schoolId },
            select: { logoUrl: true },
        });
        addUrl(school?.logoUrl);
        const [documents, templates, contentAttachments, contentResources, contentSubmissions, users, schoolSettings,] = await Promise.all([
            this.prisma.document.findMany({ where: { schoolId }, select: { fileUrl: true } }),
            this.prisma.template.findMany({ where: { schoolId }, select: { backgroundUrl: true } }),
            this.prisma.contentAttachment.findMany({
                where: { content: { schoolId } },
                select: { fileUrl: true },
            }),
            this.prisma.contentResource.findMany({ where: { schoolId }, select: { fileUrl: true } }),
            this.prisma.contentSubmission.findMany({
                where: { content: { schoolId } },
                select: { submissionUrl: true },
            }),
            this.prisma.user.findMany({
                where: { schoolId },
                select: { avatarUrl: true },
            }),
            this.prisma.schoolSetting.findMany({
                where: { schoolId },
                select: { value: true },
            }),
        ]);
        documents.forEach((item) => addUrl(item.fileUrl));
        templates.forEach((item) => addUrl(item.backgroundUrl));
        contentAttachments.forEach((item) => addUrl(item.fileUrl));
        contentResources.forEach((item) => addUrl(item.fileUrl));
        contentSubmissions.forEach((item) => addUrl(item.submissionUrl));
        users.forEach((item) => addUrl(item.avatarUrl));
        schoolSettings.forEach((item) => {
            if (typeof item.value === 'string' && (item.value.startsWith('/') || item.value.includes('/uploads/'))) {
                addUrl(item.value);
            }
        });
        return Array.from(urls);
    }
    async collectSchoolUploadFiles(schoolId) {
        const urls = await this.collectSchoolUploadUrls(schoolId);
        const files = [];
        const seenPaths = new Set();
        for (const url of urls) {
            const diskPath = this.resolveUploadFilePath(url);
            if (!diskPath || seenPaths.has(diskPath)) {
                continue;
            }
            seenPaths.add(diskPath);
            files.push({
                zipName: `files/${this.toSafeRelativeUploadPath(url)}`,
                diskPath,
            });
        }
        return files;
    }
    async findMissingUploadUrls(schoolId, includedFiles) {
        const includedUrls = new Set(includedFiles.map((file) => file.zipName.replace(/^files\//, '')));
        const urls = await this.collectSchoolUploadUrls(schoolId);
        return urls.filter((url) => {
            const safePath = this.toSafeRelativeUploadPath(url);
            return !includedUrls.has(safePath) && !this.resolveUploadFilePath(url);
        });
    }
    createArchiveZip(zipPath, jsonFiles, binaryFiles) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = this.createZipArchive();
            output.on('close', resolve);
            output.on('error', reject);
            archive.on('error', reject);
            archive.pipe(output);
            for (const file of jsonFiles) {
                archive.append(JSON.stringify(file.data, null, 2), { name: file.name });
            }
            for (const file of binaryFiles) {
                archive.file(file.diskPath, { name: file.zipName });
            }
            void archive.finalize();
        });
    }
    toSafeRelativeUploadPath(url) {
        return url.replace(/^\/+/, '').replace(/\.\./g, '') || 'unknown-file';
    }
    toSafeFileName(value) {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'school';
    }
    createZipArchive() {
        const runtimeArchiver = archiver;
        if (typeof runtimeArchiver.default === 'function') {
            return runtimeArchiver.default('zip', { zlib: { level: 9 } });
        }
        if (typeof runtimeArchiver.create === 'function') {
            return runtimeArchiver.create('zip', { zlib: { level: 9 } });
        }
        if (runtimeArchiver.ZipArchive) {
            return new runtimeArchiver.ZipArchive({ zlib: { level: 9 } });
        }
        throw new localization_1.LocalizedException('backup.backup_archive_engine_is_not_available_2f135522', undefined, common_1.HttpStatus.SERVICE_UNAVAILABLE, 'Backup archive engine is not available');
    }
};
exports.BackupService = BackupService;
exports.BackupService = BackupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_bus_service_1.EventBusService])
], BackupService);
//# sourceMappingURL=backup.service.js.map