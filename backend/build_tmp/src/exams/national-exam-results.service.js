"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NationalExamResultsService = void 0;
const common_1 = require("@nestjs/common");
const localization_1 = require("../core/localization");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const EXAM_PASS_MARK = {
    GRADE_6_REGIONAL: 50,
    GRADE_8_REGIONAL: 50,
    GRADE_12_ESLCE: 50,
};
let NationalExamResultsService = class NationalExamResultsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listBatches(schoolId) {
        return this.prisma.nationalExamResultBatch.findMany({
            where: { schoolId },
            include: {
                importedBy: { select: { id: true, name: true } },
                _count: { select: { results: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getBatch(schoolId, batchId) {
        const batch = await this.prisma.nationalExamResultBatch.findFirst({
            where: { id: batchId, schoolId },
            include: {
                importedBy: { select: { id: true, name: true } },
                results: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                studentProfile: {
                                    select: {
                                        studentId: true,
                                        studentCode: true,
                                        rollNumber: true,
                                        className: true,
                                        section: true,
                                    },
                                },
                            },
                        },
                        subjects: { orderBy: { subjectName: 'asc' } },
                    },
                    orderBy: [{ grade: 'asc' }, { studentName: 'asc' }],
                },
            },
        });
        throw new localization_1.LocalizedException('exams.national_exam_result_batch_not_found_b3b6afc6', undefined, common_1.HttpStatus.NOT_FOUND, 'National exam result batch not found');
        return batch;
    }
    async importResults(schoolId, importedById, dto) {
        if (!dto.rows?.length) {
            throw new localization_1.LocalizedException('exams.at_least_one_result_row_is_required_a3c907c2', undefined, undefined, 'At least one result row is required');
        }
        const expectedGrade = this.getExpectedGrade(dto.examType);
        const invalidGrade = dto.rows.find((row) => Number(row.grade) !== expectedGrade);
        if (invalidGrade) {
            throw new localization_1.LocalizedException('exams.imports_can_only_contain_grade_results_5bfda0d0', undefined, undefined, '${dto.examType} imports can only contain Grade ${expectedGrade} results');
        }
        const duplicates = this.findDuplicates(dto.rows.map((row) => row.candidateNumber.trim()));
        if (duplicates.length) {
            throw new localization_1.LocalizedException('exams.duplicate_candidate_numbers_351904b8', undefined, undefined, 'Duplicate candidate numbers: ${duplicates.join(\', \')}');
        }
        const candidates = dto.rows.map((row) => row.candidateNumber.trim()).filter(Boolean);
        const students = await this.prisma.user.findMany({
            where: {
                schoolId,
                role: client_1.Role.STUDENT,
                OR: [
                    { username: { in: candidates } },
                    { studentProfile: { studentId: { in: candidates } } },
                    { studentProfile: { studentCode: { in: candidates } } },
                    { studentProfile: { rollNumber: { in: candidates } } },
                ],
            },
            select: {
                id: true,
                username: true,
                studentProfile: {
                    select: { studentId: true, studentCode: true, rollNumber: true },
                },
            },
        });
        const studentByCandidate = new Map();
        for (const student of students) {
            const keys = [
                student.username,
                student.studentProfile?.studentId,
                student.studentProfile?.studentCode,
                student.studentProfile?.rollNumber,
            ].filter(Boolean);
            for (const key of keys) {
                if (!studentByCandidate.has(key))
                    studentByCandidate.set(key, student.id);
            }
        }
        const batch = await this.prisma.$transaction(async (tx) => {
            const batch = await tx.nationalExamResultBatch.create({
                data: {
                    schoolId,
                    academicYearId: dto.academicYearId || null,
                    examType: dto.examType,
                    examYear: dto.examYear,
                    source: dto.source || client_1.NationalExamSource.REGIONAL_BUREAU,
                    fileName: dto.fileName,
                    cutoffScore: dto.cutoffScore,
                    importedById,
                    status: client_1.NationalExamBatchStatus.IMPORTED,
                },
            });
            for (const row of dto.rows) {
                const candidateNumber = row.candidateNumber.trim();
                const totalScore = this.resolveTotal(row);
                const averageScore = row.subjects.length ? totalScore / row.subjects.length : totalScore;
                const status = this.resolveStatus(row.status, totalScore, dto.examType);
                const cutoffEligible = dto.examType === client_1.NationalExamType.GRADE_12_ESLCE && dto.cutoffScore !== undefined
                    ? totalScore >= dto.cutoffScore
                    : null;
                await tx.nationalExamResult.create({
                    data: {
                        batchId: batch.id,
                        schoolId,
                        studentId: studentByCandidate.get(candidateNumber) || null,
                        candidateNumber,
                        studentName: row.studentName.trim(),
                        grade: Number(row.grade),
                        stream: row.stream?.trim() || null,
                        totalScore,
                        averageScore,
                        status,
                        cutoffEligible,
                        remarks: row.remarks,
                        rawData: JSON.stringify(row),
                        subjects: {
                            create: row.subjects.map((subject) => ({
                                subjectName: subject.subjectName.trim(),
                                score: Number(subject.score),
                                gradeLetter: subject.gradeLetter,
                            })),
                        },
                    },
                });
            }
            return batch;
        });
        return this.getBatch(schoolId, batch.id);
    }
    async publishBatch(schoolId, batchId) {
        const batch = await this.prisma.nationalExamResultBatch.findFirst({
            where: { id: batchId, schoolId },
        });
        throw new localization_1.LocalizedException('exams.national_exam_result_batch_not_found_b3b6afc6', undefined, common_1.HttpStatus.NOT_FOUND, 'National exam result batch not found');
        return this.prisma.nationalExamResultBatch.update({
            where: { id: batchId },
            data: {
                status: client_1.NationalExamBatchStatus.PUBLISHED,
                publishedAt: new Date(),
            },
        });
    }
    async getPublishedForStudent(schoolId, studentId) {
        return this.prisma.nationalExamResult.findMany({
            where: {
                schoolId,
                studentId,
                batch: { status: client_1.NationalExamBatchStatus.PUBLISHED },
            },
            include: {
                batch: true,
                subjects: { orderBy: { subjectName: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    getExpectedGrade(examType) {
        if (examType === client_1.NationalExamType.GRADE_6_REGIONAL)
            return 6;
        if (examType === client_1.NationalExamType.GRADE_8_REGIONAL)
            return 8;
        return 12;
    }
    findDuplicates(values) {
        const seen = new Set();
        const duplicates = new Set();
        for (const value of values) {
            if (seen.has(value))
                duplicates.add(value);
            seen.add(value);
        }
        return Array.from(duplicates);
    }
    resolveTotal(row) {
        if (row.totalScore !== undefined && row.totalScore !== null)
            return Number(row.totalScore);
        return row.subjects.reduce((sum, subject) => sum + Number(subject.score || 0), 0);
    }
    resolveStatus(status, totalScore, examType) {
        const normalized = status?.trim().toUpperCase();
        if (normalized && normalized in client_1.NationalExamResultStatus) {
            return normalized;
        }
        return totalScore >= EXAM_PASS_MARK[examType]
            ? client_1.NationalExamResultStatus.PASS
            : client_1.NationalExamResultStatus.FAIL;
    }
};
exports.NationalExamResultsService = NationalExamResultsService;
exports.NationalExamResultsService = NationalExamResultsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NationalExamResultsService);
//# sourceMappingURL=national-exam-results.service.js.map