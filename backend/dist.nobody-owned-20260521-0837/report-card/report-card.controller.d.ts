import type { Response } from 'express';
import { ReportCardService, ReportCardStatus } from './report-card.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class ReportCardController {
    private readonly reportCardService;
    private readonly prisma;
    constructor(reportCardService: ReportCardService, prisma: PrismaService);
    generateReportCard(req: any, body: {
        studentId: string;
        classId: string;
        sectionId: string;
        academicYearId?: string;
        termId: string;
        termName: string;
    }): Promise<any>;
    bulkGenerate(req: any, body: {
        classId: string;
        sectionId: string;
        academicYearId?: string;
        termId: string;
        termName: string;
    }): Promise<{
        generated: number;
        failed: number;
        errors: string[];
    }>;
    getReportCards(req: any, query: {
        classId?: string;
        academicYear?: string;
        term?: string;
        status?: ReportCardStatus;
        studentId?: string;
    }): Promise<{
        gradeDetails: any;
        class: {
            section: string;
            grade: number | null;
            id: string;
            name: string;
        };
        generatedBy: {
            id: string;
            name: string;
        } | null;
        student: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        academicYear: string;
        term: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        generatedById: string | null;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.ReportCardStatus;
        totalMarks: number | null;
        percentage: number | null;
        overallGrade: string | null;
        rank: number | null;
        rankInClass: number | null;
        totalDays: number | null;
        presentDays: number | null;
        absentDays: number | null;
        attendancePercentage: number | null;
        teacherRemarks: string | null;
        principalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }[]>;
    getPublishSummary(req: any, query: {
        academicYearId: string;
        termId: string;
    }): Promise<{
        classId: string;
        className: string;
        grade: number | null;
        sectionName: string;
        expectedEntries: number;
        generatedEntries: number;
        publishedEntries: number;
        draftEntries: number;
        missingEntries: number;
        incompleteEntries: number;
        assessmentSubjects: number;
        assessmentExpectedScores: number;
        assessmentEnteredScores: number;
        assessmentMissingScores: number;
        rankingEntries: number;
        rankingMissingEntries: number;
        rankingMode: "auto_on_publish";
        certificateReady: boolean;
        certificateIssue: null;
        issueReasons: string[];
        status: "published" | "ready" | "has_issues" | "no_students";
    }[]>;
    getParentPresentationReport(req: any, query: {
        academicYearId: string;
        fromTermId: string;
        toTermId: string;
        classId?: string;
    }): Promise<{
        generatedAt: string;
        school: {
            id: string;
            name: string;
            phone: string | null;
            address: string | null;
        } | null;
        academicYear: {
            id: string;
            name: string;
        };
        fromTerm: {
            id: string;
            name: string;
        };
        toTerm: {
            id: string;
            name: string;
        };
        filters: {
            classId: string | null;
        };
        summary: {
            from: {
                students: number;
                average: number | null;
                attendance: number | null;
                passRate: number | null;
            };
            to: {
                students: number;
                average: number | null;
                attendance: number | null;
                passRate: number | null;
            };
            averageChange: number | null;
            attendanceChange: number | null;
        };
        classSummaries: {
            classId: string;
            className: string;
            grade: number | null;
            sectionName: string;
            fromAverage: number | null;
            toAverage: number | null;
            change: number | null;
            fromAttendance: number | null;
            toAttendance: number | null;
            attendanceChange: number | null;
            fromStudents: number;
            toStudents: number;
            passRate: number | null;
        }[];
        subjectSummaries: {
            subjectId: string;
            subjectName: string;
            fromAverage: number | null;
            toAverage: number | null;
            change: number | null;
        }[];
        insights: {
            improvedClasses: {
                classId: string;
                className: string;
                grade: number | null;
                sectionName: string;
                fromAverage: number | null;
                toAverage: number | null;
                change: number | null;
                fromAttendance: number | null;
                toAttendance: number | null;
                attendanceChange: number | null;
                fromStudents: number;
                toStudents: number;
                passRate: number | null;
            }[];
            decliningClasses: {
                classId: string;
                className: string;
                grade: number | null;
                sectionName: string;
                fromAverage: number | null;
                toAverage: number | null;
                change: number | null;
                fromAttendance: number | null;
                toAttendance: number | null;
                attendanceChange: number | null;
                fromStudents: number;
                toStudents: number;
                passRate: number | null;
            }[];
            weakSubjects: {
                subjectId: string;
                subjectName: string;
                fromAverage: number | null;
                toAverage: number | null;
                change: number | null;
            }[];
            improvedSubjects: {
                subjectId: string;
                subjectName: string;
                fromAverage: number | null;
                toAverage: number | null;
                change: number | null;
            }[];
        };
    }>;
    downloadParentPresentationPdf(req: any, query: {
        academicYearId: string;
        fromTermId: string;
        toTermId: string;
        classId?: string;
    }, res: Response): Promise<void>;
    downloadParentPresentationExcel(req: any, query: {
        academicYearId: string;
        fromTermId: string;
        toTermId: string;
        classId?: string;
    }, res: Response): Promise<void>;
    getMyPublishedReportCards(req: any, query: {
        academicYear?: string;
        term?: string;
    }): Promise<{
        gradeDetails: any;
        class: {
            section: string;
            grade: number | null;
            id: string;
            name: string;
        };
        generatedBy: {
            id: string;
            name: string;
        } | null;
        student: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        academicYear: string;
        term: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        generatedById: string | null;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.ReportCardStatus;
        totalMarks: number | null;
        percentage: number | null;
        overallGrade: string | null;
        rank: number | null;
        rankInClass: number | null;
        totalDays: number | null;
        presentDays: number | null;
        absentDays: number | null;
        attendancePercentage: number | null;
        teacherRemarks: string | null;
        principalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }[]>;
    getStudentReportCards(req: any, studentId: string): Promise<{
        gradeDetails: any;
        class: {
            section: string;
            grade: number | null;
            id: string;
            name: string;
        };
        generatedBy: {
            id: string;
            name: string;
        } | null;
        student: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        academicYear: string;
        term: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        generatedById: string | null;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.ReportCardStatus;
        totalMarks: number | null;
        percentage: number | null;
        overallGrade: string | null;
        rank: number | null;
        rankInClass: number | null;
        totalDays: number | null;
        presentDays: number | null;
        absentDays: number | null;
        attendancePercentage: number | null;
        teacherRemarks: string | null;
        principalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }[]>;
    getPublishedReportCardsForParent(req: any, childId: string, query: {
        academicYear?: string;
        term?: string;
    }): Promise<{
        gradeDetails: any;
        class: {
            section: string;
            grade: number | null;
            id: string;
            name: string;
        };
        generatedBy: {
            id: string;
            name: string;
        } | null;
        student: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        academicYear: string;
        term: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        generatedById: string | null;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.ReportCardStatus;
        totalMarks: number | null;
        percentage: number | null;
        overallGrade: string | null;
        rank: number | null;
        rankInClass: number | null;
        totalDays: number | null;
        presentDays: number | null;
        absentDays: number | null;
        attendancePercentage: number | null;
        teacherRemarks: string | null;
        principalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }[]>;
    getClassReportCards(req: any, classId: string, query: {
        academicYear?: string;
        term?: string;
    }): Promise<{
        gradeDetails: any;
        class: {
            section: string;
            grade: number | null;
            id: string;
            name: string;
        };
        generatedBy: {
            id: string;
            name: string;
        } | null;
        student: {
            id: string;
            name: string;
            avatarUrl: string | null;
        };
        academicYear: string;
        term: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        generatedById: string | null;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.ReportCardStatus;
        totalMarks: number | null;
        percentage: number | null;
        overallGrade: string | null;
        rank: number | null;
        rankInClass: number | null;
        totalDays: number | null;
        presentDays: number | null;
        absentDays: number | null;
        attendancePercentage: number | null;
        teacherRemarks: string | null;
        principalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }[]>;
    getCertificateTemplate(req: any): Promise<{
        schoolId: string;
        curriculumType: string;
        currentPeriodName: string;
        activeAcademicYearName: string;
        assessmentColumns: {
            code: string;
            name: string;
            percentage: number;
        }[];
        title: any;
        themeColor: any;
        principalName: any;
        schoolName: any;
        schoolPhone: any;
        schoolAddress: any;
        schoolLogoUrl: string;
        showRank: boolean;
        showAttendance: boolean;
        showGPA: boolean;
        useCustomBackground: boolean;
        customBackgroundUrl: any;
    }>;
    saveCertificateTemplate(req: any, body: {
        template: Record<string, any>;
    }): Promise<{
        schoolId: string;
        curriculumType: string;
        currentPeriodName: string;
        activeAcademicYearName: string;
        assessmentColumns: {
            code: string;
            name: string;
            percentage: number;
        }[];
        title: any;
        themeColor: any;
        principalName: any;
        schoolName: any;
        schoolPhone: any;
        schoolAddress: any;
        schoolLogoUrl: string;
        showRank: boolean;
        showAttendance: boolean;
        showGPA: boolean;
        useCustomBackground: boolean;
        customBackgroundUrl: any;
    }>;
    uploadCertificateWatermark(req: any, file: Express.Multer.File): Promise<{
        url: string;
    }>;
    getCertificatePayload(req: any, id: string): Promise<{
        template: {
            schoolId: string;
            curriculumType: string;
            currentPeriodName: string;
            activeAcademicYearName: string;
            assessmentColumns: {
                code: string;
                name: string;
                percentage: number;
            }[];
            title: any;
            themeColor: any;
            principalName: any;
            schoolName: any;
            schoolPhone: any;
            schoolAddress: any;
            schoolLogoUrl: string;
            showRank: boolean;
            showAttendance: boolean;
            showGPA: boolean;
            useCustomBackground: boolean;
            customBackgroundUrl: any;
        };
        reportCard: {
            id: string;
            term: string;
            academicYear: string;
            rank: number | null;
            rankInClass: number | null;
            totalMarks: number | null;
            percentage: number | null;
            overallGrade: string | null;
            attendancePercentage: number | null;
            student: {
                studentProfile: {
                    studentId: string;
                    studentCode: string;
                } | null;
                id: string;
                name: string;
                avatarUrl: string | null;
            };
            class: {
                section: string;
                grade: number | null;
                id: string;
                name: string;
            };
            gradeDetails: Record<string, any>[];
        };
    }>;
    generateCertificatePdf(req: any, id: string, res: Response): Promise<void>;
    generateCertificateBulkZip(req: any, body: {
        reportCardIds: string[];
    }, res: Response): Promise<void>;
    getReportCardById(req: any, id: string): Promise<{
        gradeDetails: Record<string, any>[];
        class: {
            section: string;
            grade: number | null;
            id: string;
            name: string;
        };
        generatedBy: {
            id: string;
            name: string;
        } | null;
        student: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
            avatarUrl: string | null;
        };
        academicYear: string;
        term: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        generatedById: string | null;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.ReportCardStatus;
        totalMarks: number | null;
        percentage: number | null;
        overallGrade: string | null;
        rank: number | null;
        rankInClass: number | null;
        totalDays: number | null;
        presentDays: number | null;
        absentDays: number | null;
        attendancePercentage: number | null;
        teacherRemarks: string | null;
        principalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }>;
    updateRemarks(req: any, id: string, body: {
        teacherRemarks?: string;
        principalRemarks?: string;
        coCurricular?: string;
        behavior?: string;
    }): Promise<{
        academicYear: string;
        term: string;
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        generatedById: string | null;
        studentId: string;
        classId: string;
        sectionId: string;
        status: import("@prisma/client").$Enums.ReportCardStatus;
        totalMarks: number | null;
        percentage: number | null;
        overallGrade: string | null;
        rank: number | null;
        rankInClass: number | null;
        totalDays: number | null;
        presentDays: number | null;
        absentDays: number | null;
        attendancePercentage: number | null;
        teacherRemarks: string | null;
        principalRemarks: string | null;
        gradeDetails: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }>;
    publishReportCards(req: any, body: {
        ids: string[];
    }): Promise<{
        published: number;
    }>;
    publishResultsForClass(req: any, body: {
        academicYearId: string;
        termId: string;
        classId: string;
        notifyStudents?: boolean;
        notifyParents?: boolean;
    }): Promise<{
        published: number;
        ranked: number;
        notifiedStudents: number;
        notifiedParents: number;
    }>;
    unpublishReportCards(req: any, body: {
        ids: string[];
    }): Promise<{
        unpublished: number;
    }>;
    calculateRanks(req: any, body: {
        classId: string;
        academicYear: string;
        term: string;
    }): Promise<number>;
    deleteReportCard(req: any, id: string): Promise<{
        deleted: boolean;
    }>;
    private getActiveAcademicYear;
    private getAcademicYearName;
}
