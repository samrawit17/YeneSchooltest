import { ImportNationalExamResultsDto } from './dto/national-exam-results.dto';
import { NationalExamResultsService } from './national-exam-results.service';
interface AuthRequest {
    user: {
        id: string;
        role: string;
        schoolId: string;
    };
}
export declare class NationalExamResultsController {
    private readonly service;
    constructor(service: NationalExamResultsService);
    listBatches(req: AuthRequest): Promise<({
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
        source: import("@prisma/client").$Enums.NationalExamSource;
        publishedAt: Date | null;
        fileName: string | null;
        examType: import("@prisma/client").$Enums.NationalExamType;
        examYear: string;
        cutoffScore: number | null;
        importedById: string;
    })[]>;
    getBatch(req: AuthRequest, id: string): Promise<({
        results: ({
            subjects: {
                id: string;
                createdAt: Date;
                gradeLetter: string | null;
                subjectName: string;
                score: number;
                resultId: string;
            }[];
            student: {
                id: string;
                name: string;
                username: string | null;
                studentProfile: {
                    section: string | null;
                    studentId: string;
                    studentCode: string;
                    className: string | null;
                    rollNumber: string | null;
                } | null;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number;
            studentId: string | null;
            stream: string | null;
            batchId: string;
            status: import("@prisma/client").$Enums.NationalExamResultStatus;
            totalScore: number | null;
            studentName: string;
            remarks: string | null;
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
        source: import("@prisma/client").$Enums.NationalExamSource;
        publishedAt: Date | null;
        fileName: string | null;
        examType: import("@prisma/client").$Enums.NationalExamType;
        examYear: string;
        cutoffScore: number | null;
        importedById: string;
    }) | null>;
    importResults(req: AuthRequest, dto: ImportNationalExamResultsDto): Promise<({
        results: ({
            subjects: {
                id: string;
                createdAt: Date;
                gradeLetter: string | null;
                subjectName: string;
                score: number;
                resultId: string;
            }[];
            student: {
                id: string;
                name: string;
                username: string | null;
                studentProfile: {
                    section: string | null;
                    studentId: string;
                    studentCode: string;
                    className: string | null;
                    rollNumber: string | null;
                } | null;
            } | null;
        } & {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            grade: number;
            studentId: string | null;
            stream: string | null;
            batchId: string;
            status: import("@prisma/client").$Enums.NationalExamResultStatus;
            totalScore: number | null;
            studentName: string;
            remarks: string | null;
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
        source: import("@prisma/client").$Enums.NationalExamSource;
        publishedAt: Date | null;
        fileName: string | null;
        examType: import("@prisma/client").$Enums.NationalExamType;
        examYear: string;
        cutoffScore: number | null;
        importedById: string;
    }) | null>;
    publishBatch(req: AuthRequest, id: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string | null;
        status: import("@prisma/client").$Enums.NationalExamBatchStatus;
        source: import("@prisma/client").$Enums.NationalExamSource;
        publishedAt: Date | null;
        fileName: string | null;
        examType: import("@prisma/client").$Enums.NationalExamType;
        examYear: string;
        cutoffScore: number | null;
        importedById: string;
    }>;
    getMyResults(req: AuthRequest): Promise<({
        subjects: {
            id: string;
            createdAt: Date;
            gradeLetter: string | null;
            subjectName: string;
            score: number;
            resultId: string;
        }[];
        batch: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string | null;
            status: import("@prisma/client").$Enums.NationalExamBatchStatus;
            source: import("@prisma/client").$Enums.NationalExamSource;
            publishedAt: Date | null;
            fileName: string | null;
            examType: import("@prisma/client").$Enums.NationalExamType;
            examYear: string;
            cutoffScore: number | null;
            importedById: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        grade: number;
        studentId: string | null;
        stream: string | null;
        batchId: string;
        status: import("@prisma/client").$Enums.NationalExamResultStatus;
        totalScore: number | null;
        studentName: string;
        remarks: string | null;
        candidateNumber: string;
        averageScore: number | null;
        cutoffEligible: boolean | null;
        rawData: string | null;
    })[]>;
}
export {};
