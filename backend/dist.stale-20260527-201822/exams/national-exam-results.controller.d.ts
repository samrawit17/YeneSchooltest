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
        publishedAt: Date | null;
        fileName: string | null;
        examType: import("@prisma/client").$Enums.NationalExamType;
        examYear: string;
        source: import("@prisma/client").$Enums.NationalExamSource;
        cutoffScore: number | null;
        importedById: string;
    })[]>;
    getBatch(req: AuthRequest, id: string): Promise<{
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
    importResults(req: AuthRequest, dto: ImportNationalExamResultsDto): Promise<{
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
    publishBatch(req: AuthRequest, id: string): Promise<{
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
    getMyResults(req: AuthRequest): Promise<({
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
    getParentChildResults(req: AuthRequest, childId: string): Promise<({
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
}
export {};
