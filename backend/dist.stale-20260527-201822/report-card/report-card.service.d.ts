import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
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
    fromClassId: string;
    toClassId?: string | null;
    fromAcademicYear: string;
    toAcademicYear: string;
    studentIds: string[];
    promoteAll: boolean;
    minAverageGrade?: number;
    minAttendance?: number;
}
interface PromotionCriteria {
    minAverageGrade: number;
    minAttendance: number;
    allowFailedSubjects: number;
}
export declare class ReportCardService {
    private prisma;
    private notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    private resolveAcademicYearName;
    private parseSettingValue;
    private ensureParentGradeAccessEnabled;
    private ensureCurrentPeriodFeesPaid;
    private resolveCurrentTerm;
    private verifyFinancialClearanceForPeriod;
    private resolveTermName;
    private parseGradeDetails;
    private resolveReportCardGradeDetails;
    private average;
    private formatNullablePercent;
    private verifyParentChild;
    private recordPromotionHistory;
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
        internalRemarks: string | null;
        coCurricular: string | null;
        behavior: string | null;
        publishedAt: Date | null;
        studentProfileId: string | null;
    }[]>;
    getPublishedReportCardsForParent(parentId: string, childId: string, filters?: {
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
        status: "published" | "ready" | "has_issues" | "no_students";
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
            rank: number | null;
            rankInClass: number | null;
            totalMarks: number | null;
            percentage: number | null;
            overallGrade: string | null;
            attendancePercentage: number | null;
            teacherRemarks: string | null;
            principalRemarks: string | null;
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
    private getCertificateReadiness;
    private normalizeHexColor;
    private hexToRgbColor;
    private resolveBackendPublicAssetPath;
    generateCertificatePdf(schoolId: string, reportCardId: string): Promise<Buffer>;
    generateCertificateBulkZip(schoolId: string, reportCardIds: string[]): Promise<Buffer>;
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
    getPromotionHistory(schoolId: string, filters: {
        academicYear?: string;
        classId?: string;
        status?: string;
    }): Promise<unknown>;
}
export {};
