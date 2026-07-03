import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { StorageService } from '../storage/storage.service';
export declare enum ReportCardStatus {
    DRAFT = "DRAFT",
    PUBLISHED = "PUBLISHED"
}
interface GenerateReportCardParams {
    schoolId: string;
    studentId: string;
    classId: string;
    sectionId: string;
    academicYear: string;
    termId: string;
    termName: string;
    generatedById: string;
}
interface BulkGenerateParams {
    schoolId: string;
    classId: string;
    sectionId: string;
    academicYear: string;
    termId: string;
    termName: string;
    generatedById: string;
}
interface PromotionParams {
    schoolId: string;
    studentId: string;
    fromClassId: string;
    fromAcademicYear: string;
    toClassId?: string | null;
    toAcademicYear: string;
    status: 'PROMOTED' | 'RETAINED' | 'GRADUATED';
}
interface BulkPromotionParams {
    schoolId: string;
    fromClassId?: string;
    fromGrade?: number;
    toClassId?: string | null;
    toGrade?: number | null;
    fromAcademicYear: string;
    toAcademicYear: string;
    studentIds: string[];
    promoteAll: boolean;
    minAverageGrade?: number;
    minAttendance?: number;
    streams?: Record<string, string>;
}
interface PromotionCriteria {
    minAverageGrade?: number;
    minAttendance?: number;
    allowFailedSubjects: number;
}
export declare class ReportCardService {
    private prisma;
    private notificationService;
    private storageService;
    constructor(prisma: PrismaService, notificationService: NotificationService, storageService: StorageService);
    private resolveAcademicYearName;
    private resolveTerm;
    private parseSettingValue;
    private ensureParentGradeAccessEnabled;
    private ensureCurrentPeriodFeesPaid;
    private resolveCurrentTerm;
    private verifyFinancialClearanceForPeriod;
    private resolveTermName;
    private buildAssessmentReadinessByClass;
    private parseGradeDetails;
    private resolveReportCardGradeDetails;
    private average;
    private formatNullablePercent;
    private verifyParentChild;
    private recordPromotionHistory;
    private assertAcademicYearEnded;
    private getSectionNameByIndex;
    private getDefaultSectionCapacity;
    private getPromotionMinAverageGrade;
    private getPromotionMinAttendance;
    private getPromotionAllowFailedSubjects;
    private getSchoolGradeRange;
    private normalizePromotionStream;
    private getPromotionSectionName;
    private getExistingPromotionRecord;
    private getEffectiveSubjectTotalScore;
    private ensurePromotionReadiness;
    private getGradeLetter;
    private calculateAttendance;
    generateReportCard(params: GenerateReportCardParams): Promise<any>;
    bulkGenerate(params: BulkGenerateParams): Promise<{
        generated: number;
        failed: number;
        errors: string[];
    }>;
    getReportCards(schoolId: string, filters: {
        classId?: string;
        academicYearId?: string;
        academicYear?: string;
        termId?: string;
        term?: string;
        status?: ReportCardStatus;
        studentId?: string;
    }): Promise<{
        gradeDetails: any;
        class: {
            id: string;
            name: string;
            section: string;
            grade: number | null;
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        deletedById: string | null;
        academicYear: string;
        term: string;
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
        internalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }[]>;
    getPublishedReportCardsForParent(parentId: string, childId: string, schoolId: string, filters?: {
        academicYear?: string;
        term?: string;
    }): Promise<{
        gradeDetails: any;
        class: {
            id: string;
            name: string;
            section: string;
            grade: number | null;
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        deletedById: string | null;
        academicYear: string;
        term: string;
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
        internalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }[]>;
    getPublishedReportCardsForStudent(schoolId: string, studentId: string, filters?: {
        academicYear?: string;
        term?: string;
    }): Promise<{
        gradeDetails: any;
        class: {
            id: string;
            name: string;
            section: string;
            grade: number | null;
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        deletedById: string | null;
        academicYear: string;
        term: string;
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
        internalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }[]>;
    getPublishSummary(schoolId: string, academicYearId: string, termId: string): Promise<{
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
        status: "ready" | "published" | "has_issues" | "no_students";
    }[]>;
    getParentPresentationReport(schoolId: string, params: {
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
    generateParentPresentationExcel(schoolId: string, params: {
        academicYearId: string;
        fromTermId: string;
        toTermId: string;
        classId?: string;
    }): Promise<Buffer>;
    generateParentPresentationPdf(schoolId: string, params: {
        academicYearId: string;
        fromTermId: string;
        toTermId: string;
        classId?: string;
    }): Promise<Buffer>;
    getReportCardById(id: string, schoolId: string): Promise<{
        gradeDetails: Record<string, any>[];
        class: {
            id: string;
            name: string;
            section: string;
            grade: number | null;
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
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        deletedById: string | null;
        academicYear: string;
        term: string;
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
        internalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }>;
    getCertificateTemplate(schoolId: string): Promise<{
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
    saveCertificateTemplate(schoolId: string, value: Record<string, any>): Promise<{
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
    uploadCertificateWatermark(schoolId: string, file: Express.Multer.File): Promise<string>;
    getCertificatePayload(reportCardId: string, schoolId: string): Promise<{
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
            academicYearId: string;
            rank: number | null;
            rankInClass: number | null;
            totalMarks: number | null;
            percentage: number | null;
            overallGrade: string | null;
            attendancePercentage: number | null;
            teacherRemarks: string | null;
            principalRemarks: string | null;
            student: {
                id: string;
                name: string;
                avatarUrl: string | null;
                studentProfile: {
                    studentId: string;
                    studentCode: string;
                } | null;
            };
            class: {
                id: string;
                name: string;
                section: string;
                grade: number | null;
            };
            gradeDetails: Record<string, any>[];
        };
    }>;
    private getCertificateReadiness;
    private normalizeHexColor;
    private toDownloadFileName;
    private hexToRgbColor;
    private resolveBackendPublicAssetPath;
    generateCertificatePdf(schoolId: string, reportCardId: string): Promise<Buffer>;
    generateCertificateBulkZip(schoolId: string, reportCardIds: string[]): Promise<Buffer>;
    getCertificateDownloadFileName(schoolId: string, reportCardId: string): Promise<string>;
    publishReportCards(ids: string[], schoolId: string): Promise<{
        published: number;
    }>;
    publishResultsForClass(params: {
        schoolId: string;
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
    unpublishReportCards(ids: string[], schoolId: string): Promise<{
        unpublished: number;
    }>;
    calculateRanks(schoolId: string, classId: string, academicYear: string, term: string): Promise<number>;
    updateRemarks(id: string, schoolId: string, data: {
        teacherRemarks?: string;
        principalRemarks?: string;
        internalRemarks?: string;
        coCurricular?: string;
        behavior?: string;
    }): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        deletedById: string | null;
        academicYear: string;
        term: string;
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
        internalRemarks: string | null;
        gradeDetails: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }>;
    deleteReportCard(id: string, schoolId: string): Promise<{
        deleted: boolean;
    }>;
    getPromotionCandidates(classId: string, academicYear: string, criteria?: PromotionCriteria): Promise<{
        className: string;
        academicYear: string;
        totalStudents: number;
        candidates: {
            student: any;
            status: string;
            reason?: string;
            reasons?: string[];
            averageGrade: number;
            attendance: number;
            overallGrade?: string | null;
            reportCardId?: string;
        }[];
    }>;
    getPromotionCandidatesByGrade(schoolId: string, grade: number, academicYear: string, criteria?: PromotionCriteria): Promise<{
        className: string;
        academicYear: string;
        totalStudents: number;
        candidates: {
            student: any;
            status: string;
            reason?: string;
            reasons?: string[];
            averageGrade: number;
            attendance: number;
            overallGrade?: string | null;
            reportCardId?: string;
        }[];
    }>;
    getNextClassOptions(classId: string, toAcademicYear?: string): Promise<{
        currentClass: {
            id: string;
            name: string;
            grade: number | null;
        };
        nextClasses: {
            id: string;
            name: string;
            grade: number | null;
        }[];
        isLastGrade: boolean;
        graduationEnabled: boolean;
    }>;
    getNextGradeOptions(schoolId: string, grade: number, toAcademicYear?: string): Promise<{
        currentGrade: number;
        nextGrades: {
            grade: number;
            name: string;
        }[];
        isLastGrade: boolean;
        graduationEnabled: boolean;
    }>;
    promoteStudent(params: PromotionParams): Promise<{
        studentId: string;
        fromClassId: string;
        toClassId: null;
        status: string;
        promotedAt: Date;
    } | {
        studentId: string;
        fromClassId: string;
        toClassId: string;
        status: "PROMOTED" | "RETAINED";
        promotedAt: Date;
    }>;
    private getSectionIdForClass;
    bulkPromoteStudents(params: BulkPromotionParams): Promise<{
        promoted: number;
        retained: number;
        failed: number;
        errors: string[];
    }>;
    private bulkPromoteGradeStudents;
    getPromotionHistory(schoolId: string, filters: {
        academicYear?: string;
        classId?: string;
        status?: string;
    }): Promise<unknown>;
}
export {};
