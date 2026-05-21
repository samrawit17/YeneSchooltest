import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { AddAssessmentSubjectsDto, CreateAssessmentDto, ListAssessmentsFilterDto, SaveAssessmentScoresDto, UpdateAssessmentWeightsDto } from './dto/assessments.dto';
export declare class AssessmentsService {
    private readonly prisma;
    private readonly notificationService;
    constructor(prisma: PrismaService, notificationService: NotificationService);
    private getWeightMap;
    private getEffectiveMaxScore;
    private buildTypeScoreMap;
    private average;
    private isAssessmentDue;
    private shouldAddAssessmentToCalendar;
    private formatAssessmentTypeLabel;
    private notifyTeachersForAssessmentStart;
    notifyDueAssessmentStarts(): Promise<void>;
    private computeWeightedAssessmentSummary;
    private getGradeFromScore;
    private resolveChildStudentForParent;
    private validateAssessmentContext;
    private resolveTeacherAssignment;
    private ensureAssessmentWriteAccess;
    private ensureTeacherCanScore;
    private syncSubjectGradeForStudent;
    private createAssessmentSubjects;
    private attachFallbackTeachersToAssessments;
    createAssessment(schoolId: string, userId: string, role: string, dto: CreateAssessmentDto): Promise<{
        academicYear: {
            id: string;
            name: string;
        };
        term: {
            id: string;
            name: string;
            order: number;
        } | null;
        subjects: ({
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
            _count: {
                scores: number;
            };
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string | null;
            subjectId: string;
            teacherId: string | null;
            maxScore: number;
            assessmentId: string;
            gradeLevelId: string | null;
            passMark: number | null;
        })[];
        creator: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssessmentStatus;
        title: string;
        type: string;
        termId: string | null;
        createdBy: string;
        calendarEventId: string | null;
        lockAt: Date | null;
    }>;
    addSubjects(schoolId: string, userId: string, role: string, assessmentId: string, dto: AddAssessmentSubjectsDto): Promise<{
        academicYear: {
            id: string;
            name: string;
        };
        term: {
            id: string;
            name: string;
            order: number;
        } | null;
        subjects: ({
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
            _count: {
                scores: number;
            };
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string | null;
            subjectId: string;
            teacherId: string | null;
            maxScore: number;
            assessmentId: string;
            gradeLevelId: string | null;
            passMark: number | null;
        })[];
        creator: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssessmentStatus;
        title: string;
        type: string;
        termId: string | null;
        createdBy: string;
        calendarEventId: string | null;
        lockAt: Date | null;
    }>;
    getAssessmentById(schoolId: string, id: string): Promise<{
        academicYear: {
            id: string;
            name: string;
        };
        term: {
            id: string;
            name: string;
            order: number;
        } | null;
        subjects: ({
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
            _count: {
                scores: number;
            };
            teacher: {
                id: string;
                name: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            classId: string;
            sectionId: string | null;
            subjectId: string;
            teacherId: string | null;
            maxScore: number;
            assessmentId: string;
            gradeLevelId: string | null;
            passMark: number | null;
        })[];
        creator: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        schoolId: string;
        createdAt: Date;
        updatedAt: Date;
        academicYearId: string;
        startDate: Date;
        endDate: Date;
        status: import("@prisma/client").$Enums.AssessmentStatus;
        title: string;
        type: string;
        termId: string | null;
        createdBy: string;
        calendarEventId: string | null;
        lockAt: Date | null;
    }>;
    listAssessments(schoolId: string, query: ListAssessmentsFilterDto): Promise<any[]>;
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
            title: string;
            type: string;
            termId: string | null;
            createdBy: string;
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
            title: string;
            type: string;
            termId: string | null;
            createdBy: string;
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
        title: string;
        type: string;
        termId: string | null;
        createdBy: string;
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
            title: string;
            type: string;
            termId: string | null;
            createdBy: string;
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
        maxScore: number;
        assessmentId: string;
        gradeLevelId: string | null;
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
            title: string;
            type: string;
            termId: string | null;
            createdBy: string;
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
        maxScore: number;
        assessmentId: string;
        gradeLevelId: string | null;
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
