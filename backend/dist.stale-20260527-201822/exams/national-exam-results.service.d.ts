import { PrismaService } from '../prisma/prisma.service';
import { ImportNationalExamResultsDto } from './dto/national-exam-results.dto';
export declare class NationalExamResultsService {
    private prisma;
    constructor(prisma: PrismaService);
    listBatches(schoolId: string): Promise<({
        _count: {
            results: number;
        };
        importedBy: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string | null;
        status: import("@prisma/client").$Enums.NationalExamBatchStatus;
        publishedAt: Date | null;
        fileName: string | null;
        examType: import("@prisma/client").$Enums.NationalExamType;
        examYear: string;
        source: import("@prisma/client").$Enums.NationalExamSource;
        cutoffScore: number | null;
        importedById: string;
    })[]>;
    getBatch(schoolId: string, batchId: string): Promise<{
        results: ({
            subjects: {
                id: string;
                createdAt: Date;
                gradeLetter: string | null;
                score: number;
                subjectName: string;
                resultId: string;
            }[];
            student: {
                studentProfile: {
                    section: string | null;
                    studentId: string;
                    studentCode: string;
                    className: string | null;
                    rollNumber: string | null;
                } | null;
                id: string;
                name: string;
                username: string | null;
            } | null;
        } & {
            grade: number;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string | null;
            batchId: string;
            status: import("@prisma/client").$Enums.NationalExamResultStatus;
            totalScore: number | null;
            studentName: string;
            remarks: string | null;
            stream: string | null;
            candidateNumber: string;
            averageScore: number | null;
            cutoffEligible: boolean | null;
            rawData: string | null;
        })[];
        importedBy: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string | null;
        status: import("@prisma/client").$Enums.NationalExamBatchStatus;
        publishedAt: Date | null;
        fileName: string | null;
        examType: import("@prisma/client").$Enums.NationalExamType;
        examYear: string;
        source: import("@prisma/client").$Enums.NationalExamSource;
        cutoffScore: number | null;
        importedById: string;
    }>;
    importResults(schoolId: string, importedById: string, dto: ImportNationalExamResultsDto): Promise<{
        results: ({
            subjects: {
                id: string;
                createdAt: Date;
                gradeLetter: string | null;
                score: number;
                subjectName: string;
                resultId: string;
            }[];
            student: {
                studentProfile: {
                    section: string | null;
                    studentId: string;
                    studentCode: string;
                    className: string | null;
                    rollNumber: string | null;
                } | null;
                id: string;
                name: string;
                username: string | null;
            } | null;
        } & {
            grade: number;
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            studentId: string | null;
            batchId: string;
            status: import("@prisma/client").$Enums.NationalExamResultStatus;
            totalScore: number | null;
            studentName: string;
            remarks: string | null;
            stream: string | null;
            candidateNumber: string;
            averageScore: number | null;
            cutoffEligible: boolean | null;
            rawData: string | null;
        })[];
        importedBy: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string | null;
        status: import("@prisma/client").$Enums.NationalExamBatchStatus;
        publishedAt: Date | null;
        fileName: string | null;
        examType: import("@prisma/client").$Enums.NationalExamType;
        examYear: string;
        source: import("@prisma/client").$Enums.NationalExamSource;
        cutoffScore: number | null;
        importedById: string;
    }>;
    publishBatch(schoolId: string, batchId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string | null;
        status: import("@prisma/client").$Enums.NationalExamBatchStatus;
        publishedAt: Date | null;
        fileName: string | null;
        examType: import("@prisma/client").$Enums.NationalExamType;
        examYear: string;
        source: import("@prisma/client").$Enums.NationalExamSource;
        cutoffScore: number | null;
        importedById: string;
    }>;
    getPublishedForStudent(schoolId: string, studentId: string): Promise<({
        subjects: {
            id: string;
            createdAt: Date;
            gradeLetter: string | null;
            score: number;
            subjectName: string;
            resultId: string;
        }[];
        batch: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string | null;
            status: import("@prisma/client").$Enums.NationalExamBatchStatus;
            publishedAt: Date | null;
            fileName: string | null;
            examType: import("@prisma/client").$Enums.NationalExamType;
            examYear: string;
            source: import("@prisma/client").$Enums.NationalExamSource;
            cutoffScore: number | null;
            importedById: string;
        };
    } & {
        grade: number;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string | null;
        batchId: string;
        status: import("@prisma/client").$Enums.NationalExamResultStatus;
        totalScore: number | null;
        studentName: string;
        remarks: string | null;
        stream: string | null;
        candidateNumber: string;
        averageScore: number | null;
        cutoffEligible: boolean | null;
        rawData: string | null;
    })[]>;
    getParentChildResults(parentUserId: string, schoolId: string, childUserId: string): Promise<({
        subjects: {
            id: string;
            createdAt: Date;
            gradeLetter: string | null;
            score: number;
            subjectName: string;
            resultId: string;
        }[];
        batch: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string | null;
            status: import("@prisma/client").$Enums.NationalExamBatchStatus;
            publishedAt: Date | null;
            fileName: string | null;
            examType: import("@prisma/client").$Enums.NationalExamType;
            examYear: string;
            source: import("@prisma/client").$Enums.NationalExamSource;
            cutoffScore: number | null;
            importedById: string;
        };
    } & {
        grade: number;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        studentId: string | null;
        batchId: string;
        status: import("@prisma/client").$Enums.NationalExamResultStatus;
        totalScore: number | null;
        studentName: string;
        remarks: string | null;
        stream: string | null;
        candidateNumber: string;
        averageScore: number | null;
        cutoffEligible: boolean | null;
        rawData: string | null;
    })[]>;
    private getExpectedGrade;
    private findDuplicates;
    private resolveTotal;
    private resolveStatus;
}
