import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { EventBusService } from '../core/events/event-bus.service';
import { AddAssessmentSubjectsDto, CreateAssessmentDto, ListAssessmentsFilterDto, SaveAssessmentScoresDto, UpdateAssessmentDto, UpdateAssessmentWeightsDto } from './dto/assessments.dto';
export declare class AssessmentsService {
    private readonly prisma;
    private readonly cacheService;
    private readonly eventBus;
    constructor(prisma: PrismaService, cacheService: CacheService, eventBus: EventBusService);
    private getTeacherGradesNamespace;
    private getSchoolGradesNamespace;
    private invalidateAssessmentGradeCaches;
    private getAssessmentAffectedTeacherIds;
    private getWeightMap;
    private getEffectiveMaxScore;
    private buildTypeScoreMap;
    private average;
    private isAssessmentDue;
    private shouldAddAssessmentToCalendar;
    private formatAssessmentTypeLabel;
    private computeWeightedAssessmentSummary;
    private getGradeFromScore;
    private resolveChildStudentForParent;
    private validateAssessmentContext;
    private assessmentSubjectTargetKey;
    private assertNoDuplicateAssessmentTargets;
    private resolveTeacherAssignment;
    private ensureAssessmentWriteAccess;
    private ensureTeacherCanScore;
    private syncSubjectGradeForStudent;
    private createAssessmentSubjects;
    private attachFallbackTeachersToAssessments;
    private assessmentSubjectScoreKey;
    private attachEffectiveScoreCountsToAssessments;
    createAssessment(schoolId: string, userId: string, role: string, dto: CreateAssessmentDto): Promise<any>;
    addSubjects(schoolId: string, userId: string, role: string, assessmentId: string, dto: AddAssessmentSubjectsDto): Promise<any>;
    getAssessmentById(schoolId: string, id: string): Promise<any>;
    updateAssessment(schoolId: string, userId: string, role: string, id: string, dto: UpdateAssessmentDto): Promise<any>;
    listAssessments(schoolId: string, query: ListAssessmentsFilterDto): Promise<any[]>;
    clearAssessments(schoolId: string): Promise<{
        success: boolean;
        deleted: number;
    }>;
    getTeacherAssessments(teacherId: string, schoolId: string, query: ListAssessmentsFilterDto): Promise<{
        id: string;
        assessmentId: string;
        title: string;
        type: string;
        status: import("@prisma/client").$Enums.AssessmentStatus;
        academicYear: {
            id: string;
            name: string;
        };
        term: {
            id: string;
            name: string;
        } | null;
        class: {
            id: string;
            name: string;
        };
        section: {
            id: string;
            name: string;
        } | null;
        subject: {
            id: string;
            name: string;
        };
        maxScore: number;
        startDate: Date;
        endDate: Date;
        scoreEntries: number;
        scoreStatus: string;
        canCreate: boolean;
        canEditScores: boolean;
        isReadOnly: boolean;
    }[]>;
    getScoreEntry(userId: string, role: string, schoolId: string, assessmentSubjectId: string): Promise<{
        id: string;
        maxScore: number;
        subject: {
            id: string;
            name: string;
        };
        class: {
            id: string;
            name: string;
        };
        section: {
            id: string;
            name: string;
        } | null;
        assessment: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            status: import("@prisma/client").$Enums.AssessmentStatus;
            type: string;
            title: string;
            createdBy: string;
            termId: string | null;
            calendarEventId: string | null;
            lockAt: Date | null;
        };
        students: {
            studentId: string;
            studentName: string;
            rollNumber: string | null;
            sectionName: string;
            score: number | null;
            isAbsent: boolean;
            remarks: string | null;
            status: import("@prisma/client").$Enums.AssessmentScoreStatus;
        }[];
    }>;
    saveScores(userId: string, role: string, schoolId: string, assessmentSubjectId: string, dto: SaveAssessmentScoresDto): Promise<{
        id: string;
        maxScore: number;
        subject: {
            id: string;
            name: string;
        };
        class: {
            id: string;
            name: string;
        };
        section: {
            id: string;
            name: string;
        } | null;
        assessment: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            status: import("@prisma/client").$Enums.AssessmentStatus;
            type: string;
            title: string;
            createdBy: string;
            termId: string | null;
            calendarEventId: string | null;
            lockAt: Date | null;
        };
        students: {
            studentId: string;
            studentName: string;
            rollNumber: string | null;
            sectionName: string;
            score: number | null;
            isAbsent: boolean;
            remarks: string | null;
            status: import("@prisma/client").$Enums.AssessmentScoreStatus;
        }[];
    }>;
    lockAssessment(schoolId: string, assessmentId: string): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssessmentStatus;
        type: string;
        title: string;
        createdBy: string;
        termId: string | null;
        calendarEventId: string | null;
        lockAt: Date | null;
    }>;
    getMissingMarks(schoolId: string, query: ListAssessmentsFilterDto & {
        page?: number;
        limit?: number;
    }): Promise<{
        data: {
            assessmentSubjectId: string;
            assessmentId: string;
            title: string;
            type: string;
            subject: string;
            className: string;
            sectionName: string | null;
            expectedEntries: number;
            enteredEntries: number;
            missingEntries: number;
            isLocked: boolean;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getWeights(schoolId: string): Promise<{
        type: string;
        percentage: number;
    }[]>;
    updateWeights(schoolId: string, dto: UpdateAssessmentWeightsDto): Promise<{
        type: string;
        percentage: number;
    }[]>;
    private getStudentAcademicContext;
    getStudentUpcoming(studentId: string, schoolId: string, academicYearId?: string): Promise<({
        subject: {
            id: string;
            name: string;
        };
        assessment: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            status: import("@prisma/client").$Enums.AssessmentStatus;
            type: string;
            title: string;
            createdBy: string;
            termId: string | null;
            calendarEventId: string | null;
            lockAt: Date | null;
        };
        scores: {
            status: import("@prisma/client").$Enums.AssessmentScoreStatus;
            score: number | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        subjectId: string;
        teacherId: string | null;
        assessmentId: string;
        gradeLevelId: string | null;
        maxScore: number;
        passMark: number | null;
    })[]>;
    getStudentResults(studentId: string, schoolId: string, academicYearId?: string, termId?: string): Promise<{
        subjectId: string;
        subjectName: string;
        termName: string | null;
        assessments: Array<Record<string, unknown>>;
        summary: {
            quizAverage: number | null;
            testAverage: number | null;
            midAverage: number | null;
            finalAverage: number | null;
            totalScore: number | null;
            gradeLetter: string | null;
            gradePoint: number | null;
        };
    }[]>;
    getParentUpcoming(parentUserId: string, childId: string, schoolId: string, academicYearId?: string): Promise<({
        subject: {
            id: string;
            name: string;
        };
        assessment: {
            id: string;
            schoolId: string;
            createdAt: Date;
            updatedAt: Date;
            academicYearId: string;
            startDate: Date;
            endDate: Date;
            status: import("@prisma/client").$Enums.AssessmentStatus;
            type: string;
            title: string;
            createdBy: string;
            termId: string | null;
            calendarEventId: string | null;
            lockAt: Date | null;
        };
        scores: {
            status: import("@prisma/client").$Enums.AssessmentScoreStatus;
            score: number | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        classId: string;
        sectionId: string | null;
        subjectId: string;
        teacherId: string | null;
        assessmentId: string;
        gradeLevelId: string | null;
        maxScore: number;
        passMark: number | null;
    })[]>;
    getParentResults(parentUserId: string, childId: string, schoolId: string, academicYearId?: string, termId?: string): Promise<{
        subjectId: string;
        subjectName: string;
        termName: string | null;
        assessments: Array<Record<string, unknown>>;
        summary: {
            quizAverage: number | null;
            testAverage: number | null;
            midAverage: number | null;
            finalAverage: number | null;
            totalScore: number | null;
            gradeLetter: string | null;
            gradePoint: number | null;
        };
    }[]>;
}
